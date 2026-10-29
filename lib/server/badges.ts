import "server-only";
import { and, asc, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { getDb, type Executor } from "../../db/client";
import { connections, eventAttendees, events, interactions, userBadges, users, type EventRow, type UserRow } from "../../db/schema";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { BADGE_IDS, BADGE_LIST, type BadgeId } from "../badges/catalog";
import { earnedBadges, progressFor, type BadgeFacts } from "../badges/rules";
import { copyFor } from "../copy";
import { requestLocale } from "./locale";
import { findCurrentEvent } from "./people";

const FOUNDERS_FEST_2026 = "founders-fest";
const minutes = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 60_000);

type AcceptedRow = { requesterId: string; addresseeId: string; kind: "new" | "reconnection" | null; topics: string[]; respondedAt: Date | null; eventId: string; eventSlug: string; startsAt: Date; endsAt: Date };

async function acceptedFor(userId: string, db: Executor): Promise<AcceptedRow[]> {
  return db
    .select({
      requesterId: connections.requesterId,
      addresseeId: connections.addresseeId,
      kind: connections.kind,
      topics: connections.topics,
      respondedAt: connections.respondedAt,
      eventId: connections.eventId,
      eventSlug: events.slug,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
    })
    .from(connections)
    .innerJoin(events, eq(events.id, connections.eventId))
    .where(and(eq(connections.status, "accepted"), or(eq(connections.requesterId, userId), eq(connections.addresseeId, userId))))
    .orderBy(asc(connections.respondedAt));
}

const otherOf = (row: AcceptedRow, userId: string) => (row.requesterId === userId ? row.addresseeId : row.requesterId);

function perPerson(rows: AcceptedRow[], userId: string) {
  const reconnections = new Map<string, number>();
  const eventsTogether = new Map<string, Set<string>>();
  for (const row of rows) {
    const other = otherOf(row, userId);
    if (row.kind === "reconnection") reconnections.set(other, (reconnections.get(other) ?? 0) + 1);
    eventsTogether.set(other, new Set([...(eventsTogether.get(other) ?? []), row.eventId]));
  }
  return {
    maxReconnectionsWithOne: Math.max(0, ...reconnections.values()),
    maxEventsWithOne: Math.max(0, ...[...eventsTogether.values()].map((set) => set.size)),
  };
}

function tonight(rows: AcceptedRow[], event: EventRow | undefined) {
  if (!event) return { connectionsTonight: 0, firstConnectionMinute: null, minutesBeforeEnd: null };
  const here = rows.filter((row) => row.eventId === event.id && row.respondedAt);
  const first = here[0]?.respondedAt ?? null;
  const last = here.at(-1)?.respondedAt ?? null;
  return {
    connectionsTonight: here.length,
    firstConnectionMinute: first ? minutes(first, event.startsAt) : null,
    minutesBeforeEnd: last ? minutes(event.endsAt, last) : null,
  };
}

async function attendance(userId: string, db: Executor) {
  const rows = await db
    .select({ slug: events.slug, startsAt: events.startsAt })
    .from(eventAttendees)
    .innerJoin(events, eq(events.id, eventAttendees.eventId))
    .where(eq(eventAttendees.userId, userId))
    .orderBy(asc(events.startsAt));
  return { eventsAttended: rows.length, attendedFoundersFest2026: rows.some((row) => row.slug === FOUNDERS_FEST_2026) };
}

async function signupIndex(user: UserRow, db: Executor): Promise<number> {
  const [row] = await db.select({ before: sql<number>`count(*)`.mapWith(Number) }).from(users).where(lt(users.createdAt, user.createdAt));
  return (row?.before ?? 0) + 1;
}

async function notesApproved(userId: string, db: Executor): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(interactions)
    .where(and(eq(interactions.authorId, userId), sql`${interactions.approvedAt} is not null`));
  return row?.count ?? 0;
}

async function eventConnections(event: EventRow | undefined, db: Executor): Promise<number> {
  if (!event) return 0;
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(connections)
    .where(and(eq(connections.eventId, event.id), eq(connections.status, "accepted")));
  return row?.count ?? 0;
}

// Cities come from the people met; consecutive events are counted as attended events for now (no calendar yet).
export async function badgeFactsFor(user: UserRow, event: EventRow | undefined, db: Executor = getDb()): Promise<BadgeFacts> {
  const rows = await acceptedFor(user.id, db);
  const others = [...new Set(rows.map((row) => otherOf(row, user.id)))];
  const [cityRows, attended, index, notes, total] = await Promise.all([
    others.length ? db.select({ city: users.city }).from(users).where(inArray(users.id, others)) : Promise.resolve([]),
    attendance(user.id, db),
    signupIndex(user, db),
    notesApproved(user.id, db),
    eventConnections(event, db),
  ]);
  const cities = new Set([user.city, ...cityRows.map((row) => row.city)].filter((city): city is string => Boolean(city)).map((city) => city.split(",")[0]?.trim()));
  return {
    totalConnections: rows.length,
    scannedBy: rows.filter((row) => row.addresseeId === user.id).length,
    cities: cities.size,
    distinctTopics: new Set(rows.flatMap((row) => row.topics)).size,
    notesApproved: notes,
    eventConnections: total,
    signupIndex: index,
    consecutiveEvents: attended.eventsAttended,
    ...attended,
    ...perPerson(rows, user.id),
    ...tonight(rows, event),
  };
}

export async function earnedBadgeIds(userId: string, db: Executor = getDb()): Promise<BadgeId[]> {
  const rows = await db.select({ badgeId: userBadges.badgeId }).from(userBadges).where(eq(userBadges.userId, userId)).orderBy(desc(userBadges.earnedAt));
  return rows.map((row) => row.badgeId).filter((id): id is BadgeId => (BADGE_IDS as readonly string[]).includes(id));
}

// Stores every badge whose rule is now complete; repeat-safe through the primary key.
export async function awardBadges(user: UserRow, event: EventRow | undefined, refId: string | null, db: Executor = getDb()): Promise<BadgeId[]> {
  const earned = earnedBadges(await badgeFactsFor(user, event, db));
  if (earned.length === 0) return [];
  const inserted = await db
    .insert(userBadges)
    .values(earned.map((badgeId) => ({ userId: user.id, badgeId, refId })))
    .onConflictDoNothing()
    .returning({ badgeId: userBadges.badgeId });
  return inserted.map((row) => row.badgeId as BadgeId);
}

export async function listBadges({ user }: InputOf<typeof R.listBadges>): ResultOf<typeof R.listBadges> {
  const db = getDb();
  const { badgeProgress } = copyFor(await requestLocale());
  const event = await findCurrentEvent(user.id, new Date(), db);
  const [facts, rows] = await Promise.all([
    badgeFactsFor(user, event, db),
    db.select().from(userBadges).where(eq(userBadges.userId, user.id)),
  ]);
  const earnedAt = new Map(rows.map((row) => [row.badgeId, row.earnedAt]));
  const badges = BADGE_LIST.map((badge) => {
    const at = earnedAt.get(badge.id) ?? null;
    const progress = progressFor(badge.id, facts);
    return {
      id: badge.id,
      earnedAt: at ? at.toISOString() : null,
      earnedNote: at ? badgeProgress.earnedOn(at) : null,
      progress: at || !progress ? null : { ...progress, label: badgeProgress.labels[badge.id] ?? "" },
    };
  });
  return { body: { badges, earned: badges.filter((badge) => badge.earnedAt).length, total: badges.length } };
}
