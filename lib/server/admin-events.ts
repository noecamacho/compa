import "server-only";
import { and, asc, count, desc, eq, gt, ilike, inArray, lte, ne, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { getDb } from "../../db/client";
import { connections, eventAttendees, eventOrganizers, events, users, type EventRow, type UserRow } from "../../db/schema";
import { generateAccessCode, joinUrl } from "../access-code";
import { EVENT_PHASES, type EventPhaseT } from "../admin/event-phase";
import { sortDirection, type SortDir } from "../admin/sort";
import { canManageEvent } from "../api/admin-gate";
import type { AdminEventT, AdminUserT, PatchEventBodyT } from "../api/admin-schemas";
import { ApiError, E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { isRunning } from "../connection-status";
import { applyEventEdit, endNow, type EditableEvent } from "../events/edit";
import { DEFAULT_TIMEZONE } from "../events/schedule";
import { findEventBySlug, toEventBody } from "./events";
import { isUniqueViolation } from "./people";
import { siteOrigin } from "./site";

export type EventCountsT = AdminEventT["counts"];
const NO_COUNTS: EventCountsT = { attendees: 0, connections: 0, pending: 0, organizers: 0 };

export const toAdminUser = (row: UserRow): AdminUserT => ({
  id: row.id,
  handle: row.handle,
  name: row.name,
  photoUrl: row.photoUrl,
  headline: row.headline,
  company: row.company,
  city: row.city,
  email: row.email,
  role: row.role,
  isTest: row.isTest,
  createdAt: row.createdAt.toISOString(),
});

// Unknown slug and "not yours to manage" (a test admin on a real event) fail the same way.
export async function requireManagedEvent(admin: UserRow, slug: string): Promise<EventRow> {
  const event = await findEventBySlug(slug);
  if (!event || !canManageEvent(admin, event)) return fail(E.eventNotFound);
  return event;
}

async function countBy(eventIds: string[], build: (ids: string[]) => Promise<{ eventId: string; n: number }[]>) {
  if (eventIds.length === 0) return new Map<string, number>();
  return new Map((await build(eventIds)).map((row) => [row.eventId, row.n]));
}

export async function eventCounts(eventIds: string[]): Promise<Map<string, EventCountsT>> {
  const db = getDb();
  const byStatus = (status: "accepted" | "pending") => (ids: string[]) =>
    db
      .select({ eventId: connections.eventId, n: count() })
      .from(connections)
      .where(and(inArray(connections.eventId, ids), eq(connections.status, status)))
      .groupBy(connections.eventId);
  const [attendees, accepted, pending, organizers] = await Promise.all([
    countBy(eventIds, (ids) =>
      db.select({ eventId: eventAttendees.eventId, n: count() }).from(eventAttendees).where(inArray(eventAttendees.eventId, ids)).groupBy(eventAttendees.eventId),
    ),
    countBy(eventIds, byStatus("accepted")),
    countBy(eventIds, byStatus("pending")),
    countBy(eventIds, (ids) =>
      db.select({ eventId: eventOrganizers.eventId, n: count() }).from(eventOrganizers).where(inArray(eventOrganizers.eventId, ids)).groupBy(eventOrganizers.eventId),
    ),
  ]);
  const of = (id: string): EventCountsT => ({
    attendees: attendees.get(id) ?? 0,
    connections: accepted.get(id) ?? 0,
    pending: pending.get(id) ?? 0,
    organizers: organizers.get(id) ?? 0,
  });
  return new Map(eventIds.map((id) => [id, of(id)]));
}

export const accessFor = (req: Request, event: EventRow) => ({ accessCode: event.accessCode, joinUrl: joinUrl(siteOrigin(req), event.accessCode) });

export const toAdminEvent = (req: Request, event: EventRow, counts: EventCountsT = NO_COUNTS, now = new Date()): AdminEventT => ({
  id: event.id,
  slug: event.slug,
  name: event.name,
  ...accessFor(req, event),
  startsAt: event.startsAt.toISOString(),
  endsAt: event.endsAt.toISOString(),
  isRunning: isRunning(event, now),
  status: event.status,
  isTest: event.isTest,
  description: event.description,
  venueName: event.venueName,
  address: event.address,
  city: event.city,
  country: event.country,
  websiteUrl: event.websiteUrl,
  timezone: event.timezone,
  schedule: event.schedule,
  createdAt: event.createdAt.toISOString(),
  counts,
});

async function adminEventBody(req: Request, event: EventRow) {
  const counts = await eventCounts([event.id]);
  return { event: toAdminEvent(req, event, counts.get(event.id)) };
}

// ---- Shared write rules ----

const DETAIL_KEYS = ["description", "venueName", "address", "city", "country", "websiteUrl"] as const;
type DetailKey = (typeof DETAIL_KEYS)[number];

// `null` or an empty string clears a detail; `undefined` leaves it alone.
function detailChanges(body: Partial<Record<DetailKey, string | null | undefined>>): Partial<Record<DetailKey, string | null>> {
  const changes: Partial<Record<DetailKey, string | null>> = {};
  for (const key of DETAIL_KEYS) {
    const value = body[key];
    if (value !== undefined) changes[key] = value || null;
  }
  return changes;
}

const invalid = (fields: Record<string, string[]>): never => {
  throw new ApiError(400, E.invalidInput.code, "Some fields are invalid.", fields);
};

function checkedWindow(current: EditableEvent, patch: PatchEventBodyT): EditableEvent {
  const result = applyEventEdit(current, patch);
  return result.ok ? result.value : invalid(result.fields);
}

type CreateBody = InputOf<typeof R.createEvent>["body"];

// Insert values for a new event, with the same window and schedule rules as an edit.
export function eventValuesFrom(body: CreateBody) {
  const blank: EditableEvent = {
    startsAt: new Date(body.startsAt),
    endsAt: new Date(body.endsAt),
    timezone: body.timezone ?? DEFAULT_TIMEZONE,
    schedule: [],
    status: body.status ?? "live",
  };
  const window = checkedWindow(blank, { schedule: body.schedule ?? [] });
  return { name: body.name, slug: body.slug, ...detailChanges(body), ...window, isTest: body.isTest ?? false };
}

// ---- Routes ----

export async function createEvent({ req, user, body }: InputOf<typeof R.createEvent>): ResultOf<typeof R.createEvent> {
  // A test super admin can only ever make test events (lib/api/admin-gate.ts).
  const values = { ...eventValuesFrom(body), createdBy: user.id };
  if (user.isTest) values.isTest = true;
  try {
    const [row] = await getDb().insert(events).values(values).returning();
    if (!row) return fail(E.internal);
    return { body: { event: { id: row.id, ...toEventBody(row), ...accessFor(req, row) } } };
  } catch (error) {
    if (isUniqueViolation(error)) return fail(E.slugTaken);
    throw error;
  }
}

// ---- GET /api/admin/events ----

type ListQuery = InputOf<typeof R.listAdminEvents>["query"];
type TestScope = ListQuery["test"];

// Search text matches literally: `%`, `_` and `\` are escaped for ilike.
export const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (char) => `\\${char}`);

// Shared by the events, people and attendee lists.
export const testFilter = (isTest: AnyColumn, test: TestScope): SQL | undefined => (test === "include" ? undefined : eq(isTest, test === "only"));

// A test admin sees test events only (lib/api/admin-gate.ts canManageEvent).
export const managedEvents = (admin: UserRow): SQL | undefined => (admin.isTest ? eq(events.isTest, true) : undefined);

const live = () => eq(events.status, "live");

// The phaseOf rule (lib/admin/event-phase.ts) in SQL.
const PHASE_SQL: Record<EventPhaseT, (now: Date) => SQL | undefined> = {
  running: (now) => and(live(), lte(events.startsAt, now), gt(events.endsAt, now)),
  upcoming: (now) => and(live(), gt(events.startsAt, now)),
  draft: () => eq(events.status, "draft"),
  ended: (now) => or(eq(events.status, "ended"), and(live(), lte(events.endsAt, now))),
  archived: () => eq(events.status, "archived"),
};

export const phaseFilter = (phase: EventPhaseT, now: Date): SQL => PHASE_SQL[phase](now) ?? sql`true`;

// `phase` wins over `status`, which wins over the legacy `archived` flag.
function lifecycleFilter(query: ListQuery, now: Date): SQL | undefined {
  if (query.phase) return phaseFilter(query.phase, now);
  if (query.status) return eq(events.status, query.status);
  return query.archived === "1" ? undefined : ne(events.status, "archived");
}

function eventTextFilter(q: string | undefined): SQL | undefined {
  if (!q) return undefined;
  const pattern = `%${escapeLike(q)}%`;
  return or(ilike(events.name, pattern), ilike(events.slug, pattern), ilike(events.venueName, pattern), ilike(events.city, pattern), eq(events.accessCode, q.toLowerCase()));
}

export const eventListFilter = (admin: UserRow, query: ListQuery, now: Date): SQL | undefined =>
  and(lifecycleFilter(query, now), eventTextFilter(query.q), testFilter(events.isTest, query.test), managedEvents(admin));

// Integers are inlined: a bound parameter in CASE would be typed text and sort "10" before "2".
const phaseRank = (now: Date): SQL =>
  sql`case ${sql.join(
    EVENT_PHASES.map((phase, rank) => sql`when ${phaseFilter(phase, now)} then ${sql.raw(String(rank))}`),
    sql` `,
  )} end`;

const EVENT_SORT_KEYS: Record<ListQuery["sort"], (now: Date) => AnyColumn | SQL> = {
  startsAt: () => events.startsAt,
  name: () => events.name,
  createdAt: () => events.createdAt,
  status: phaseRank,
  attendees: () => sql`(select count(*) from ${eventAttendees} where ${eventAttendees.eventId} = ${events.id})`,
  connections: () =>
    sql`(select count(*) from ${connections} where ${connections.eventId} = ${events.id} and ${connections.status} = 'accepted')`,
};

export const orderBy = (dir: SortDir, key: AnyColumn | SQL, tiebreaker: AnyColumn): SQL[] => {
  const by = dir === "asc" ? asc : desc;
  return [by(key), by(tiebreaker)];
};

// `events.id` breaks ties, so a page never repeats or skips a row when sort keys are equal.
export const eventOrder = (sort: ListQuery["sort"], dir: SortDir | undefined, now: Date): SQL[] =>
  orderBy(sortDirection(sort, dir), EVENT_SORT_KEYS[sort](now), events.id);

export const pageOffset = (page: number, pageSize: number): number => (page - 1) * pageSize;

// shortcut: offset pagination can shift a row when events change between page loads; a cursor if that ever matters.
export async function listAdminEvents({ req, user, query }: InputOf<typeof R.listAdminEvents>): ResultOf<typeof R.listAdminEvents> {
  const now = new Date();
  const where = eventListFilter(user, query, now);
  const { page, pageSize } = query;
  const db = getDb();
  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(events)
      .where(where)
      .orderBy(...eventOrder(query.sort, query.dir, now))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db.select({ n: count() }).from(events).where(where),
  ]);
  const counts = await eventCounts(rows.map((row) => row.id));
  return { body: { events: rows.map((row) => toAdminEvent(req, row, counts.get(row.id), now)), total: totals?.n ?? 0, page, pageSize } };
}

