// The super-admin list APIs against real data: paging, filters, sort, search and stats, as the seeded test admin.
// Run against a real-mode server (docs/testing/real-mode.md): E2E_BASE_URL, TEST_AUTOMATION_SECRET and, for the
// seeded-real-event check and SQL cleanup, a local DATABASE_URL.
import { expect, test } from "@playwright/test";
import type { z } from "zod";
import { AdminAttendeeList, AdminEventList, AdminStats, AdminUserList, type AdminStatsT, type TestUserT } from "../../lib/api/admin-schemas";
import { CreatedEvent } from "../../lib/api/schemas";
import type { RealModeClient } from "../../lib/testing/real-mode";
import { TEST_EVENT_SLUG } from "../fixtures/real-mode";
import { adminApi, harnessFor, ids, localSql, runPrefix, signInAsTestAdmin, sortedIds, type AdminApi, type Sql } from "./real-helpers";

type CreatedEventT = z.infer<typeof CreatedEvent>["event"];
type EventKey = "running" | "upcomingA" | "upcomingB" | "ended" | "draft" | "literal" | "archived";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const P = runPrefix();

// Names sort by their suffix in this order (digits before letters in every collation); `archived` comes last.
const EVENT_PLAN: { key: EventKey; suffix: string; start: number; end: number; status?: "draft" }[] = [
  { key: "literal", suffix: "50%_off", start: -HOUR, end: 2 * HOUR },
  { key: "running", suffix: "Alpha", start: -HOUR, end: HOUR },
  { key: "upcomingA", suffix: "Bravo", start: 2 * DAY, end: 3 * DAY },
  { key: "upcomingB", suffix: "Charlie", start: 2 * DAY, end: 4 * DAY },
  { key: "ended", suffix: "Delta", start: -3 * DAY, end: -2 * DAY },
  { key: "draft", suffix: "Echo", start: DAY, end: 2 * DAY, status: "draft" },
  { key: "archived", suffix: "Foxtrot", start: -HOUR, end: HOUR },
];
const VISIBLE: EventKey[] = ["literal", "running", "upcomingA", "upcomingB", "ended", "draft"];
const PEOPLE = [
  { first: "Ana", role: "user" },
  { first: "Bea", role: "user" },
  { first: "Cid", role: "super_admin" },
  { first: "Dan", role: "user" },
] as const;

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const query = (params: Record<string, string | number>): string =>
  new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();

