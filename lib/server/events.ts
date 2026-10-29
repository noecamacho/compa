import "server-only";
import { and, count, eq } from "drizzle-orm";
import { getDb, type Executor } from "../../db/client";
import { connections, eventAttendees, events, type EventRow, type UserRow } from "../../db/schema";
import { generateAccessCode, joinUrl, parseAccessCode } from "../access-code";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { isRunning } from "../connection-status";
import { broadcast, liveTopic } from "../realtime";
import { isUniqueViolation } from "./people";
import { siteOrigin } from "./site";

export async function findEventBySlug(slug: string, db: Executor = getDb()): Promise<EventRow | undefined> {
  const [row] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  return row;
}

export async function requireEvent(slug: string): Promise<EventRow> {
  return (await findEventBySlug(slug)) ?? fail(E.eventNotFound);
}

export async function findEventByCode(code: string, db: Executor = getDb()): Promise<EventRow | undefined> {
  const [row] = await db.select().from(events).where(eq(events.accessCode, code)).limit(1);
  return row;
}

type FindByCode = (code: string) => Promise<EventRow | undefined>;

// Public routes resolve the event by its access code only (A10). A malformed code never reaches the database,
// and every miss fails with the same 404, so the response says nothing about which events exist.
export async function requireEventByCode(input: string, find: FindByCode = findEventByCode): Promise<EventRow> {
  const code = parseAccessCode(input);
  const event = code ? await find(code) : undefined;
  return event ?? fail(E.eventNotFound);
}

export const toEventBody = (event: EventRow, now = new Date()) => ({
  slug: event.slug,
  name: event.name,
  startsAt: event.startsAt.toISOString(),
  endsAt: event.endsAt.toISOString(),
  isRunning: isRunning(event, now),
});

const phaseOf = (event: EventRow, now: Date) => {
  if (isRunning(event, now)) return "running" as const;
  return now < event.startsAt ? ("upcoming" as const) : ("ended" as const);
};

async function doorCounters(event: EventRow) {
  const db = getDb();
  const [[attendees], [accepted]] = await Promise.all([
    db.select({ n: count() }).from(eventAttendees).where(eq(eventAttendees.eventId, event.id)),
    db.select({ n: count() }).from(connections).where(and(eq(connections.eventId, event.id), eq(connections.status, "accepted"))),
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
    isRunning: isRunning(event, now),
    phase: phaseOf(event, now),
    counters: await doorCounters(event),
  };
  return { body };
}

const accessFor = (req: Request, event: EventRow) => ({ accessCode: event.accessCode, joinUrl: joinUrl(siteOrigin(req), event.accessCode) });

export async function createEvent({ req, user, body }: InputOf<typeof R.createEvent>): ResultOf<typeof R.createEvent> {
  const values = { ...body, startsAt: new Date(body.startsAt), endsAt: new Date(body.endsAt), createdBy: user.id };
  try {
    const [row] = await getDb().insert(events).values(values).returning();
    if (!row) return fail(E.internal);
    return { body: { event: { id: row.id, ...toEventBody(row), ...accessFor(req, row) } } };
  } catch (error) {
    if (isUniqueViolation(error)) return fail(E.slugTaken);
    throw error;
  }
}

// The old code stops working at once; a collision with another event's code (≈ 2^-49) surfaces as a 500 and a retry.
export async function rotateEventCode({ req, params }: InputOf<typeof R.rotateEventCode>): ResultOf<typeof R.rotateEventCode> {
  const event = await requireEvent(params.slug);
  const [row] = await getDb().update(events).set({ accessCode: generateAccessCode() }).where(eq(events.id, event.id)).returning();
  if (!row) return fail(E.internal);
  return { body: { slug: row.slug, ...accessFor(req, row) } };
}

export type CheckInResult = { checkedInAt: Date; created: boolean };

// Repeat-safe check-in; broadcasts `attendee.checked_in` the first time (API spec §8).
export async function ensureCheckedIn(user: UserRow, event: EventRow, screenConsent: boolean, db: Executor = getDb()): Promise<CheckInResult> {
  if (!screenConsent) fail(E.consentRequired);
  const now = new Date();
  const [inserted] = await db
    .insert(eventAttendees)
    .values({ eventId: event.id, userId: user.id, screenConsentAt: now })
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
