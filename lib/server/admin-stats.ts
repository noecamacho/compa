import "server-only";
import { and, eq, gte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../../db/client";
import { connections, eventAttendees, events, users, type UserRow } from "../../db/schema";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { managedEvents, manageableUsers, phaseFilter } from "./admin-events";

const DAY_MS = 24 * 60 * 60 * 1000;

// One `count(*) filter (where …)` per number, so each table is scanned once.
const countWhere = (condition: SQL | undefined): SQL<number> => sql<number>`(count(*) filter (where ${condition ?? sql`true`}))::int`.mapWith(Number);

// Requests at an ended or archived event expire on read, so they are not pending any more.
const notOver = (now: Date): SQL | undefined => or(phaseFilter("running", now), phaseFilter("upcoming", now), phaseFilter("draft", now));

const eventStats = (admin: UserRow, now: Date) =>
  getDb()
    .select({
      running: countWhere(phaseFilter("running", now)),
      upcoming: countWhere(phaseFilter("upcoming", now)),
      draft: countWhere(phaseFilter("draft", now)),
      ended: countWhere(phaseFilter("ended", now)),
      archived: countWhere(phaseFilter("archived", now)),
      test: countWhere(eq(events.isTest, true)),
    })
    .from(events)
    .where(managedEvents(admin));

const peopleStats = (admin: UserRow, dayAgo: Date) =>
  getDb()
    .select({
      total: countWhere(undefined),
      test: countWhere(eq(users.isTest, true)),
      superAdmins: countWhere(eq(users.role, "super_admin")),
      joinedLast24h: countWhere(gte(users.createdAt, dayAgo)),
    })
    .from(users)
    .where(manageableUsers(admin));

const checkInStats = (admin: UserRow, dayAgo: Date) =>
  getDb()
    .select({ total: countWhere(undefined), last24h: countWhere(gte(eventAttendees.checkedInAt, dayAgo)) })
    .from(eventAttendees)
    .innerJoin(events, eq(events.id, eventAttendees.eventId))
    .where(managedEvents(admin));

const connectionStats = (admin: UserRow, now: Date) =>
  getDb()
    .select({
      accepted: countWhere(eq(connections.status, "accepted")),
      pending: countWhere(and(eq(connections.status, "pending"), notOver(now))),
    })
    .from(connections)
    .innerJoin(events, eq(events.id, connections.eventId))
    .where(managedEvents(admin));

const ZERO_EVENTS = { running: 0, upcoming: 0, draft: 0, ended: 0, archived: 0, test: 0 };
const ZERO_PEOPLE = { total: 0, test: 0, superAdmins: 0, joinedLast24h: 0 };

// A test admin sees the same numbers over test events and test people only (admin spec §7.8).
export async function adminStats({ user }: InputOf<typeof R.adminStats>): ResultOf<typeof R.adminStats> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - DAY_MS);
  const [[eventRow], [peopleRow], [checkInRow], [connectionRow]] = await Promise.all([
    eventStats(user, now),
    peopleStats(user, dayAgo),
    checkInStats(user, dayAgo),
    connectionStats(user, now),
  ]);
  return {
    body: {
      events: eventRow ?? ZERO_EVENTS,
      people: peopleRow ?? ZERO_PEOPLE,
      checkIns: checkInRow ?? { total: 0, last24h: 0 },
      connections: connectionRow ?? { accepted: 0, pending: 0 },
      asOf: now.toISOString(),
    },
  };
}
