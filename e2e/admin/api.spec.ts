// Every admin API route in real mode (API spec A11, flows F-55..F-57): success, invalid input, unknown slug or id, and the
// 404 `not_found` a stranger, a plain test user or a wrong automation secret meets. Acts as the seeded @codex-test-admin.
import { AddedAttendee, AdminAttendeeList, AdminEventBody, AdminEventList, AdminUserList, OrganizerBody, OrganizerList, TestSession, TestUserList } from "../../lib/api/admin-schemas";
import { AUTOMATION_HEADER } from "../../lib/api/automation";
import { CreatedEvent, RotatedCode } from "../../lib/api/schemas";
import { TEST_EVENT_SLUG } from "../fixtures";
import { codeOf, eventBody, expect, expectError, expectHidden, test, UNKNOWN_ID, UNKNOWN_SLUG, uniqueSlug } from "./helpers";

const SECRET = process.env.TEST_AUTOMATION_SECRET ?? "";
const WRONG_SECRET = "x".repeat(48);

// One request per admin route; the slug and user id are filled in per test.
const everyRoute = (slug: string, userId: string) =>
  [
    ["GET", "/api/admin/events"],
    ["POST", "/api/admin/events"],
    ["GET", `/api/admin/events/${slug}`],
    ["PATCH", `/api/admin/events/${slug}`],
    ["POST", `/api/admin/events/${slug}/end`],
    ["POST", `/api/admin/events/${slug}/archive`],
    ["POST", `/api/admin/events/${slug}/rotate-code`],
    ["GET", `/api/admin/events/${slug}/attendees`],
    ["POST", `/api/admin/events/${slug}/attendees`],
    ["DELETE", `/api/admin/events/${slug}/attendees/${userId}`],
    ["GET", `/api/admin/events/${slug}/organizers`],
    ["POST", `/api/admin/events/${slug}/organizers`],
    ["DELETE", `/api/admin/events/${slug}/organizers/${userId}`],
    ["GET", "/api/admin/users"],
    ["GET", "/api/admin/test-users"],
    ["POST", "/api/admin/test-users"],
    ["DELETE", `/api/admin/test-users/${userId}`],
    ["POST", `/api/admin/test-users/${userId}/session`],
  ] as const;

// Valid bodies, so a 404 can only come from the gate and never from validation.
const bodyFor = (method: string, path: string, userId: string, slug: string): unknown => {
  if (method !== "POST" && method !== "PATCH") return undefined;
  if (path === "/api/admin/events") return eventBody(slug);
  if (path === "/api/admin/test-users") return { count: 1 };
  if (method === "PATCH") return { name: "Nope" };
  return { userId };
};

test.describe("admin API: who gets in @real", () => {
  test("a signed-out caller gets 404 not_found on every admin route @real", async ({ anonApi, events }) => {
    const event = await events.create();
    for (const [method, path] of everyRoute(event.slug, UNKNOWN_ID)) {
      await expectHidden(await anonApi.fetch(path, { method, data: bodyFor(method, path, UNKNOWN_ID, uniqueSlug()) }));
    }
  });

  test("a plain test user gets 404 not_found on every admin route and changes nothing @real", async ({ userApi, adminApi, events }) => {
    const event = await events.create();
    for (const [method, path] of everyRoute(event.slug, UNKNOWN_ID)) {
      await expectHidden(await userApi.fetch(path, { method, data: bodyFor(method, path, UNKNOWN_ID, uniqueSlug()) }));
    }
    const after = AdminEventBody.parse(await (await adminApi.get(`/api/admin/events/${event.slug}`)).json()).event;
    expect(after).toMatchObject({ name: event.name, status: "live", accessCode: event.accessCode });
  });

  test("a wrong automation secret opens nothing; the right one opens only the test-user routes @real", async ({ anonApi }) => {
    const wrong = { [AUTOMATION_HEADER]: WRONG_SECRET };
    await expectHidden(await anonApi.get("/api/admin/test-users", { headers: wrong }));
    await expectHidden(await anonApi.post("/api/admin/test-users", { headers: wrong, data: { count: 1 } }));
    await expectHidden(await anonApi.delete(`/api/admin/test-users/${UNKNOWN_ID}`, { headers: wrong }));
    await expectHidden(await anonApi.post(`/api/admin/test-users/${UNKNOWN_ID}/session`, { headers: wrong }));
    const right = { [AUTOMATION_HEADER]: SECRET };
    expect((await anonApi.get("/api/admin/test-users?limit=1", { headers: right })).status()).toBe(200);
    await expectHidden(await anonApi.get("/api/admin/events", { headers: right }));
    await expectHidden(await anonApi.get("/api/admin/users", { headers: right }));
  });
});

