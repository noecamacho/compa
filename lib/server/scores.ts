import "server-only";
import { and, asc, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { getDb, type Executor } from "../../db/client";
import { bonusPoints, connections, eventAttendees, eventScores, events, interactions, lifetimeScores, users, type EventRow } from "../../db/schema";
import { accessoriesOf, type Accessory } from "../monito/accessories";
import { realPeopleOnly } from "./events";

export type Standing = { rank: number | null; points: number };
export type Scores = { event: Standing; lifetime: Standing };

const points = sql<number>`coalesce(${eventScores.points}, 0)`.mapWith(Number);
const connectionCount = sql<number>`coalesce(${eventScores.connections}, 0)`.mapWith(Number);

export type Ranked = { userId: string; handle: string; name: string; photoUrl: string | null; accessories?: Accessory[]; points: number; connections: number };

// The picture columns every board reads; the accessories travel with the photo to the big screen and the ranking.
const pictured = { userId: users.id, handle: users.handle, name: users.name, photoUrl: users.photoUrl, goldenCapAt: users.goldenCapAt, showAccessories: users.showAccessories };

const toRanked = ({ goldenCapAt, showAccessories, ...row }: Omit<Ranked, "accessories"> & { goldenCapAt: Date | null; showAccessories: boolean }): Ranked => {
  const accessories = accessoriesOf({ goldenCapAt, showAccessories });
  return accessories.length ? { ...row, accessories } : row;
};

// Rankings read every score of an event (or of everyone), so many phones asking at once share one result per
// instance for a few seconds instead of each scanning all connections (conference-scale finding 2).
const RANKING_TTL_MS = 3000;
const rankings = new Map<string, { at: number; value: Promise<Ranked[]> }>();

export function sharedRanking(key: string, load: () => Promise<Ranked[]>, now = Date.now()): Promise<Ranked[]> {
  const hit = rankings.get(key);
  if (hit && now - hit.at < RANKING_TTL_MS) return hit.value;
  const value = load();
  const entry = { at: now, value };
  rankings.set(key, entry);
  // A failed load is not shared: the next caller retries.
  value.catch(() => rankings.get(key) === entry && rankings.delete(key));
  return value;
}

// Checked-in attendees in leaderboard order: points, connections, earliest check-in (data model §4.4).
export function rankedAtEvent(event: EventRow): Promise<Ranked[]> {
  return sharedRanking(`event:${event.id}`, () => loadRankedAtEvent(event));
}

async function loadRankedAtEvent(event: EventRow): Promise<Ranked[]> {
  const rows = await getDb()
    .select({ ...pictured, points, connections: connectionCount })
    .from(eventAttendees)
    .innerJoin(users, eq(users.id, eventAttendees.userId))
    .leftJoin(eventScores, and(eq(eventScores.eventId, eventAttendees.eventId), eq(eventScores.userId, eventAttendees.userId)))
    .where(and(eq(eventAttendees.eventId, event.id), realPeopleOnly(event)))
    .orderBy(desc(points), desc(connectionCount), asc(eventAttendees.checkedInAt));
  return rows.map(toRanked);
}

const lifetimePoints = sql<number>`coalesce(${lifetimeScores.points}, 0)`.mapWith(Number);
const lifetimeConnections = sql<number>`coalesce(${lifetimeScores.connections}, 0)`.mapWith(Number);

// Everyone with points, all events, best first. Test users count only on boards seen from a test event or by a test user (M20).
export function rankedLifetime({ includeTest }: { includeTest: boolean }): Promise<Ranked[]> {
  return sharedRanking(`lifetime:${includeTest}`, () => loadRankedLifetime(includeTest));
}

// async: a drizzle query re-runs on every `then`, a shared result must be a settled Promise.
async function loadRankedLifetime(includeTest: boolean): Promise<Ranked[]> {
  const rows = await getDb()
    .select({ ...pictured, points: lifetimePoints, connections: lifetimeConnections })
    .from(lifetimeScores)
    .innerJoin(users, eq(users.id, lifetimeScores.userId))
    .where(includeTest ? undefined : eq(users.isTest, false))
    .orderBy(desc(lifetimePoints), desc(lifetimeConnections), asc(users.createdAt));
  return rows.map(toRanked);
}

// A checked-in person with 0 points has no rank (standingOf), so the board and its podium list only people with points.
export const onBoard = (ranked: Ranked[]): Ranked[] => ranked.filter((entry) => entry.points > 0);

// People without points have no rank (they are not on the board yet).
export function standingOf(ranked: Ranked[], userId: string): Standing {
  const index = ranked.findIndex((row) => row.userId === userId);
  const row = ranked[index];
  if (!row || row.points === 0) return { rank: null, points: row?.points ?? 0 };
  return { rank: index + 1, points: row.points };
}

export async function scoresFor(person: { id: string; isTest: boolean }, event: EventRow | undefined): Promise<Scores> {
  const userId = person.id;
  const [atEvent, lifetime] = await Promise.all([event ? rankedAtEvent(event) : Promise.resolve([]), rankedLifetime({ includeTest: person.isTest })]);
  return { event: standingOf(atEvent, userId), lifetime: standingOf(lifetime, userId) };
}

const sumOf = (column: typeof connections.points | typeof interactions.points | typeof bonusPoints.points) =>
  sql`coalesce(sum(${column}), 0)`;

// One person's lifetime points, the same sum as the lifetime_scores view but read through that person's rows only
// (indexes on requester, addressee, author and bonus owner) instead of aggregating every connection.
export async function lifetimePointsOf(userId: string, db: Executor = getDb()): Promise<number> {
  const accepted = db
    .select({ n: sumOf(connections.points) })
    .from(connections)
    .where(and(eq(connections.status, "accepted"), or(eq(connections.requesterId, userId), eq(connections.addresseeId, userId))));
  const notes = db
    .select({ n: sumOf(interactions.points) })
    .from(interactions)
    .where(and(eq(interactions.authorId, userId), isNotNull(interactions.approvedAt)));
  const bonus = db.select({ n: sumOf(bonusPoints.points) }).from(bonusPoints).where(eq(bonusPoints.userId, userId));
  const [row] = await db
    .select({ points: sql<number>`((${accepted}) + (${notes}) + (${bonus}))::int`.mapWith(Number) })
    .from(users)
    .where(eq(users.id, userId));
  return row?.points ?? 0;
}

export type Stats = { newConnections: number; reconnections: number; events: number };

// Accepted connections by kind, and events checked in to.
export async function statsFor(userId: string, db: Executor = getDb()): Promise<Stats> {
  const mine = sql`(${connections.requesterId} = ${userId} or ${connections.addresseeId} = ${userId})`;
  const [kinds] = await db
    .select({
      newConnections: sql<number>`count(*) filter (where ${connections.kind} = 'new')`.mapWith(Number),
      reconnections: sql<number>`count(*) filter (where ${connections.kind} = 'reconnection')`.mapWith(Number),
    })
    .from(connections)
    .where(and(eq(connections.status, "accepted"), mine));
  const [attended] = await db
    .select({ events: sql<number>`count(*)`.mapWith(Number) })
    .from(eventAttendees)
    .innerJoin(events, eq(events.id, eventAttendees.eventId))
    .where(eq(eventAttendees.userId, userId));
  return { newConnections: kinds?.newConnections ?? 0, reconnections: kinds?.reconnections ?? 0, events: attended?.events ?? 0 };
}
