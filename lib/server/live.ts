import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { connections, eventAttendees, eventScores, users, type EventRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { isRunning } from "../connection-status";
import { rankingTips } from "../copy/es";
import { currentUserOrNull } from "./auth";
import { realPeopleOnly, requireEventByCode } from "./events";
import { cardFor } from "./people";
import { rankedAtEvent, rankedLifetime, type Ranked } from "./scores";

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
    .where(and(eq(eventAttendees.eventId, event.id), realPeopleOnly(event)))
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
  const event = await requireEventByCode(params.code);
  const now = new Date();
  const [attendees, accepted] = await Promise.all([rankedAttendees(event), acceptedConnections(event)]);
  const people = attendees.map(({ user, points }) => ({ id: user.id, name: user.name, photoUrl: user.photoUrl, points }));
  const shown = new Set(people.map((person) => person.id));
  // An edge to someone left off the screen (a test user at a real event, M20) is left off too.
  const visible = accepted.filter((row) => shown.has(row.requesterId) && shown.has(row.addresseeId));
  const links = visible.map((row) => ({
    id: row.id,
    a: row.requesterId,
    b: row.addresseeId,
    kind: row.kind ?? "new",
    at: (row.respondedAt ?? row.createdAt).toISOString(),
  }));
  const reconnections = links.filter((link) => link.kind === "reconnection").length;
  const counters = { checkedIn: people.length, connections: links.length, newCount: links.length - reconnections, reconnections };
  const body = {
    event: { code: event.accessCode, name: event.name, isRunning: isRunning(event, now) },
    people,
    connections: links,
    counters,
    generatedAt: now.toISOString(),
  };
  return { body, headers: LIVE_CACHE };
}

export async function livePerson({ params }: InputOf<typeof R.livePerson>): ResultOf<typeof R.livePerson> {
  const event = await requireEventByCode(params.code);
  const ranked = await rankedAttendees(event);
  const index = ranked.findIndex((entry) => entry.user.id === params.userId);
  const entry = ranked[index] ?? fail(E.attendeeNotFound);
  const card = await cardFor(null, entry.user);
  return { body: { card, points: entry.points, connections: entry.connections, rank: index + 1 }, headers: LIVE_CACHE };
}

const toRow = (entry: Ranked, index: number) => ({ rank: index + 1, ...entry });

// My row, the person just above me and the gap to pass them (V2Ranking). Not cached: it depends on the viewer.
async function myStanding(ranked: Ranked[]) {
  const viewer = await currentUserOrNull();
  if (!viewer) return undefined;
  const index = ranked.findIndex((entry) => entry.userId === viewer.id);
  const mine = ranked[index];
  if (!mine || mine.points === 0) return { rank: null, points: mine?.points ?? 0, above: null, gap: 0, tip: rankingTips.first };
  const aboveEntry = index > 0 ? ranked[index - 1] : undefined;
  const above = aboveEntry ? toRow(aboveEntry, index - 1) : null;
  const gap = above ? above.points - mine.points + 1 : 0;
  return { rank: index + 1, points: mine.points, above, gap, tip: above ? rankingTips.gap(gap) : null };
}

export async function leaderboard({ params, query }: InputOf<typeof R.leaderboard>): ResultOf<typeof R.leaderboard> {
  const event = await requireEventByCode(params.code);
  const ranked = query.scope === "lifetime" ? await rankedLifetime({ includeTest: event.isTest }) : await rankedAtEvent(event);
  const rows = ranked.slice(0, query.limit).map(toRow);
  const me = await myStanding(ranked);
  return { body: me ? { rows, me } : { rows }, headers: me ? undefined : LIVE_CACHE };
}
