// D2: the organizer console (/admin) over the demo room. The visitor is its super admin; the room is the only event.
import type { z } from "zod";
import type * as A from "../api/admin-schemas";
import type { Dictionary } from "../copy";
import { slugify } from "../slug";
import type { DemoPerson } from "./cast";
import { pendingRequesters } from "./visitor";
import type { DemoView } from "./view";

type AdminEvent = z.input<typeof A.AdminEvent>;
type AdminUser = z.input<typeof A.AdminUser>;
type AttendeeQuery = z.output<typeof A.AttendeeQuery>;
type UserQuery = z.output<typeof A.UserSearchQuery>;
type EventQuery = z.output<typeof A.AdminEventQuery>;
type Attendee = z.input<typeof A.AdminAttendee>;

export function adminEventOf(view: DemoView, origin: string, copy: Dictionary): AdminEvent {
  const { event } = view.room;
  return {
    id: event.id, slug: event.slug, name: event.name, accessCode: event.code, joinUrl: `${origin}/e/${event.code}`,
    startsAt: event.startsAt, endsAt: event.endsAt, isRunning: true, status: "live", isTest: false,
    description: copy.demoApi.eventDescription,
    venueName: "Foro Demo", address: null, city: "Guadalajara", country: "México", websiteUrl: null,
    timezone: event.timezone, schedule: [], createdAt: event.startsAt,
    counts: { attendees: view.people.length, connections: view.links.length, pending: pendingRequesters(view.visitor).length, organizers: 1 },
  };
}

const matches = (needle: string | undefined, ...fields: (string | null | undefined)[]): boolean =>
  !needle || fields.some((field) => field && slugify(field).includes(slugify(needle)));

export function adminEventsOf(view: DemoView, origin: string, copy: Dictionary, query: EventQuery): AdminEvent[] {
  const event = adminEventOf(view, origin, copy);
  const shown = (!query.status || query.status === "live") && (!query.phase || query.phase === "running");
  return shown && (matches(query.q, event.name, event.slug, event.city) || query.q === event.accessCode) ? [event] : [];
}

export function adminUserOf(person: DemoPerson, view: DemoView): AdminUser {
  const isVisitor = person.id === view.me.id;
  return {
    id: person.id, handle: person.handle, name: person.name, photoUrl: person.photoUrl,
    headline: person.headline || null, company: person.company || null, city: person.city || null,
    email: null, role: isVisitor ? "super_admin" : "user", isTest: false, createdAt: view.room.event.startsAt,
  };
}

const page = <T>(rows: T[], pageNumber: number, size: number): T[] => rows.slice((pageNumber - 1) * size, pageNumber * size);

const ATTENDEE_ORDER: Record<AttendeeQuery["sort"], (a: Attendee, b: Attendee) => number> = {
  checkedInAt: () => 0,
  name: (a, b) => a.user.name.localeCompare(b.user.name),
  points: (a, b) => a.points - b.points,
  connections: (a, b) => a.connections - b.connections,
};

// Attendees in check-in order; nobody here was added by an admin and nobody is a test user.
export function attendeesOf(view: DemoView, query: AttendeeQuery): { attendees: Attendee[]; total: number } {
  const all = view.people.map((live): Attendee => {
    const person = view.byId.get(live.id) ?? view.me;
    return { user: adminUserOf(person, view), checkedInAt: view.room.event.startsAt, addedByAdmin: false, points: live.points, connections: live.connections };
  });
  const found = all.filter((row) => query.source !== "admin" && query.test !== "only" && matches(query.q, row.user.name, row.user.handle, row.user.company));
  const ascending = (query.dir ?? (query.sort === "name" ? "asc" : "desc")) === "asc";
  const sorted = found.sort((a, b) => (ascending ? 1 : -1) * ATTENDEE_ORDER[query.sort](a, b));
  return { attendees: page(sorted, query.page, query.pageSize), total: found.length };
}

export function usersOf(view: DemoView, query: UserQuery): { users: AdminUser[]; total: number } {
  const everyone = [view.me, ...view.room.cast].map((person) => adminUserOf(person, view));
  const found = everyone.filter((user) => query.test !== "only" && (query.role === "any" || query.role === user.role) && matches(query.q, user.name, user.handle, user.company));
  const sorted = query.sort === "name" ? found.sort((a, b) => a.name.localeCompare(b.name)) : found;
  const ordered = query.dir === "desc" ? sorted.reverse() : sorted;
  return { users: page(ordered, query.page, query.limit), total: found.length };
}

export function adminStatsOf(view: DemoView): z.input<typeof A.AdminStats> {
  const people = view.people.length;
  return {
    events: { running: 1, upcoming: 0, draft: 0, ended: 0, archived: 0, test: 0 },
    people: { total: people, test: 0, superAdmins: 1, joinedLast24h: people },
    checkIns: { total: people, last24h: people },
    connections: { accepted: view.links.length, pending: pendingRequesters(view.visitor).length },
    asOf: new Date(view.now).toISOString(),
  };
}
