import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, type Executor } from "../../db/client";
import { eventAttendees, events, type EventRow, type UserRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { isRunning } from "../connection-status";
import { broadcast, liveTopic } from "../realtime";
import { isUniqueViolation } from "./people";

export async function findEventBySlug(slug: string, db: Executor = getDb()): Promise<EventRow | undefined> {
  const [row] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  return row;
}

export async function requireEvent(slug: string): Promise<EventRow> {
  return (await findEventBySlug(slug)) ?? fail(E.eventNotFound);
}

export const toEventBody = (event: EventRow, now = new Date()) => ({
  slug: event.slug,
  name: event.name,
  startsAt: event.startsAt.toISOString(),
  endsAt: event.endsAt.toISOString(),
  isRunning: isRunning(event, now),
});

export async function getEvent({ params }: InputOf<typeof R.getEvent>): ResultOf<typeof R.getEvent> {
  return { body: toEventBody(await requireEvent(params.slug)) };
}

export async function createEvent({ user, body }: InputOf<typeof R.createEvent>): ResultOf<typeof R.createEvent> {
  const values = { ...body, startsAt: new Date(body.startsAt), endsAt: new Date(body.endsAt), createdBy: user.id };
  try {
    const [row] = await getDb().insert(events).values(values).returning();
    if (!row) return fail(E.internal);
    return { body: { event: { id: row.id, ...toEventBody(row) } } };
  } catch (error) {
    if (isUniqueViolation(error)) return fail(E.slugTaken);
    throw error;
  }
}

export type CheckInResult = { checkedInAt: Date; created: boolean };

// Repeat-safe check-in; broadcasts `attendee.checked_in` the first time (API spec §8).
export async function ensureCheckedIn(user: UserRow, event: EventRow, db: Executor = getDb()): Promise<CheckInResult> {
  const now = new Date();
  const [inserted] = await db
    .insert(eventAttendees)
    .values({ eventId: event.id, userId: user.id, screenConsentAt: now })
    .onConflictDoNothing()
    .returning();
  if (inserted) {
    await broadcast({
      topic: liveTopic(event.slug),
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

export async function checkIn({ user, params }: InputOf<typeof R.checkIn>): ResultOf<typeof R.checkIn> {
  const event = await requireEvent(params.slug);
  if (!isRunning(event, new Date())) return fail(E.eventNotRunning);
  const result = await ensureCheckedIn(user, event);
  return {
    status: result.created ? 201 : 200,
    body: { event: { slug: event.slug, name: event.name }, checkedInAt: result.checkedInAt.toISOString(), alreadyCheckedIn: !result.created },
  };
}