test.describe("admin API: events @real", () => {
  test("GET /api/admin/events lists test events only, archived ones on request @real", async ({ adminApi, events }) => {
    const archived = await events.create();
    expect((await adminApi.post(`/api/admin/events/${archived.slug}/archive`)).status()).toBe(200);
    const active = AdminEventList.parse(await (await adminApi.get("/api/admin/events")).json()).events;
    expect(active.map((event) => event.slug)).toContain(TEST_EVENT_SLUG);
    expect(active.every((event) => event.isTest)).toBe(true);
    expect(active.map((event) => event.slug)).not.toContain(archived.slug);
    const withArchived = AdminEventList.parse(await (await adminApi.get("/api/admin/events?archived=1")).json()).events;
    expect(withArchived.map((event) => event.slug)).toContain(archived.slug);
    const onlyArchived = AdminEventList.parse(await (await adminApi.get("/api/admin/events?status=archived")).json()).events;
    expect(onlyArchived.every((event) => event.status === "archived")).toBe(true);
    await expectError(await adminApi.get("/api/admin/events?archived=2"), 400, "invalid_input");
    await expectError(await adminApi.get("/api/admin/events?status=bogus"), 400, "invalid_input");
  });

  test("POST /api/admin/events creates a test event, rejects bad input and a taken slug @real", async ({ adminApi, events }) => {
    const slug = uniqueSlug();
    events.track(slug);
    const created = await adminApi.post("/api/admin/events", { data: { ...eventBody(slug), isTest: false, venueName: "Lab" } });
    expect(created.status(), await created.text()).toBe(201);
    const { event } = CreatedEvent.parse(await created.json());
    expect(event.slug).toBe(slug);
    expect(event.joinUrl).toContain(`/e/${event.accessCode}`);
    // A test super admin only ever makes test events, whatever the body says.
    const read = AdminEventBody.parse(await (await adminApi.get(`/api/admin/events/${slug}`)).json()).event;
    expect(read).toMatchObject({ isTest: true, venueName: "Lab", status: "live" });

    await expectError(await adminApi.post("/api/admin/events", { data: { ...eventBody(uniqueSlug()), name: "" } }), 400, "invalid_input");
    await expectError(await adminApi.post("/api/admin/events", { data: { ...eventBody(uniqueSlug()), slug: "Bad Slug!" } }), 400, "invalid_input");
    const backwards = { ...eventBody(uniqueSlug()), endsAt: new Date(Date.now() - 2 * 3_600_000).toISOString() };
    await expectError(await adminApi.post("/api/admin/events", { data: backwards }), 400, "invalid_input");
    await expectError(await adminApi.post("/api/admin/events", { data: { ...eventBody(uniqueSlug()), timezone: "Mars/Olympus" } }), 400, "invalid_input");
    await expectError(await adminApi.post("/api/admin/events", { data: { ...eventBody(uniqueSlug()), websiteUrl: "ftp://x" } }), 400, "invalid_input");
    await expectError(await adminApi.post("/api/admin/events", { data: eventBody(TEST_EVENT_SLUG) }), 409, "slug_taken");
    await expectError(await adminApi.post("/api/admin/events", { data: eventBody(slug) }), 409, "slug_taken");
  });

  test("GET and PATCH /api/admin/events/{slug}: read, edit, clear, refuse a backwards window @real", async ({ adminApi, events }) => {
    const event = await events.create();
    const path = `/api/admin/events/${event.slug}`;
    const read = AdminEventBody.parse(await (await adminApi.get(path)).json()).event;
    expect(read).toMatchObject({ slug: event.slug, name: event.name, isRunning: true, counts: { attendees: 0, connections: 0, pending: 0, organizers: 0 } });

    const patched = await adminApi.patch(path, { data: { name: "E2E renamed", city: "Guadalajara", websiteUrl: "https://example.com" } });
    expect(patched.status(), await patched.text()).toBe(200);
    expect(AdminEventBody.parse(await patched.json()).event).toMatchObject({ name: "E2E renamed", city: "Guadalajara", websiteUrl: "https://example.com" });
    const cleared = AdminEventBody.parse(await (await adminApi.patch(path, { data: { city: null } })).json()).event;
    expect(cleared.city).toBeNull();

    await expectError(await adminApi.patch(path, { data: { endsAt: new Date(Date.parse(read.startsAt) - 3_600_000).toISOString() } }), 400, "invalid_input");
    await expectError(await adminApi.patch(path, { data: { name: "" } }), 400, "invalid_input");
    await expectError(await adminApi.patch(path, { data: { status: "gone" } }), 400, "invalid_input");
    await expectError(await adminApi.get(`/api/admin/events/${UNKNOWN_SLUG}`), 404, "event_not_found");
    await expectError(await adminApi.patch(`/api/admin/events/${UNKNOWN_SLUG}`, { data: { name: "x" } }), 404, "event_not_found");
    await expectError(await adminApi.get("/api/admin/events/BAD_SLUG"), 400, "invalid_input");
  });

  test("rotate-code issues a new code and the old door stops opening @real", async ({ adminApi, anonApi, events }) => {
    const event = await events.create();
    expect((await anonApi.get(`/api/e/${event.accessCode}`)).status()).toBe(200);
    const response = await adminApi.post(`/api/admin/events/${event.slug}/rotate-code`);
    expect(response.status(), await response.text()).toBe(200);
    const rotated = RotatedCode.parse(await response.json());
    expect(rotated.slug).toBe(event.slug);
    expect(rotated.accessCode).not.toBe(event.accessCode);
    expect(codeOf(rotated.joinUrl)).toBe(rotated.accessCode);
    await expectError(await anonApi.get(`/api/e/${event.accessCode}`), 404, "event_not_found");
    expect((await anonApi.get(`/api/e/${rotated.accessCode}`)).status()).toBe(200);
    await expectError(await adminApi.post(`/api/admin/events/${UNKNOWN_SLUG}/rotate-code`), 404, "event_not_found");
  });

  test("end closes the window now @real", async ({ adminApi, events }) => {
    const event = await events.create();
    const response = await adminApi.post(`/api/admin/events/${event.slug}/end`);
    expect(response.status(), await response.text()).toBe(200);
    const ended = AdminEventBody.parse(await response.json()).event;
    expect(ended).toMatchObject({ status: "ended", isRunning: false });
    expect(Date.parse(ended.endsAt)).toBeLessThanOrEqual(Date.now() + 1_000);
    await expectError(await adminApi.post(`/api/admin/events/${UNKNOWN_SLUG}/end`), 404, "event_not_found");
  });

  test("archive soft-deletes: the door 404s, the admin can still read it @real", async ({ adminApi, anonApi, events }) => {
    const event = await events.create();
    const response = await adminApi.post(`/api/admin/events/${event.slug}/archive`);
    expect(response.status(), await response.text()).toBe(200);
    expect(AdminEventBody.parse(await response.json()).event).toMatchObject({ status: "archived", isRunning: false });
    await expectError(await anonApi.get(`/api/e/${event.accessCode}`), 404, "event_not_found");
    expect((await adminApi.get(`/api/admin/events/${event.slug}`)).status()).toBe(200);
    await expectError(await adminApi.post(`/api/admin/events/${UNKNOWN_SLUG}/archive`), 404, "event_not_found");
  });
});

