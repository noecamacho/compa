import "server-only";
import { and, count, desc, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
import { getDb } from "../../db/client";
import { connections, eventAttendees, eventOrganizers, events, users, type EventRow, type UserRow } from "../../db/schema";
import { generateAccessCode, joinUrl } from "../access-code";
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

function listFilter(admin: UserRow, query: InputOf<typeof R.listAdminEvents>["query"]): SQL | undefined {
  const conditions = [
    query.status ? eq(events.status, query.status) : undefined,
    query.status || query.archived === "1" ? undefined : ne(events.status, "archived"),
    admin.isTest ? eq(events.isTest, true) : undefined,
  ];
  return and(...conditions);
}

export async function listAdminEvents({ req, user, query }: InputOf<typeof R.listAdminEvents>): ResultOf<typeof R.listAdminEvents> {
  const rows = await getDb().select().from(events).where(listFilter(user, query)).orderBy(desc(events.startsAt)).limit(200);
  const counts = await eventCounts(rows.map((row) => row.id));
  return { body: { events: rows.map((row) => toAdminEvent(req, row, counts.get(row.id))) } };
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
