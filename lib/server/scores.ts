import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, type Executor } from "../../db/client";
import { connections, eventAttendees, eventScores, events, lifetimeScores, users, type EventRow } from "../../db/schema";
import { realPeopleOnly } from "./events";

export type Standing = { rank: number | null; points: number };
export type Scores = { event: Standing; lifetime: Standing };

const points = sql<number>`coalesce(${eventScores.points}, 0)`.mapWith(Number);
const connectionCount = sql<number>`coalesce(${eventScores.connections}, 0)`.mapWith(Number);

export type Ranked = { userId: string; name: string; photoUrl: string | null; points: number; connections: number };

// Checked-in attendees in leaderboard order: points, connections, earliest check-in (data model §4.4).
export async function rankedAtEvent(event: EventRow, db: Executor = getDb()): Promise<Ranked[]> {
  const rows = await db
    .select({ userId: users.id, name: users.name, photoUrl: users.photoUrl, points, connections: connectionCount })
    .from(eventAttendees)
    .innerJoin(users, eq(users.id, eventAttendees.userId))
    .leftJoin(eventScores, and(eq(eventScores.eventId, eventAttendees.eventId), eq(eventScores.userId, eventAttendees.userId)))
    .where(and(eq(eventAttendees.eventId, event.id), realPeopleOnly(event)))
    .orderBy(desc(points), desc(connectionCount), asc(eventAttendees.checkedInAt));
  return rows;
}

const lifetimePoints = sql<number>`coalesce(${lifetimeScores.points}, 0)`.mapWith(Number);
const lifetimeConnections = sql<number>`coalesce(${lifetimeScores.connections}, 0)`.mapWith(Number);

// Everyone with points, all events, best first. Test users count only on boards seen from a test event or by a test user (M20).
export async function rankedLifetime({ includeTest }: { includeTest: boolean }, db: Executor = getDb()): Promise<Ranked[]> {
  return db
    .select({ userId: users.id, name: users.name, photoUrl: users.photoUrl, points: lifetimePoints, connections: lifetimeConnections })
    .from(lifetimeScores)
    .innerJoin(users, eq(users.id, lifetimeScores.userId))
    .where(includeTest ? undefined : eq(users.isTest, false))
    .orderBy(desc(lifetimePoints), desc(lifetimeConnections), asc(users.createdAt));
}

// People without points have no rank (they are not on the board yet).
export function standingOf(ranked: Ranked[], userId: string): Standing {
  const index = ranked.findIndex((row) => row.userId === userId);
  const row = ranked[index];
  if (!row || row.points === 0) return { rank: null, points: row?.points ?? 0 };
  return { rank: index + 1, points: row.points };
}

export async function scoresFor(person: { id: string; isTest: boolean }, event: EventRow | undefined, db: Executor = getDb()): Promise<Scores> {
  const userId = person.id;
  const [atEvent, lifetime] = await Promise.all([event ? rankedAtEvent(event, db) : Promise.resolve([]), rankedLifetime({ includeTest: person.isTest }, db)]);
  return { event: standingOf(atEvent, userId), lifetime: standingOf(lifetime, userId) };
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
