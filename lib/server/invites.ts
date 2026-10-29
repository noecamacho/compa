import "server-only";
import { and, count, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb, type Executor } from "../../db/client";
import { bonusPoints, eventAttendees, invites, users, type EventRow, type UserRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { GOLDEN_CAP_INVITES, INVITE_POINTS, referralPointsFor, unlocksGoldenCap } from "../points";
import { isJoinable } from "../connection-status";
import { cardsFor, findCurrentEvent } from "./people";
import { requestOrigin } from "./site";

const eventOf = (event: EventRow) => ({ code: event.accessCode, name: event.name });

// Every person's referral code is their handle. A link made before referral codes (#73 and earlier) keeps working:
// its code still names its inviter.
async function referrerOf(code: string, db: Executor): Promise<UserRow | undefined> {
  const [legacy] = await db.select({ user: users }).from(invites).innerJoin(users, eq(users.id, invites.inviterId)).where(eq(invites.code, code)).limit(1);
  if (legacy) return legacy.user;
  const [owner] = await db.select().from(users).where(eq(users.handle, code)).limit(1);
  return owner;
}

export async function myInvites({ user }: InputOf<typeof R.myInvites>): ResultOf<typeof R.myInvites> {
  const db = getDb();
  // The code works everywhere; the event only decides whether a friend joining now pays +100.
  const current = await findCurrentEvent(user.id, new Date(), db);
  const claimed = await db.select().from(invites).where(and(eq(invites.inviterId, user.id), isNotNull(invites.inviteeId)));
  const inviteeIds = claimed.flatMap((row) => (row.inviteeId ? [row.inviteeId] : []));
  const people = inviteeIds.length ? await db.select().from(users).where(inArray(users.id, inviteeIds)) : [];
  const cards = await cardsFor(user.id, people, db);
  const invitees = claimed.flatMap((row) => {
    const card = row.inviteeId ? cards.get(row.inviteeId) : undefined;
    if (!card) return [];
    return [{ person: card, firstConnectionAt: row.firstConnectionAt?.toISOString() ?? null, points: row.inviterPoints }];
  });
  const link = { code: user.handle, url: `${await requestOrigin()}/i/${user.handle}`, event: current ? eventOf(current) : null };
  return { body: { link, invitees, target: GOLDEN_CAP_INVITES, goldenCap: user.goldenCapAt !== null } };
}

// Where a referral link lands the friend: the door of the event their inviter is at, so they join it too, or null to
// sign up without an event. Undefined for a code that is nobody's. Public: the link page runs before sign-in.
export async function referralDoor(code: string): Promise<string | null | undefined> {
  const db = getDb();
  const inviter = await referrerOf(code, db);
  if (!inviter) return undefined;
  const event = await findCurrentEvent(inviter.id, new Date(), db);
  return event && isJoinable(event, new Date()) ? event.accessCode : null;
}

// A referral is for someone new to COMPA: a person who has already been at an event joined without it.
async function hasCheckedIn(user: UserRow, db: Executor): Promise<boolean> {
  const [row] = await db.select({ id: eventAttendees.eventId }).from(eventAttendees).where(eq(eventAttendees.userId, user.id)).limit(1);
  return row !== undefined;
}

// The golden cap, once three friends joined through the code. Shown through `accessories`, never baked into the
// stored monito, so the person can hide it.
async function unlockGoldenCap(inviter: UserRow, db: Executor): Promise<void> {
  const [row] = await db.select({ n: count() }).from(invites).where(and(eq(invites.inviterId, inviter.id), isNotNull(invites.inviteeId)));
  if (!unlocksGoldenCap(inviter.goldenCapAt, row?.n ?? 0)) return;
  await db.update(users).set({ goldenCapAt: new Date() }).where(and(eq(users.id, inviter.id), isNull(users.goldenCapAt)));
}

// One row per friend (unique invitee), so a second claim or a concurrent one pays nothing. The +100 goes on the event
// the inviter is checked in to right now, in the same transaction as the row.
async function recordReferral(inviter: UserRow, invitee: UserRow, event: EventRow | undefined, db: Executor): Promise<void> {
  const points = referralPointsFor(event);
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(invites)
      .values({ inviterId: inviter.id, inviteeId: invitee.id, eventId: event?.id ?? null, inviterPoints: points })
      .onConflictDoNothing()
      .returning({ id: invites.id });
    if (!row || !event) return;
    await tx.insert(bonusPoints).values({ userId: inviter.id, eventId: event.id, reason: "invite_inviter", refId: row.id, points }).onConflictDoNothing();
  });
}

export async function claimInvite({ user, params }: InputOf<typeof R.claimInvite>): ResultOf<typeof R.claimInvite> {
  const db = getDb();
  const inviter = await referrerOf(params.code, db);
  if (!inviter || inviter.id === user.id) return fail(E.notFound);
  const [already] = await db.select({ inviterId: invites.inviterId }).from(invites).where(eq(invites.inviteeId, user.id)).limit(1);
  if (!already && (await hasCheckedIn(user, db))) return fail(E.referralNotNew);
  const event = await findCurrentEvent(inviter.id, new Date(), db);
  if (!already) await recordReferral(inviter, user, event, db);
  await unlockGoldenCap(inviter, db);
  const card = (await cardsFor(user.id, [inviter], db)).get(inviter.id) ?? fail(E.internal);
  return { body: { code: params.code, inviter: card, event: event ? eventOf(event) : null } };
}

// A friend's first accepted connection, anywhere: +50 to them, once. A link from before referral codes kept its old
// promise, so its inviter's +100 is still paid here when the connection is at that link's event.
// Returns the inviter's id the one time it pays, so the caller can tell them.
export async function awardInvite(invitee: UserRow, event: EventRow, connectionId: string, db: Executor = getDb()): Promise<string | null> {
  const [invite] = await db.select().from(invites).where(eq(invites.inviteeId, invitee.id)).limit(1);
  if (!invite || invite.firstConnectionAt) return null;
  const legacyPayout = invite.code !== null && invite.inviterPoints === 0 && invite.eventId === event.id ? INVITE_POINTS.inviter : 0;
  // One transaction, so a failure between marking the invite and paying it cannot lose the points (conference-scale finding 13).
  const marked = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(invites)
      .set({ firstConnectionAt: new Date(), inviterPoints: invite.inviterPoints + legacyPayout })
      .where(and(eq(invites.id, invite.id), isNull(invites.firstConnectionAt)))
      .returning({ inviterId: invites.inviterId });
    if (!row) return null;
    const inviter = { userId: row.inviterId, eventId: event.id, reason: "invite_inviter" as const, refId: connectionId, points: legacyPayout };
    const friend = { userId: invitee.id, eventId: event.id, reason: "invite_invitee" as const, refId: connectionId, points: INVITE_POINTS.invitee };
    await tx
      .insert(bonusPoints)
      .values(legacyPayout ? [inviter, friend] : [friend])
      .onConflictDoNothing();
    return row;
  });
  return marked?.inviterId ?? null;
}
