import "server-only";
import { and, desc, eq, gt, inArray, lte, or } from "drizzle-orm";
import { getDb, type Executor } from "../../db/client";
import { connections, eventAttendees, events, interests, userInterests, users, type EventRow, type UserRow } from "../../db/schema";
import type { CardT } from "../api/schemas";
import { relationOf, toCard } from "../visibility";

export async function findUserByHandle(handle: string): Promise<UserRow | undefined> {
  const [row] = await getDb().select().from(users).where(eq(users.handle, handle)).limit(1);
  return row;
}

export async function interestNamesFor(userIds: string[], db: Executor = getDb()): Promise<Map<string, string[]>> {
  const names = new Map<string, string[]>();
  if (userIds.length === 0) return names;
  const rows = await db
    .select({ userId: userInterests.userId, name: interests.name })
    .from(userInterests)
    .innerJoin(interests, eq(interests.id, userInterests.interestId))
    .where(inArray(userInterests.userId, userIds))
    .orderBy(interests.name);
  for (const row of rows) names.set(row.userId, [...(names.get(row.userId) ?? []), row.name]);
  return names;
}

// Ids among `otherIds` that have an accepted connection with `viewerId` at any event (visibility, §6).
export async function connectedPeers(viewerId: string, otherIds: string[], db: Executor = getDb()): Promise<Set<string>> {
  if (otherIds.length === 0) return new Set();
  const rows = await db
    .select({ requesterId: connections.requesterId, addresseeId: connections.addresseeId })
    .from(connections)
    .where(
      and(
        eq(connections.status, "accepted"),
        or(
          and(eq(connections.requesterId, viewerId), inArray(connections.addresseeId, otherIds)),
          and(eq(connections.addresseeId, viewerId), inArray(connections.requesterId, otherIds)),
        ),
      ),
    );
  return new Set(rows.map((row) => (row.requesterId === viewerId ? row.addresseeId : row.requesterId)));
}

// Cards for several owners as `viewerId` may see them; `null` is the anonymous big screen.
export async function cardsFor(viewerId: string | null, owners: UserRow[], db: Executor = getDb()): Promise<Map<string, CardT>> {
  const ids = owners.map((owner) => owner.id);
  const [names, connected] = await Promise.all([
    interestNamesFor(ids, db),
    viewerId ? connectedPeers(viewerId, ids, db) : Promise.resolve(new Set<string>()),
  ]);
  const cards = owners.map((owner) => {
    const source = { ...owner, interests: names.get(owner.id) ?? [] };
    return [owner.id, toCard(source, relationOf(viewerId, owner.id, connected.has(owner.id)))] as const;
  });
  return new Map(cards);
}

export async function cardFor(viewerId: string | null, owner: UserRow, db: Executor = getDb()): Promise<CardT> {
  const cards = await cardsFor(viewerId, [owner], db);
  return cards.get(owner.id) as CardT;
}

export async function usersByIds(ids: string[], db: Executor = getDb()): Promise<UserRow[]> {
  if (ids.length === 0) return [];
  return db.select().from(users).where(inArray(users.id, ids));
}

// A2: the most recent live event the person checked in to whose window contains now (draft, ended, archived never count).
export async function findCurrentEvent(userId: string, now: Date, db: Executor = getDb()): Promise<EventRow | undefined> {
  const [row] = await db
    .select({ event: events })
    .from(eventAttendees)
    .innerJoin(events, eq(events.id, eventAttendees.eventId))
    .where(and(eq(eventAttendees.userId, userId), eq(events.status, "live"), lte(events.startsAt, now), gt(events.endsAt, now)))
    .orderBy(desc(eventAttendees.checkedInAt))
    .limit(1);
  return row?.event;
}

const pgCode = (error: unknown): unknown =>
  typeof error === "object" && error !== null && "code" in error ? error.code : undefined;

// Drizzle wraps driver errors in DrizzleQueryError; the Postgres code sits on `cause`.
export const isUniqueViolation = (error: unknown): boolean => {
  const cause = error instanceof Error ? error.cause : undefined;
  return pgCode(error) === "23505" || pgCode(cause) === "23505";
};

export const pairCondition = (a: string, b: string) =>
  or(
    and(eq(connections.requesterId, a), eq(connections.addresseeId, b)),
    and(eq(connections.requesterId, b), eq(connections.addresseeId, a)),
  );
