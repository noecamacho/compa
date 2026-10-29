import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { connections, eventAttendees, eventScores, users, type EventRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { isRunning } from "../connection-status";
import { requireEvent } from "./events";
import { cardFor } from "./people";

// A6: the big screen is public; a 1 s shared cache absorbs many screens polling the same event.
const LIVE_CACHE = { "Cache-Control": "public, s-maxage=1, stale-while-revalidate=1" };

const points = sql<number>`coalesce(${eventScores.points}, 0)`.mapWith(Number);
const connectionCount = sql<number>`coalesce(${eventScores.connections}, 0)`.mapWith(Number);

// Checked-in attendees in leaderboard order: points, connections, earliest check-in (data model §4.4).
async function rankedAttendees(event: EventRow) {
  return getDb()
    .select({ user: users, points, connections: connectionCount })
    .from(eventAttendees)
    .innerJoin(users, eq(users.id, eventAttendees.userId))
    .leftJoin(eventScores, and(eq(eventScores.eventId, eventAttendees.eventId), eq(eventScores.userId, eventAttendees.userId)))
    .where(eq(eventAttendees.eventId, event.id))
    .orderBy(desc(points), desc(connectionCount), asc(eventAttendees.checkedInAt));
}

async function acceptedConnections(event: EventRow) {
  return getDb()
    .select()
    .from(connections)
    .where(and(eq(connections.eventId, event.id), eq(connections.status, "accepted")))
    .orderBy(asc(connections.respondedAt));
}

export async function liveSnapshot({ params }: InputOf<typeof R.liveSnapshot>): ResultOf<typeof R.liveSnapshot> {
  const event = await requireEvent(params.slug);
  const now = new Date();
  const [attendees, accepted] = await Promise.all([rankedAttendees(event), acceptedConnections(event)]);
  const people = attendees.map(({ user, points }) => ({ id: user.id, name: user.name, photoUrl: user.photoUrl, points }));
  const links = accepted.map((row) => ({
    id: row.id,
    a: row.requesterId,
    b: row.addresseeId,
    kind: row.kind ?? "new",
    at: (row.respondedAt ?? row.createdAt).toISOString(),
  }));
  const reconnections = links.filter((link) => link.kind === "reconnection").length;
  const counters = { checkedIn: people.length, connections: links.length, newCount: links.length - reconnections, reconnections };
  const body = {
    event: { slug: event.slug, name: event.name, isRunning: isRunning(event, now) },
    people,
    connections: links,
    counters,
    generatedAt: now.toISOString(),
  };
  return { body, headers: LIVE_CACHE };
}

export async function livePerson({ params }: InputOf<typeof R.livePerson>): ResultOf<typeof R.livePerson> {
  const event = await requireEvent(params.slug);
  const ranked = await rankedAttendees(event);
  const index = ranked.findIndex((entry) => entry.user.id === params.userId);
  const entry = ranked[index] ?? fail(E.attendeeNotFound);
  const card = await cardFor(null, entry.user);
  return { body: { card, points: entry.points, connections: entry.connections, rank: index + 1 }, headers: LIVE_CACHE };
}

export async function leaderboard({ params, query }: InputOf<typeof R.leaderboard>): ResultOf<typeof R.leaderboard> {
  const event = await requireEvent(params.slug);
  const ranked = await rankedAttendees(event);
  const rows = ranked.slice(0, query.limit).map(({ user, points, connections }, index) => ({
    rank: index + 1,
    userId: user.id,
    name: user.name,
    photoUrl: user.photoUrl,
    points,
    connections,
  }));
  return { body: { rows }, headers: LIVE_CACHE };
}