export async function getAdminEvent({ req, user, params }: InputOf<typeof R.getAdminEvent>): ResultOf<typeof R.getAdminEvent> {
  const event = await requireManagedEvent(user, params.slug);
  return { body: await adminEventBody(req, event) };
}

const editableOf = (event: EventRow): EditableEvent => ({
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  timezone: event.timezone,
  schedule: event.schedule,
  status: event.status,
});

async function saveEvent(event: EventRow, changes: Partial<typeof events.$inferInsert>): Promise<EventRow> {
  const [row] = await getDb().update(events).set(changes).where(eq(events.id, event.id)).returning();
  return row ?? fail(E.internal);
}

// Last write wins; concurrent admin edits are rare and acceptable (backlog T-023).
export async function patchAdminEvent({ req, user, params, body }: InputOf<typeof R.patchAdminEvent>): ResultOf<typeof R.patchAdminEvent> {
  const event = await requireManagedEvent(user, params.slug);
  const window = checkedWindow(editableOf(event), body);
  const testFlag = body.isTest === undefined || user.isTest ? {} : { isTest: body.isTest };
  const row = await saveEvent(event, {
    ...(body.name ? { name: body.name } : {}),
    ...detailChanges(body),
    ...window,
    ...testFlag,
  });
  return { body: await adminEventBody(req, row) };
}

