import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { connections, type EventRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { isRunning } from "../connection-status";
import { rankingTips } from "../copy/es";
import { currentUserOrNull } from "./auth";
import { connectionsOfRealPeople, LIVE_CACHE, requireEventByCode } from "./events";
import { cardFor, usersByIds } from "./people";
import { rankedAtEvent, rankedLifetime, type Ranked } from "./scores";

// The snapshot carries the most recent links only, so its size stays flat as the room connects (about 1.15 MB at
// 1,000 people and 6k links before the cap; Vercel refuses bodies over 4.5 MB). Counters still count every link.
const LIVE_LINKS = 1000;

const acceptedAt = (event: EventRow) =>
  and(eq(connections.eventId, event.id), eq(connections.status, "accepted"), connectionsOfRealPeople(event));

async function recentLinks(event: EventRow) {
  const rows = await getDb()
    .select({ id: connections.id, a: connections.requesterId, b: connections.addresseeId, kind: connections.kind, respondedAt: connections.respondedAt, createdAt: connections.createdAt })
    .from(connections)
    .where(acceptedAt(event))
    .orderBy(sql`${connections.respondedAt} desc nulls last`)
    .limit(LIVE_LINKS);
  return rows.reverse();
}

async function linkCounters(event: EventRow) {
  const [row] = await getDb()
    .select({ total: count(), reconnections: sql<number>`count(*) filter (where ${connections.kind} = 'reconnection')`.mapWith(Number) })
    .from(connections)
    .where(acceptedAt(event));
  return { total: row?.total ?? 0, reconnections: row?.reconnections ?? 0 };
}

export async function liveSnapshot({ params }: InputOf<typeof R.liveSnapshot>): ResultOf<typeof R.liveSnapshot> {
  const event = await requireEventByCode(params.code);
  const now = new Date();
  const [ranked, recent, totals] = await Promise.all([rankedAtEvent(event), recentLinks(event), linkCounters(event)]);
  const people = ranked.map(({ userId, name, photoUrl, points, connections }) => ({ id: userId, name, photoUrl, points, connections }));
  const shown = new Set(people.map((person) => person.id));
  // An edge to someone left off the screen (a test user at a real event, M20, or a removed attendee) is left off too.
  const links = recent
    .filter((row) => shown.has(row.a) && shown.has(row.b))
    .map(({ id, a, b, kind, respondedAt, createdAt }) => ({ id, a, b, kind: kind ?? "new", at: (respondedAt ?? createdAt).toISOString() }));
  const counters = {
    checkedIn: people.length,
    connections: totals.total,
    newCount: totals.total - totals.reconnections,
    reconnections: totals.reconnections,
  };
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
  const ranked = await rankedAtEvent(event);
  const index = ranked.findIndex((entry) => entry.userId === params.userId);
  const entry = ranked[index] ?? fail(E.attendeeNotFound);
  const [person] = await usersByIds([entry.userId]);
  const card = await cardFor(null, person ?? fail(E.attendeeNotFound));
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