test.describe("admin list APIs @real", () => {
  test.skip(!process.env.TEST_AUTOMATION_SECRET, "real mode needs TEST_AUTOMATION_SECRET");
  // One worker, in order: the stats deltas and the shared fixtures must not race the file's own tests.
  test.describe.configure({ mode: "default", timeout: 180_000 });

  let harness: RealModeClient;
  let api: AdminApi;
  let sql: Sql | null = null;
  const made = {} as Record<EventKey, CreatedEventT>;
  let people: TestUserT[] = [];
  let realSlug: string | null = null;

  const listEvents = (params: Record<string, string | number>) => api.get(`/api/admin/events?${query(params)}`, AdminEventList);
  const listUsers = (params: Record<string, string | number>) => api.get(`/api/admin/users?${query(params)}`, AdminUserList);
  const listAttendees = (params: Record<string, string | number>) =>
    api.get(`/api/admin/events/${TEST_EVENT_SLUG}/attendees?${query(params)}`, AdminAttendeeList);
  const stats = () => api.get("/api/admin/stats", AdminStats);
  const createEvent = (slug: string, name: string, start: number, end: number, status?: "draft") =>
    api.post(
      "/api/admin/events",
      { slug, name, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), isTest: true, ...(status ? { status } : {}) },
      CreatedEvent,
    );
  const archive = (slug: string) => api.raw("POST", `/api/admin/events/${slug}/archive`);
  const idsOf = (keys: EventKey[]): string[] => keys.map((key) => made[key].id).sort();

  test.beforeAll(async () => {
    harness = harnessFor(baseUrl);
    sql = localSql();
    api = adminApi(baseUrl, await signInAsTestAdmin(harness));
    const now = Date.now();
    for (const plan of EVENT_PLAN) {
      const { event } = await createEvent(`${P}-${plan.key.toLowerCase()}`, `${P} ${plan.suffix}`, now + plan.start, now + plan.end, plan.status);
      made[plan.key] = event;
    }
    expect((await archive(made.archived.slug)).status).toBe(200);
    people = await harness.createTestUsers({
      users: PEOPLE.map(({ first, role }) => ({ handle: `${P}-${first.toLowerCase()}`, name: `${first} Probe`, role })),
      checkInTo: TEST_EVENT_SLUG,
    });
    await seedRealEvent();
  });

  // A real (non-test) event the test admin must never see; only possible with direct SQL on a local database.
  async function seedRealEvent() {
    if (!sql) return;
    realSlug = `${P}-real`;
    const [admin] = await sql<{ id: string }[]>`select id from users where handle = 'codex-test-admin'`;
    if (!admin) throw new Error("codex-test-admin row missing");
    await sql`insert into events (slug, access_code, name, starts_at, ends_at, created_by, is_test)
      values (${realSlug}, ${`r${Math.random().toString(36).slice(2, 14).padEnd(12, "0")}`}, ${`${P} Real`}, now() - interval '1 hour', now() + interval '1 day', ${admin.id}, false)`;
  }

  test.afterAll(async () => {
    for (const person of people) await harness.deleteTestUser(person.id);
    if (sql) {
      await sql`delete from events where slug like ${`${P}-%`}`;
      await sql.end();
      return;
    }
    // shortcut: without a local DATABASE_URL the run's events stay behind, archived; delete them by hand if they pile up.
    const slugs = [...Object.values(made).map((event) => event.slug), `${P}-stats-r`, `${P}-stats-d`];
    if (Object.keys(made).length) for (const slug of slugs) await archive(slug);
  });

  test("q by run prefix returns exactly this run's events, archived ones only on request", async () => {
    const visible = await listEvents({ q: P });
    expect(visible.total).toBe(VISIBLE.length);
    expect(sortedIds(visible.events)).toEqual(idsOf(VISIBLE));

    const withArchived = await listEvents({ q: P, archived: "1" });
    expect(sortedIds(withArchived.events)).toEqual(idsOf([...VISIBLE, "archived"]));

    const onlyArchived = await listEvents({ q: P, status: "archived" });
    expect(ids(onlyArchived.events)).toEqual([made.archived.id]);
  });

  test("pages of 2 keep the total and cover every event exactly once", async () => {
    const full = await listEvents({ q: P, sort: "startsAt" });
    const seen: string[] = [];
    for (const page of [1, 2, 3]) {
      const result = await listEvents({ q: P, sort: "startsAt", pageSize: 2, page });
      expect(result).toMatchObject({ total: VISIBLE.length, page, pageSize: 2 });
      expect(result.events).toHaveLength(2);
      seen.push(...ids(result.events));
    }
    expect(seen).toEqual(ids(full.events));
    expect(new Set(seen).size).toBe(VISIBLE.length);

    const pastEnd = await listEvents({ q: P, pageSize: 2, page: 4 });
    expect(pastEnd).toMatchObject({ events: [], total: VISIBLE.length, page: 4 });
  });

  test("sorts by name both ways and by startsAt with the id tiebreak", async () => {
    const byName = VISIBLE.map((key) => made[key].id);
    expect(ids((await listEvents({ q: P, sort: "name" })).events)).toEqual(byName);
    expect(ids((await listEvents({ q: P, sort: "name", dir: "desc" })).events)).toEqual([...byName].reverse());

    // Same startsAt for upcomingA and upcomingB: the id decides, in the sort's direction.
    const visible = VISIBLE.map((key) => made[key]);
    const ascending = [...visible].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || (a.id < b.id ? -1 : 1));
    expect(made.upcomingA.startsAt).toBe(made.upcomingB.startsAt);
    expect(ids((await listEvents({ q: P, sort: "startsAt", dir: "asc" })).events)).toEqual(ids(ascending));
    expect(ids((await listEvents({ q: P })).events)).toEqual(ids(ascending).reverse());
  });

  test("phase filters return the right subset", async () => {
    const expected: Record<"running" | "upcoming" | "draft" | "ended" | "archived", EventKey[]> = {
      running: ["literal", "running"],
      upcoming: ["upcomingA", "upcomingB"],
      draft: ["draft"],
      ended: ["ended"],
      archived: ["archived"],
    };
    for (const [phase, keys] of Object.entries(expected)) {
      const result = await listEvents({ q: P, phase });
      expect(sortedIds(result.events), phase).toEqual(idsOf(keys));
      expect(result.total, phase).toBe(keys.length);
    }
    const running = (await listEvents({ q: P, phase: "running" })).events;
    expect(running.every((event) => event.isRunning)).toBe(true);
  });

  test("q matches % and _ literally and an access code exactly", async () => {
    expect((await listEvents({ q: `${P}%Alpha` })).total).toBe(0);
    expect((await listEvents({ q: `${P}_Alpha` })).total).toBe(0);
    expect(ids((await listEvents({ q: `${P} 50%_off` })).events)).toEqual([made.literal.id]);
    expect(ids((await listEvents({ q: `${P} 50%` })).events)).toEqual([made.literal.id]);

    const code = made.literal.accessCode;
    expect(ids((await listEvents({ q: code })).events)).toEqual([made.literal.id]);
    expect(ids((await listEvents({ q: code.toUpperCase() })).events)).toEqual([made.literal.id]);
    expect(ids((await listEvents({ q: code.slice(0, -1) })).events)).not.toContain(made.literal.id);
  });

  test("invalid list queries answer 400 invalid_input", async () => {
    const invalid: Record<string, string | number>[] = [{ sort: "bogus" }, { dir: "up" }, { pageSize: 0 }, { page: 0 }, { phase: "later" }];
    for (const bad of invalid) {
      expect(await api.errorCode("GET", `/api/admin/events?${query(bad)}`, 400), JSON.stringify(bad)).toBe("invalid_input");
    }
    expect(await api.errorCode("GET", "/api/admin/users?sort=bogus", 400)).toBe("invalid_input");
  });

  test("stats move by the expected deltas when events are created and archived", async () => {
    const delta = (after: AdminStatsT, before: AdminStatsT) => ({
      running: after.events.running - before.events.running,
      upcoming: after.events.upcoming - before.events.upcoming,
      draft: after.events.draft - before.events.draft,
      ended: after.events.ended - before.events.ended,
      archived: after.events.archived - before.events.archived,
      test: after.events.test - before.events.test,
    });
    const before = await stats();
    // A test admin sees test events only, so every event it counts is a test event.
    const { running, upcoming, draft, ended, archived } = before.events;
    expect(before.events.test).toBe(running + upcoming + draft + ended + archived);

    const now = Date.now();
    await createEvent(`${P}-stats-r`, `${P} Stats running`, now - HOUR, now + HOUR);
    await createEvent(`${P}-stats-d`, `${P} Stats draft`, now + DAY, now + 2 * DAY, "draft");
    const created = await stats();
    expect(delta(created, before)).toEqual({ running: 1, upcoming: 0, draft: 1, ended: 0, archived: 0, test: 2 });

    expect((await archive(`${P}-stats-r`)).status).toBe(200);
    const afterArchive = await stats();
    expect(delta(afterArchive, before)).toEqual({ running: 0, upcoming: 0, draft: 1, ended: 0, archived: 1, test: 2 });
    expect(Date.parse(afterArchive.asOf)).toBeGreaterThanOrEqual(Date.parse(before.asOf));
  });

  test("users: pages of 2 cover each once, role filter, sort by createdAt", async () => {
    const everyone = sortedIds(people);
    const first = await listUsers({ q: P, limit: 2 });
    const second = await listUsers({ q: P, limit: 2, page: 2 });
    const third = await listUsers({ q: P, limit: 2, page: 3 });
    expect([first.total, second.total, third.total]).toEqual([4, 4, 4]);
    expect(third.users).toEqual([]);
    const seen = [...ids(first.users), ...ids(second.users)];
    expect(new Set(seen).size).toBe(4);
    expect([...seen].sort()).toEqual(everyone);
    expect(first.users.map((user) => user.name)).toEqual(["Ana Probe", "Bea Probe"]);

    const admins = await listUsers({ q: P, role: "super_admin" });
    expect(admins.users.map((user) => user.handle)).toEqual([`${P}-cid`]);
    const regular = await listUsers({ q: P, role: "user" });
    expect(regular.users.map((user) => user.handle).sort()).toEqual([`${P}-ana`, `${P}-bea`, `${P}-dan`]);

    const newest = (await listUsers({ q: P, sort: "createdAt" })).users;
    const times = newest.map((user) => Date.parse(user.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(ids((await listUsers({ q: P, sort: "createdAt", dir: "asc" })).users)).toEqual(ids(newest).reverse());
  });

  test("attendees of the test event: total, paging, sort by name and q", async () => {
    const all = await listAttendees({});
    expect(all.total).toBeGreaterThanOrEqual(PEOPLE.length);
    expect(all.attendees).toHaveLength(all.total);
    expect(all.counts.attendees).toBe(all.total);

    const mine = await listAttendees({ q: P, sort: "name" });
    expect(mine.total).toBe(PEOPLE.length);
    expect(mine.attendees.map((row) => row.user.name)).toEqual(PEOPLE.map(({ first }) => `${first} Probe`));
    // The harness checks in over the automation header, with no admin user, so these read as self check-ins.
    expect((await listAttendees({ q: P, source: "self" })).total).toBe(PEOPLE.length);
    expect((await listAttendees({ q: P, source: "admin" })).total).toBe(0);
    const reversed = await listAttendees({ q: P, sort: "name", dir: "desc" });
    expect(reversed.attendees.map((row) => row.user.id)).toEqual(mine.attendees.map((row) => row.user.id).reverse());

    const pages = await Promise.all([1, 2, 3].map((page) => listAttendees({ q: P, sort: "name", pageSize: 2, page })));
    expect(pages.map((page) => page.total)).toEqual([4, 4, 4]);
    expect(pages.map((page) => page.attendees.length)).toEqual([2, 2, 0]);
    expect(pages.flatMap((page) => page.attendees.map((row) => row.user.id))).toEqual(mine.attendees.map((row) => row.user.id));

    const bea = await listAttendees({ q: `${P}-bea` });
    expect(bea.attendees.map((row) => row.user.handle)).toEqual([`${P}-bea`]);
  });

  test("a super admin cannot delete its own account", async () => {
    const cid = people.find((person) => person.handle === `${P}-cid`);
    if (!cid) throw new Error("throwaway admin not created");
    expect(cid.role).toBe("super_admin");
    const asCid = adminApi(baseUrl, await harness.signInAs(cid));
    await asCid.get("/api/admin/stats", AdminStats);
    expect(await asCid.errorCode("DELETE", `/api/admin/test-users/${cid.id}`, 409)).toBe("cannot_delete_self");
    // Still there: the automation cleanup in afterAll deletes it.
    expect((await harness.listTestUsers(`${P}-cid`)).map((user) => user.id)).toEqual([cid.id]);
  });

  test("the test admin never sees real events or real people", async () => {
    expect((await listEvents({ test: "exclude", archived: "1" })).total).toBe(0);
    expect((await listUsers({ test: "exclude" })).total).toBe(0);
    const everything = await listEvents({ archived: "1", pageSize: 200 });
    expect(everything.events.every((event) => event.isTest)).toBe(true);

    test.skip(!realSlug, "seeding a real event needs a local DATABASE_URL");
    expect(ids((await listEvents({ q: `${P} Real`, archived: "1" })).events)).toEqual([]);
    expect(await api.errorCode("GET", `/api/admin/events/${realSlug}`, 404)).toBe("event_not_found");
  });
});