test.describe("admin API: attendees and organizers @real", () => {
  test("attendees: check in on someone's behalf (repeat-safe), list, remove @real", async ({ adminApi, events, testUsers }) => {
    const event = await events.create();
    const [person] = await testUsers(1);
    if (!person) throw new Error("test user not created");
    const base = `/api/admin/events/${event.slug}/attendees`;

    const first = await adminApi.post(base, { data: { userId: person.id } });
    expect(first.status(), await first.text()).toBe(201);
    expect(AddedAttendee.parse(await first.json())).toMatchObject({ alreadyCheckedIn: false, attendee: { addedByAdmin: true, user: { id: person.id } } });
    const again = await adminApi.post(base, { data: { userId: person.id } });
    expect(again.status()).toBe(200);
    expect(AddedAttendee.parse(await again.json()).alreadyCheckedIn).toBe(true);

    const list = AdminAttendeeList.parse(await (await adminApi.get(base)).json());
    expect(list.attendees.map((attendee) => attendee.user.id)).toEqual([person.id]);
    expect(list.counts).toMatchObject({ attendees: 1, testUsers: 1 });

    expect((await adminApi.delete(`${base}/${person.id}`)).status()).toBe(204);
    await expectError(await adminApi.delete(`${base}/${person.id}`), 404, "attendee_not_found");
    await expectError(await adminApi.post(base, { data: { userId: "not-a-uuid" } }), 400, "invalid_input");
    await expectError(await adminApi.post(base, { data: { userId: UNKNOWN_ID } }), 404, "user_not_found");
    await expectError(await adminApi.delete(`${base}/${UNKNOWN_ID}`), 404, "user_not_found");
    await expectError(await adminApi.get(`/api/admin/events/${UNKNOWN_SLUG}/attendees`), 404, "event_not_found");
    await expectError(await adminApi.post(`/api/admin/events/${UNKNOWN_SLUG}/attendees`, { data: { userId: person.id } }), 404, "event_not_found");
  });

  test("organizers: assign, change role, list, remove @real", async ({ adminApi, events, testUsers }) => {
    const event = await events.create();
    const [person] = await testUsers(1);
    if (!person) throw new Error("test user not created");
    const base = `/api/admin/events/${event.slug}/organizers`;

    const assigned = await adminApi.post(base, { data: { userId: person.id } });
    expect(assigned.status(), await assigned.text()).toBe(200);
    expect(OrganizerBody.parse(await assigned.json()).organizer).toMatchObject({ role: "organizer", user: { id: person.id } });
    const promoted = OrganizerBody.parse(await (await adminApi.post(base, { data: { userId: person.id, role: "staff" } })).json());
    expect(promoted.organizer.role).toBe("staff");
    const list = OrganizerList.parse(await (await adminApi.get(base)).json()).organizers;
    expect(list.map(({ user, role }) => [user.id, role])).toEqual([[person.id, "staff"]]);

    expect((await adminApi.delete(`${base}/${person.id}`)).status()).toBe(204);
    await expectError(await adminApi.delete(`${base}/${person.id}`), 404, "user_not_found");
    await expectError(await adminApi.post(base, { data: { userId: person.id, role: "king" } }), 400, "invalid_input");
    await expectError(await adminApi.post(base, { data: { userId: UNKNOWN_ID } }), 404, "user_not_found");
    await expectError(await adminApi.get(`/api/admin/events/${UNKNOWN_SLUG}/organizers`), 404, "event_not_found");
  });
});

