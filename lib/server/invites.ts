import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb, type Executor } from "../../db/client";
import { bonusPoints, events, invites, users, type EventRow, type InviteRow, type UserRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { GOLDEN_CAP_INVITES, INVITE_POINTS } from "../points";
import { GOLDEN_CAP, withDefaults } from "../monito/look";
import { isJoinable } from "../connection-status";
import { cardsFor, findCurrentEvent, isUniqueViolation } from "./people";
import { requestOrigin } from "./site";


const eventOf = (event: EventRow) => ({ code: event.accessCode, name: event.name });

const openInvite = async (user: UserRow, event: EventRow, db: Executor): Promise<InviteRow | undefined> =>
  (
    await db
      .select()
      .from(invites)
      .where(and(eq(invites.inviterId, user.id), eq(invites.eventId, event.id), isNull(invites.inviteeId)))
      .orderBy(desc(invites.createdAt))
      .limit(1)
  )[0];

const insertInvite = async (user: UserRow, event: EventRow, code: string, db: Executor): Promise<InviteRow | undefined> =>
  (await db.insert(invites).values({ inviterId: user.id, eventId: event.id, code }).onConflictDoNothing().returning())[0];

// The first invite code is the inviter's handle; any later one adds a random suffix so every code stays unique.
const suffixedCode = (user: UserRow) => `${user.handle}-${crypto.randomUUID().slice(0, 6)}`;

// One open invite per inviter and event, created on first use. Two concurrent first loads race on the same code:
// the loser reads the winner's row instead of failing with 23505.
async function ownInvite(user: UserRow, event: EventRow, db: Executor): Promise<InviteRow> {
  const existing = await openInvite(user, event, db);
  if (existing) return existing;
  const created = await insertInvite(user, event, user.handle, db);
  if (created) return created;
  const raced = await openInvite(user, event, db);
  if (raced) return raced;
  // The handle is already the code of an earlier invite (or belongs to someone else): fall back to a suffixed one.
  return (await insertInvite(user, event, suffixedCode(user), db)) ?? fail(E.internal);
}

export async function myInvites({ user }: InputOf<typeof R.myInvites>): ResultOf<typeof R.myInvites> {
  const db = getDb();
  // Outside an event there is nothing to invite to: no link, and no invite row is created.
  const current = await findCurrentEvent(user.id, new Date(), db);
  const open = current ? await ownInvite(user, current, db) : null;
  const claimed = await db.select().from(invites).where(eq(invites.inviterId, user.id));
  const inviteeIds = claimed.flatMap((row) => (row.inviteeId ? [row.inviteeId] : []));
  const people = inviteeIds.length ? await db.select().from(users).where(inArray(users.id, inviteeIds)) : [];
  const cards = await cardsFor(user.id, people, db);
  const invitees = claimed.flatMap((row) => {
    const card = row.inviteeId ? cards.get(row.inviteeId) : undefined;
    if (!card) return [];
    return [{ person: card, firstConnectionAt: row.firstConnectionAt?.toISOString() ?? null, points: row.firstConnectionAt ? INVITE_POINTS.inviter : 0 }];
  });
  const link = current && open ? { code: open.code, url: `${await requestOrigin()}/i/${open.code}`, event: eventOf(current) } : null;
  return { body: { link, invitees, target: GOLDEN_CAP_INVITES, goldenCap: user.goldenCapAt !== null } };
}

// The event an invite lands its friend at, if the invite still has one the friend can walk into. Public: the invite
// page runs before sign-in.
export async function inviteDoorCode(code: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ event: events })
    .from(invites)
    .innerJoin(events, eq(events.id, invites.eventId))
    .where(eq(invites.code, code))
    .limit(1);
  return row && isJoinable(row.event, new Date()) ? row.event.accessCode : null;
}

export async function claimInvite({ user, params }: InputOf<typeof R.claimInvite>): ResultOf<typeof R.claimInvite> {
  const db = getDb();
  const [invite] = await db.select().from(invites).where(eq(invites.code, params.code)).limit(1);
  if (!invite || invite.inviterId === user.id) return fail(E.notFound);
  if (!invite.eventId) return fail(E.inviteNeedsEvent);
  const [event] = await db.select().from(events).where(eq(events.id, invite.eventId)).limit(1);
  if (!event || !isJoinable(event, new Date())) return fail(E.eventNotRunning);
  const [inviter] = await db.select().from(users).where(eq(users.id, invite.inviterId)).limit(1);
  if (!inviter) return fail(E.notFound);
  try {
    // An invitee is linked once (unique invitee) and an invite links one person: a later claim never overwrites the first.
    await db.update(invites).set({ inviteeId: user.id }).where(and(eq(invites.id, invite.id), isNull(invites.inviteeId)));
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
  const card = (await cardsFor(user.id, [inviter], db)).get(inviter.id) ?? fail(E.internal);
  return { body: { code: invite.code, inviter: card, event: eventOf(event) } };
}

// The golden cap goes on the inviter's monito once three invited friends have connected.
async function unlockGoldenCap(inviter: UserRow, db: Executor): Promise<void> {
  if (inviter.goldenCapAt) return;
  const completed = await db
    .select({ id: invites.id })
    .from(invites)
    .where(and(eq(invites.inviterId, inviter.id), isNotNull(invites.firstConnectionAt)));
  if (completed.length < GOLDEN_CAP_INVITES) return;
  const avatar = { ...withDefaults(inviter.avatar ?? {}), ...GOLDEN_CAP };
  await db.update(users).set({ goldenCapAt: new Date(), avatar }).where(eq(users.id, inviter.id));
}

// When an invited person's first connection at the invite's event is accepted: +100 to the inviter, +50 to the invitee, once.
// One transaction, so a failure between marking the invite and paying it cannot lose the points (conference-scale finding 13).
// Returns the inviter's id the one time it pays, so the caller can tell them.
export async function awardInvite(invitee: UserRow, event: EventRow, connectionId: string, db: Executor = getDb()): Promise<string | null> {
  const [invite] = await db.select().from(invites).where(eq(invites.inviteeId, invitee.id)).limit(1);
  // Points belong to the event the invite was made for; a connection anywhere else pays nothing.
  if (!invite || invite.firstConnectionAt || invite.eventId !== event.id) return null;
  const marked = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(invites)
      .set({ firstConnectionAt: new Date() })
      .where(and(eq(invites.id, invite.id), isNull(invites.firstConnectionAt)))
      .returning({ inviterId: invites.inviterId });
    if (!row) return null;
    await tx
      .insert(bonusPoints)
      .values([
        { userId: row.inviterId, eventId: event.id, reason: "invite_inviter", refId: connectionId, points: INVITE_POINTS.inviter },
        { userId: invitee.id, eventId: event.id, reason: "invite_invitee", refId: connectionId, points: INVITE_POINTS.invitee },
      ])
      .onConflictDoNothing();
    return row;
  });
  if (!marked) return null;
  // After the commit, so two invitees connecting at once both count toward the golden cap.
  const [inviter] = await db.select().from(users).where(eq(users.id, marked.inviterId)).limit(1);
  if (inviter) await unlockGoldenCap(inviter, db);
  return marked.inviterId;
}