export async function endAdminEvent({ req, user, params }: InputOf<typeof R.endAdminEvent>): ResultOf<typeof R.endAdminEvent> {
  const event = await requireManagedEvent(user, params.slug);
  const row = await saveEvent(event, endNow(event, new Date()));
  return { body: await adminEventBody(req, row) };
}

// Soft delete: a hard delete would cascade away everyone's connections and points (backlog T-023).
export async function archiveAdminEvent({ req, user, params }: InputOf<typeof R.archiveAdminEvent>): ResultOf<typeof R.archiveAdminEvent> {
  const event = await requireManagedEvent(user, params.slug);
  const ended = event.endsAt > new Date() ? endNow(event, new Date()) : {};
  const row = await saveEvent(event, { ...ended, status: "archived" });
  return { body: await adminEventBody(req, row) };
}

// The old code stops working at once; a collision with another event's code (≈ 2^-49) surfaces as a 500 and a retry.
export async function rotateEventCode({ req, user, params }: InputOf<typeof R.rotateEventCode>): ResultOf<typeof R.rotateEventCode> {
  const event = await requireManagedEvent(user, params.slug);
  const row = await saveEvent(event, { accessCode: generateAccessCode() });
  return { body: { slug: row.slug, ...accessFor(req, row) } };
}

// Shared by the people routes: the users a super admin may act on.
export const manageableUsers = (admin: UserRow) => (admin.isTest ? eq(users.isTest, true) : sql`true`);