test.describe("admin API: people and test users @real", () => {
  test("GET /api/admin/users searches test people only for a test admin @real", async ({ adminApi, testUsers }) => {
    const [person] = await testUsers(1);
    if (!person) throw new Error("test user not created");
    const found = AdminUserList.parse(await (await adminApi.get(`/api/admin/users?q=${person.handle}`)).json()).users;
    expect(found.map((user) => user.id)).toEqual([person.id]);
    expect(found[0]).toMatchObject({ isTest: true, role: "user", email: `${person.handle}@test.compa.lol` });
    const realOnly = AdminUserList.parse(await (await adminApi.get("/api/admin/users?test=exclude")).json()).users;
    expect(realOnly).toEqual([]);
    const limited = AdminUserList.parse(await (await adminApi.get("/api/admin/users?limit=1")).json()).users;
    expect(limited.length).toBeLessThanOrEqual(1);
    await expectError(await adminApi.get("/api/admin/users?limit=0"), 400, "invalid_input");
    await expectError(await adminApi.get("/api/admin/users?test=bogus"), 400, "invalid_input");
    await expectError(await adminApi.get(`/api/admin/users?q=${"a".repeat(81)}`), 400, "invalid_input");
  });

  test("test users: create, list, sign in as, delete; bad input and unknown ids @real", async ({ adminApi, anonApi, realMode }) => {
    const prefix = `e2e-adm-${Math.random().toString(36).slice(2, 8)}`;
    const created = await adminApi.post("/api/admin/test-users", { data: { users: [{ name: "E2E Admin Probe", handle: `${prefix}-probe` }], checkInTo: TEST_EVENT_SLUG } });
    expect(created.status(), await created.text()).toBe(201);
    const [user] = TestUserList.parse(await created.json()).users;
    if (!user) throw new Error("no user created");
    try {
      expect(user).toMatchObject({ handle: `${prefix}-probe`, isTest: true, currentEvent: { name: expect.any(String) } });
      const listed = TestUserList.parse(await (await adminApi.get(`/api/admin/test-users?handlePrefix=${prefix}`)).json()).users;
      expect(listed.map((row) => row.id)).toEqual([user.id]);

      const session = await anonApi.post(`/api/admin/test-users/${user.id}/session`, { headers: { [AUTOMATION_HEADER]: SECRET } });
      expect(session.status(), await session.text()).toBe(200);
      expect(TestSession.parse(await session.json()).user.id).toBe(user.id);
      expect(session.headersArray().some(({ name }) => name.toLowerCase() === "set-cookie")).toBe(true);

      await expectError(await adminApi.post("/api/admin/test-users", { data: { count: 0 } }), 400, "invalid_input");
      await expectError(await adminApi.post("/api/admin/test-users", { data: { count: 51 } }), 400, "invalid_input");
      await expectError(await adminApi.post("/api/admin/test-users", { data: { count: 1, preset: "astronaut" } }), 400, "invalid_input");
      await expectError(await adminApi.post("/api/admin/test-users", { data: { count: 1, checkInTo: UNKNOWN_SLUG } }), 404, "event_not_found");
      await expectError(await adminApi.post("/api/admin/test-users", { data: { users: [{ handle: `${prefix}-probe` }] } }), 409, "handle_taken");
      await expectError(await adminApi.get("/api/admin/test-users?handlePrefix=BAD!"), 400, "invalid_input");
      await expectError(await adminApi.delete("/api/admin/test-users/not-a-uuid"), 400, "invalid_input");
      await expectError(await adminApi.delete(`/api/admin/test-users/${UNKNOWN_ID}`), 404, "test_user_not_found");
      await expectError(await adminApi.post(`/api/admin/test-users/${UNKNOWN_ID}/session`), 404, "test_user_not_found");

      expect((await adminApi.delete(`/api/admin/test-users/${user.id}`)).status()).toBe(204);
      await expectError(await adminApi.delete(`/api/admin/test-users/${user.id}`), 404, "test_user_not_found");
    } finally {
      await realMode.deleteTestUser(user.id).catch(() => undefined);
    }
  });
});
