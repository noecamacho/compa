import "server-only";
import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getDb } from "../../db/client";
import { eventAttendees, eventOrganizers, eventScores, users, type EventRow, type UserRow } from "../../db/schema";
import { canManageUser } from "../api/admin-gate";
import type { AdminAttendeeT } from "../api/admin-schemas";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { canAttend } from "../roles";
import { eventCounts, manageableUsers, requireManagedEvent, toAdminUser } from "./admin-events";
import { ensureCheckedIn } from "./events";

// ---- GET /api/admin/users ----

export const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (char) => `\\${char}`);

function searchFilter(admin: UserRow, query: InputOf<typeof R.searchUsers>["query"]): SQL | undefined {
  const pattern = query.q ? `%${escapeLike(query.q)}%` : undefined;
  const text = pattern ? or(ilike(users.name, pattern), ilike(users.handle, pattern), ilike(users.email, pattern), ilike(users.company, pattern)) : undefined;
  const test = query.test === "include" ? undefined : eq(users.isTest, query.test === "only");
  return and(text, test, manageableUsers(admin));
}

export async function searchUsers({ user, query }: InputOf<typeof R.searchUsers>): ResultOf<typeof R.searchUsers> {
  const rows = await getDb().select().from(users).where(searchFilter(user, query)).orderBy(asc(users.name)).limit(query.limit);
  return { body: { users: rows.map(toAdminUser) } };
}

async function requireManagedUser(admin: UserRow, userId: string): Promise<UserRow> {
  const [row] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row || !canManageUser(admin, row)) return fail(E.userNotFound);
  return row;
}

// ---- Attendees ----

async function attendeeRows(event: EventRow, userId?: string) {
  return getDb()
    .select({ attendee: eventAttendees, user: users, points: eventScores.points, connections: eventScores.connections })
    .from(eventAttendees)
    .innerJoin(users, eq(users.id, eventAttendees.userId))
    .leftJoin(eventScores, and(eq(eventScores.eventId, eventAttendees.eventId), eq(eventScores.userId, eventAttendees.userId)))
    .where(and(eq(eventAttendees.eventId, event.id), userId ? eq(eventAttendees.userId, userId) : undefined))
    .orderBy(desc(eventAttendees.checkedInAt))
    .limit(1000);
}

type AttendeeRow = Awaited<ReturnType<typeof attendeeRows>>[number];

const toAttendee = (row: AttendeeRow): AdminAttendeeT => ({
  user: toAdminUser(row.user),
  checkedInAt: row.attendee.checkedInAt.toISOString(),
  addedByAdmin: row.attendee.addedBy !== null,
  points: Number(row.points ?? 0),
  connections: Number(row.connections ?? 0),
});

export async function listAttendees({ user, params }: InputOf<typeof R.listAttendees>): ResultOf<typeof R.listAttendees> {
  const event = await requireManagedEvent(user, params.slug);
  const [rows, counts] = await Promise.all([attendeeRows(event), eventCounts([event.id])]);
  const attendees = rows.map(toAttendee);
  const testUsers = attendees.filter((attendee) => attendee.user.isTest).length;
  const base = counts.get(event.id) ?? { attendees: 0, connections: 0, pending: 0, organizers: 0 };
  return { body: { attendees, counts: { ...base, testUsers } } };
}

// Checks the person in on their behalf: consent is recorded as admin-assigned (`event_attendees.added_by`).
export async function addAttendee({ user, params, body }: InputOf<typeof R.addAttendee>): ResultOf<typeof R.addAttendee> {
  const event = await requireManagedEvent(user, params.slug);
  const person = await requireManagedUser(user, body.userId);
  if (!canAttend(person, event)) return fail(E.testUserNotAllowed);
  const result = await ensureCheckedIn(person, event, true, getDb(), user.id);
  const [row] = await attendeeRows(event, person.id);
  if (!row) return fail(E.internal);
  return { status: result.created ? 201 : 200, body: { attendee: toAttendee(row), alreadyCheckedIn: !result.created } };
}

// Removing a check-in also removes that person's connections at this event (foreign-key cascade).
export async function removeAttendee({ user, params }: InputOf<typeof R.removeAttendee>): ResultOf<typeof R.removeAttendee> {
  const event = await requireManagedEvent(user, params.slug);
  await requireManagedUser(user, params.userId);
  const removed = await getDb()
    .delete(eventAttendees)
    .where(and(eq(eventAttendees.eventId, event.id), eq(eventAttendees.userId, params.userId)))
    .returning();
  if (removed.length === 0) return fail(E.attendeeNotFound);
  return { status: 204 };
}

// ---- Organizers ----

async function organizerRows(event: EventRow) {
  return getDb()
    .select({ organizer: eventOrganizers, user: users })
    .from(eventOrganizers)
    .innerJoin(users, eq(users.id, eventOrganizers.userId))
    .where(eq(eventOrganizers.eventId, event.id))
    .orderBy(asc(eventOrganizers.createdAt));
}

const toOrganizer = (row: Awaited<ReturnType<typeof organizerRows>>[number]) => ({
  user: toAdminUser(row.user),
  role: row.organizer.role,
  createdAt: row.organizer.createdAt.toISOString(),
});

export async function listOrganizers({ user, params }: InputOf<typeof R.listOrganizers>): ResultOf<typeof R.listOrganizers> {
  const event = await requireManagedEvent(user, params.slug);
  return { body: { organizers: (await organizerRows(event)).map(toOrganizer) } };
}

// Repeat-safe: assigning someone again only changes their role.
export async function setOrganizer({ user, params, body }: InputOf<typeof R.setOrganizer>): ResultOf<typeof R.setOrganizer> {
  const event = await requireManagedEvent(user, params.slug);
  const person = await requireManagedUser(user, body.userId);
  const [row] = await getDb()
    .insert(eventOrganizers)
    .values({ eventId: event.id, userId: person.id, role: body.role })
    .onConflictDoUpdate({ target: [eventOrganizers.eventId, eventOrganizers.userId], set: { role: body.role } })
    .returning();
  if (!row) return fail(E.internal);
  return { body: { organizer: { user: toAdminUser(person), role: row.role, createdAt: row.createdAt.toISOString() } } };
}

export async function removeOrganizer({ user, params }: InputOf<typeof R.removeOrganizer>): ResultOf<typeof R.removeOrganizer> {
  const event = await requireManagedEvent(user, params.slug);
  const removed = await getDb()
    .delete(eventOrganizers)
    .where(and(eq(eventOrganizers.eventId, event.id), eq(eventOrganizers.userId, params.userId)))
    .returning();
  if (removed.length === 0) return fail(E.userNotFound);
  return { status: 204 };
}
