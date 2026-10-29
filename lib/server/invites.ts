import "server-only";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb, type Executor } from "../../db/client";
import { bonusPoints, invites, users, type EventRow, type InviteRow, type UserRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { GOLDEN_CAP_INVITES, INVITE_POINTS } from "../points";
import { GOLDEN_CAP, withDefaults } from "../monito/look";
import { cardsFor, isUniqueViolation } from "./people";

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// One open invite per inviter, created on first use; its code is the inviter's handle.
async function ownInvite(user: UserRow, db: Executor): Promise<InviteRow> {
  const [existing] = await db.select().from(invites).where(eq(invites.inviterId, user.id)).orderBy(desc(invites.createdAt)).limit(1);
  if (existing && existing.inviteeId === null) return existing;
  const [created] = await db.insert(invites).values({ inviterId: user.id, code: codeFor(user, existing) }).returning();
  return created ?? fail(E.internal);
}

// The first invite uses the handle; later ones add a counter so every code stays unique.
const codeFor = (user: UserRow, previous: InviteRow | undefined) => (previous ? `${user.handle}-${Date.now().toString(36).slice(-4)}` : user.handle);

export async function myInvites({ user }: InputOf<typeof R.myInvites>): ResultOf<typeof R.myInvites> {
  const db = getDb();
  const open = await ownInvite(user, db);
  const claimed = await db.select().from(invites).where(eq(invites.inviterId, user.id));
  const inviteeIds = claimed.flatMap((row) => (row.inviteeId ? [row.inviteeId] : []));
  const people = inviteeIds.length ? await db.select().from(users).where(inArray(users.id, inviteeIds)) : [];
  const cards = await cardsFor(user.id, people, db);
  const invitees = claimed.flatMap((row) => {
    const card = row.inviteeId ? cards.get(row.inviteeId) : undefined;
    if (!card) return [];
    return [{ person: card, firstConnectionAt: row.firstConnectionAt?.toISOString() ?? null, points: row.firstConnectionAt ? INVITE_POINTS.inviter : 0 }];
  });
  return { body: { code: open.code, url: `${siteUrl()}/i/${open.code}`, invitees, target: GOLDEN_CAP_INVITES, goldenCap: user.goldenCapAt !== null } };
}

export async function claimInvite({ user, params }: InputOf<typeof R.claimInvite>): ResultOf<typeof R.claimInvite> {
  const db = getDb();
  const [invite] = await db.select().from(invites).where(eq(invites.code, params.code)).limit(1);
  if (!invite || invite.inviterId === user.id) return fail(E.notFound);
  const [inviter] = await db.select().from(users).where(eq(users.id, invite.inviterId)).limit(1);
  if (!inviter) return fail(E.notFound);
  try {
    // An invitee is linked once; a second claim (any code) is ignored by the unique invitee constraint.
    await db.update(invites).set({ inviteeId: user.id }).where(eq(invites.id, invite.id));
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
  const card = (await cardsFor(user.id, [inviter], db)).get(inviter.id) ?? fail(E.internal);
  return { body: { code: invite.code, inviter: card } };
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

// When an invited person's first connection is accepted: +100 to the inviter, +50 to the invitee, once.
export async function awardInvite(invitee: UserRow, event: EventRow, connectionId: string, db: Executor = getDb()): Promise<void> {
  const [invite] = await db.select().from(invites).where(eq(invites.inviteeId, invitee.id)).limit(1);
  if (!invite || invite.firstConnectionAt) return;
  const [marked] = await db
    .update(invites)
    .set({ firstConnectionAt: new Date() })
    .where(eq(invites.id, invite.id))
    .returning({ inviterId: invites.inviterId });
  if (!marked) return;
  await db
    .insert(bonusPoints)
    .values([
      { userId: marked.inviterId, eventId: event.id, reason: "invite_inviter", refId: connectionId, points: INVITE_POINTS.inviter },
      { userId: invitee.id, eventId: event.id, reason: "invite_invitee", refId: connectionId, points: INVITE_POINTS.invitee },
    ])
    .onConflictDoNothing();
  const [inviter] = await db.select().from(users).where(eq(users.id, marked.inviterId)).limit(1);
  if (inviter) await unlockGoldenCap(inviter, db);
}
