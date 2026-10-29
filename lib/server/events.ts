import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import { getDb, type Executor } from "../../db/client";
import { connections, eventAttendees, events, users, type EventRow, type UserRow } from "../../db/schema";
import { parseAccessCode } from "../access-code";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { isRunning } from "../connection-status";
import { canAttend } from "../roles";
import { broadcast, liveTopic } from "../realtime";

export async function findEventBySlug(slug: string, db: Executor = getDb()): Promise<EventRow | undefined> {
  const [row] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  return row;
}

export async function findEventByCode(code: string, db: Executor = getDb()): Promise<EventRow | undefined> {
  const [row] = await db.select().from(events).where(eq(events.accessCode, code)).limit(1);
  return row;
}

type FindByCode = (code: string) => Promise<EventRow | undefined>;

// Draft and archived events open no public door (M20); their code answers like an unknown one.
export const isPublic = (event: Pick<EventRow, "status">): boolean => event.status !== "draft" && event.status !== "archived";

// Public routes resolve the event by its access code only (A10). A malformed code never reaches the database,
// and every miss fails with the same 404, so the response says nothing about which events exist.
export async function requireEventByCode(input: string, find: FindByCode = findEventByCode): Promise<EventRow> {
  const code = parseAccessCode(input);
  const event = code ? await find(code) : undefined;
  return event && isPublic(event) ? event : fail(E.eventNotFound);
}

// At a real event, test people are left out of every count, list and board (M20); a test event shows everyone.
export const realPeopleOnly = (event: Pick<EventRow, "isTest">) => (event.isTest ? undefined : eq(users.isTest, false));

const noTestMember = sql`not exists (select 1 from ${users} where ${users.id} in (${connections.requesterId}, ${connections.addresseeId}) and ${users.isTest})`;

export const connectionsOfRealPeople = (event: Pick<EventRow, "isTest">) => (event.isTest ? undefined : noTestMember);

// A6: public event reads (door, big screen) share a 1 s CDN cache, so a room of phones or several screens polling the
// same event costs one function call per second, not one per request.
export const LIVE_CACHE = { "Cache-Control": "public, s-maxage=1, stale-while-revalidate=1" };

export const toEventBody = (event: EventRow, now = new Date()) => ({
  slug: event.slug,
  name: event.name,
  startsAt: event.startsAt.toISOString(),
  endsAt: event.endsAt.toISOString(),
  isRunning: isRunning(event, now),
});

export const phaseOf = (event: EventRow, now: Date) => {
  if (isRunning(event, now)) return "running" as const;
  return now < event.startsAt ? ("upcoming" as const) : ("ended" as const);
};

async function doorCounters(event: EventRow) {
  const db = getDb();
  const [[attendees], [accepted]] = await Promise.all([
    db
      .select({ n: count() })
      .from(eventAttendees)
      .innerJoin(users, eq(users.id, eventAttendees.userId))
      .where(and(eq(eventAttendees.eventId, event.id), realPeopleOnly(event))),
    db
      .select({ n: count() })
      .from(connections)
      .where(and(eq(connections.eventId, event.id), eq(connections.status, "accepted"), connectionsOfRealPeople(event))),
  ]);
  return { checkedIn: attendees?.n ?? 0, connections: accepted?.n ?? 0 };
}

export async function getEvent({ params }: InputOf<typeof R.getEvent>): ResultOf<typeof R.getEvent> {
  const event = await requireEventByCode(params.code);
  const now = new Date();
  const body = {
    code: event.accessCode,
    name: event.name,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    timezone: event.timezone,
    isRunning: isRunning(event, now),
    phase: phaseOf(event, now),
    counters: await doorCounters(event),
  };
  return { body, headers: LIVE_CACHE };
}

export type CheckInResult = { checkedInAt: Date; created: boolean };

// Repeat-safe check-in; broadcasts `attendee.checked_in` the first time (API spec §8).
// `addedBy` is the super admin who checked the person in on their behalf (consent admin-assigned, M20).
export async function ensureCheckedIn(user: UserRow, event: EventRow, screenConsent: boolean, db: Executor = getDb(), addedBy?: string | null): Promise<CheckInResult> {
  if (!screenConsent) fail(E.consentRequired);
  if (!canAttend(user, event)) fail(E.testUserNotAllowed);
  const now = new Date();
  const [inserted] = await db
    .insert(eventAttendees)
    .values({ eventId: event.id, userId: user.id, screenConsentAt: now, addedBy: addedBy ?? null })
    .onConflictDoNothing()
    .returning();
  if (inserted) {
    await broadcast({
      topic: liveTopic(event.accessCode),
      event: "attendee.checked_in",
      payload: { id: user.id, name: user.name, photoUrl: user.photoUrl },
    });
    return { checkedInAt: inserted.checkedInAt, created: true };
  }
  const [existing] = await db
    .select()
    .from(eventAttendees)
    .where(and(eq(eventAttendees.eventId, event.id), eq(eventAttendees.userId, user.id)));
  return { checkedInAt: existing?.checkedInAt ?? now, created: false };
}

export async function isCheckedIn(userId: string, eventId: string, db: Executor = getDb()): Promise<boolean> {
  const [row] = await db
    .select({ userId: eventAttendees.userId })
    .from(eventAttendees)
    .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function checkIn({ user, params, body }: InputOf<typeof R.checkIn>): ResultOf<typeof R.checkIn> {
  const event = await requireEventByCode(params.code);
  if (!isRunning(event, new Date())) return fail(E.eventNotRunning);
  const result = await ensureCheckedIn(user, event, body.screenConsent);
  return {
    status: result.created ? 201 : 200,
    body: { event: { code: event.accessCode, name: event.name }, checkedInAt: result.checkedInAt.toISOString(), alreadyCheckedIn: !result.created },
  };
}
