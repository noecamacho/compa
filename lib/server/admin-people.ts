import "server-only";
import { and, asc, count, eq, ilike, isNotNull, isNull, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { getDb } from "../../db/client";
import { eventAttendees, eventOrganizers, eventScores, users, type EventRow, type UserRow } from "../../db/schema";
import { canManageUser } from "../api/admin-gate";
import type { AdminAttendeeT } from "../api/admin-schemas";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { sortDirection } from "../admin/sort";
import { canAttend } from "../roles";
import { escapeLike, eventCounts, manageableUsers, orderBy, pageOffset, requireManagedEvent, testFilter, toAdminUser } from "./admin-events";
import { ensureCheckedIn } from "./events";

// ---- GET /api/admin/users ----

type UserQuery = InputOf<typeof R.searchUsers>["query"];

// Shared with the attendee list.
function personTextFilter(q: string | undefined): SQL | undefined {
  if (!q) return undefined;
  const pattern = `%${escapeLike(q)}%`;
  return or(ilike(users.name, pattern), ilike(users.handle, pattern), ilike(users.email, pattern), ilike(users.company, pattern));
}

const roleFilter = (role: UserQuery["role"]): SQL | undefined => (role === "any" ? undefined : eq(users.role, role));

const userFilter = (admin: UserRow, query: UserQuery): SQL | undefined =>
  and(personTextFilter(query.q), testFilter(users.isTest, query.test), roleFilter(query.role), manageableUsers(admin));

const USER_SORT_KEYS: Record<UserQuery["sort"], AnyColumn> = { name: users.name, createdAt: users.createdAt };

export async function searchUsers({ user, query }: InputOf<typeof R.searchUsers>): ResultOf<typeof R.searchUsers> {
  const where = userFilter(user, query);
  const { page, limit } = query;
  const db = getDb();
  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(users)
      .where(where)
      .orderBy(...orderBy(sortDirection(query.sort, query.dir), USER_SORT_KEYS[query.sort], users.id))
      .limit(limit)
      .offset(pageOffset(page, limit)),
    db.select({ n: count() }).from(users).where(where),
  ]);
  return { body: { users: rows.map(toAdminUser), total: totals?.n ?? 0, page, pageSize: limit } };
}

async function requireManagedUser(admin: UserRow, userId: string): Promise<UserRow> {
  const [row] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row || !canManageUser(admin, row)) return fail(E.userNotFound);
  return row;
}

// ---- Attendees ----

type AttendeeQuery = InputOf<typeof R.listAttendees>["query"];

const selectAttendees = (where: SQL | undefined) =>
  getDb()
    .select({ attendee: eventAttendees, user: users, points: eventScores.points, connections: eventScores.connections })
    .from(eventAttendees)
    .innerJoin(users, eq(users.id, eventAttendees.userId))
    .leftJoin(eventScores, and(eq(eventScores.eventId, eventAttendees.eventId), eq(eventScores.userId, eventAttendees.userId)))
    .where(where);

type AttendeeRow = Awaited<ReturnType<typeof selectAttendees>>[number];

async function attendeeRow(event: EventRow, userId: string): Promise<AttendeeRow | undefined> {
  const [row] = await selectAttendees(and(eq(eventAttendees.eventId, event.id), eq(eventAttendees.userId, userId))).limit(1);
  return row;
}

const SOURCE_FILTERS: Record<AttendeeQuery["source"], SQL | undefined> = {
  all: undefined,
  admin: isNotNull(eventAttendees.addedBy),
  self: isNull(eventAttendees.addedBy),
};

const attendeeFilter = (event: EventRow, query: AttendeeQuery): SQL | undefined =>
  and(eq(eventAttendees.eventId, event.id), personTextFilter(query.q), SOURCE_FILTERS[query.source], testFilter(users.isTest, query.test));

const ATTENDEE_SORT_KEYS: Record<AttendeeQuery["sort"], AnyColumn | SQL> = {
  checkedInAt: eventAttendees.checkedInAt,
  name: users.name,
  points: sql`coalesce(${eventScores.points}, 0)`,
  connections: sql`coalesce(${eventScores.connections}, 0)`,
};

// One scan of the event's check-ins: the query's total and the event-wide test-user count.
async function attendeeTotals(event: EventRow, where: SQL | undefined) {
  const [row] = await getDb()
    .select({
      total: sql<number>`(count(*) filter (where ${where ?? sql`true`}))::int`,
      testUsers: sql<number>`(count(*) filter (where ${users.isTest}))::int`,
    })
    .from(eventAttendees)
    .innerJoin(users, eq(users.id, eventAttendees.userId))
    .where(eq(eventAttendees.eventId, event.id));
  return { total: Number(row?.total ?? 0), testUsers: Number(row?.testUsers ?? 0) };
}

const toAttendee = (row: AttendeeRow): AdminAttendeeT => ({
  user: toAdminUser(row.user),
  checkedInAt: row.attendee.checkedInAt.toISOString(),
  addedByAdmin: row.attendee.addedBy !== null,
  points: Number(row.points ?? 0),
  connections: Number(row.connections ?? 0),
});

export async function listAttendees({ user, params, query }: InputOf<typeof R.listAttendees>): ResultOf<typeof R.listAttendees> {
  const event = await requireManagedEvent(user, params.slug);
  const where = attendeeFilter(event, query);
  const order = orderBy(sortDirection(query.sort, query.dir), ATTENDEE_SORT_KEYS[query.sort], eventAttendees.userId);
  const [rows, totals, counts] = await Promise.all([
    selectAttendees(where)
      .orderBy(...order)
      .limit(query.pageSize)
      .offset(pageOffset(query.page, query.pageSize)),
    attendeeTotals(event, where),
    eventCounts([event.id]),
  ]);
  const base = counts.get(event.id) ?? { attendees: 0, connections: 0, pending: 0, organizers: 0 };
  return { body: { attendees: rows.map(toAttendee), total: totals.total, counts: { ...base, testUsers: totals.testUsers } } };
}

// Checks the person in on their behalf: consent is recorded as admin-assigned (`event_attendees.added_by`).
export async function addAttendee({ user, params, body }: InputOf<typeof R.addAttendee>): ResultOf<typeof R.addAttendee> {
  const event = await requireManagedEvent(user, params.slug);
  const person = await requireManagedUser(user, body.userId);
  if (!canAttend(person, event)) return fail(E.testUserNotAllowed);
  const result = await ensureCheckedIn(person, event, true, getDb(), user.id);
  const row = await attendeeRow(event, person.id);
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
