// API contract in real mode, generated from lib/api/routes.ts: 401 without a session, the super-admin 404 gate,
// 400 invalid_input for malformed params, bodies and queries, 404 for unknown ids, handles and codes, and the
// per-user 429 limits (lib/api/rate-limits.ts). Runs against the local test project only (docs/testing/real-mode.md).
import type { APIRequestContext } from "@playwright/test";
import { E } from "../../lib/api/errors";
import * as X from "../../lib/api/examples";
import { LIMITS } from "../../lib/api/rate-limits";
import type { AnyRouteSpec } from "../../lib/api/route-spec";
import * as R from "../../lib/api/routes";
import type { TestUserT } from "../../lib/api/admin-schemas";
import type { RealModeClient } from "../../lib/testing/real-mode";
import { expect, test, TEST_EVENT_SLUG } from "../fixtures";
import {
  adminSession,
  automationHeaders,
  burstUntilLimited,
  call,
  expectError,
  isAdminRoute,
  label,
  MALFORMED_PARAMS,
  mockHeaders,
  ONCE_REASON,
  paramsWith,
  pathFor,
  randomUuid,
  rejectedParams,
  ROUTES,
  runsOnce,
  sessionHeaders,
} from "./helpers";

const unique = (prefix: string): string => `${prefix}-${randomUuid().slice(0, 8)}`;
const JSON_HEADERS = { "Content-Type": "application/json" };


const userRoutes = ROUTES.filter((spec) => spec.auth === "user");
const adminRoutes = ROUTES.filter(isAdminRoute);
const jsonBodyRoutes = ROUTES.filter((spec) => spec.bodyKind === "json" && !isAdminRoute(spec));
const malformedParamRoutes = ROUTES.filter((spec) => !isAdminRoute(spec) && rejectedParams(spec).length > 0);

test.describe("API contract, real mode", () => {
  test.beforeEach(({}, testInfo) => test.skip(!runsOnce(testInfo), ONCE_REASON));

  test.describe("401 without a session", () => {
    for (const spec of userRoutes) {
      test(`${label(spec)} answers 401 unauthorized @real`, async ({ request }) => {
        const response = await call(request, spec);
        await expectError(response, 401, E.unauthorized.code);
        expect(response.headers()["x-request-id"]).toBeTruthy();
      });
    }
  });

  test.describe("super-admin routes look like any unknown path (A11)", () => {
    for (const spec of adminRoutes) {
      test(`${label(spec)} answers 404 not_found to strangers and plain users @real`, async ({ request, realUser }) => {
        await expectError(await call(request, spec), 404, E.notFound.code);
        await expectError(await call(request, spec, { headers: sessionHeaders(realUser.session.cookieHeader) }), 404, E.notFound.code);
        // A wrong automation secret is no key either, and per-request mocks never serve admin routes in real mode.
        await expectError(await call(request, spec, { headers: { "x-compa-automation": "x".repeat(40) } }), 404, E.notFound.code);
        await expectError(await call(request, spec, { headers: mockHeaders() }), 404, E.notFound.code);
        await expectError(await call(request, spec, { path: `${pathFor(spec)}?mock=1` }), 404, E.notFound.code);
      });
    }
  });

  test.describe("400 invalid_input for a malformed path param", () => {
    for (const spec of malformedParamRoutes) {
      // Signed in: auth is checked before params, so an anonymous caller meets 401 first.
      test(`${label(spec)} rejects ${rejectedParams(spec).join(", ")} @real`, async ({ request, realUser }) => {
        const headers = sessionHeaders(realUser.session.cookieHeader);
        for (const name of rejectedParams(spec)) {
          const path = pathFor(spec, paramsWith(spec, { [name]: MALFORMED_PARAMS[name] ?? "" }));
          const body = await expectError(await call(request, spec, { path, headers }), 400, E.invalidInput.code);
          expect(Object.keys(body.error.fields ?? {})).toContain(name);
        }
      });
    }
  });

  test.describe("400 invalid_input for a malformed body", () => {
    for (const spec of jsonBodyRoutes) {
      test(`${label(spec)} rejects a non-object and a non-JSON body @real`, async ({ request, realUser }) => {
        const headers = { ...JSON_HEADERS, ...sessionHeaders(realUser.session.cookieHeader) };
        const wrongShape = await expectError(await call(request, spec, { headers, data: Buffer.from("42") }), 400, E.invalidInput.code);
        expect(wrongShape.error.fields).toBeTruthy();
        const notJson = await expectError(await call(request, spec, { headers, data: Buffer.from("{not json") }), 400, E.invalidInput.code);
        expect(notJson.error.message).toBe("The body must be JSON.");
      });
    }
  });

  test("leaderboard rejects an unknown scope and an out-of-range limit @real", async ({ request, testEvent }) => {
    const base = pathFor(R.leaderboard, { code: testEvent.accessCode });
    for (const query of ["scope=galaxy", "limit=0", "limit=101", "limit=many"]) {
      await expectError(await call(request, R.leaderboard, { path: `${base}?${query}` }), 400, E.invalidInput.code);
    }
  });

  test.describe("404 for unknown ids, handles and codes", () => {
    type Who = "anonymous" | "user" | "fresh" | "admin" | "automation";
    type Case = { spec: AnyRouteSpec; code: string; who: Who; params?: Record<string, string>; data?: unknown; title?: string };

    const missingSlug = { slug: "no-such-event-e2e" };
    const CASES: Case[] = [
      { spec: R.getUser, code: E.userNotFound.code, who: "user", params: { handle: unique("nobody") } },
      { spec: R.getEvent, code: E.eventNotFound.code, who: "anonymous", params: { code: "zzzzzzzz00" } },
      { spec: R.getEvent, code: E.eventNotFound.code, who: "anonymous", params: { code: "Not A Code!" }, title: "a malformed code gets the same 404 (A10)" },
      { spec: R.liveSnapshot, code: E.eventNotFound.code, who: "anonymous", params: { code: "zzzzzzzz00" } },
      { spec: R.leaderboard, code: E.eventNotFound.code, who: "anonymous", params: { code: "zzzzzzzz00" } },
      { spec: R.livePerson, code: E.eventNotFound.code, who: "anonymous", params: { code: "zzzzzzzz00", userId: randomUuid() } },
      { spec: R.checkIn, code: E.eventNotFound.code, who: "user", params: { code: "zzzzzzzz00" }, data: { screenConsent: true } },
      { spec: R.createConnection, code: E.userNotFound.code, who: "fresh", data: { toHandle: unique("nobody"), screenConsent: true } },
      { spec: R.getConnection, code: E.connectionNotFound.code, who: "user", params: { id: randomUuid() } },
      { spec: R.setKnew, code: E.connectionNotFound.code, who: "user", params: { id: randomUuid() }, data: { knew: true } },
      { spec: R.acceptConnection, code: E.connectionNotFound.code, who: "user", params: { id: randomUuid() }, data: {} },
      { spec: R.declineConnection, code: E.connectionNotFound.code, who: "user", params: { id: randomUuid() } },
      { spec: R.draftSummary, code: E.notFound.code, who: "fresh", data: { connectionId: randomUuid(), text: "Hablamos de su serie A." } },
      { spec: R.approveSummary, code: E.notFound.code, who: "user", params: { id: randomUuid() }, data: X.approveBody },
      { spec: R.claimInvite, code: E.notFound.code, who: "user", params: { code: unique("nobody") } },
      { spec: R.getAdminEvent, code: E.eventNotFound.code, who: "admin", params: missingSlug },
      { spec: R.patchAdminEvent, code: E.eventNotFound.code, who: "admin", params: missingSlug, data: { venueName: "Nowhere" } },
      { spec: R.endAdminEvent, code: E.eventNotFound.code, who: "admin", params: missingSlug },
      { spec: R.archiveAdminEvent, code: E.eventNotFound.code, who: "admin", params: missingSlug },
      { spec: R.rotateEventCode, code: E.eventNotFound.code, who: "admin", params: missingSlug },
      { spec: R.listAttendees, code: E.eventNotFound.code, who: "admin", params: missingSlug },
      { spec: R.addAttendee, code: E.eventNotFound.code, who: "admin", params: missingSlug, data: { userId: randomUuid() } },
      { spec: R.addAttendee, code: E.userNotFound.code, who: "admin", params: { slug: TEST_EVENT_SLUG }, data: { userId: randomUuid() } },
      { spec: R.removeAttendee, code: E.eventNotFound.code, who: "admin", params: { ...missingSlug, userId: randomUuid() } },
      { spec: R.removeAttendee, code: E.userNotFound.code, who: "admin", params: { slug: TEST_EVENT_SLUG, userId: randomUuid() } },
      { spec: R.listOrganizers, code: E.eventNotFound.code, who: "admin", params: missingSlug },
      { spec: R.setOrganizer, code: E.eventNotFound.code, who: "admin", params: missingSlug, data: { userId: randomUuid(), role: "owner" } },
      { spec: R.setOrganizer, code: E.userNotFound.code, who: "admin", params: { slug: TEST_EVENT_SLUG }, data: { userId: randomUuid(), role: "owner" } },
      { spec: R.removeOrganizer, code: E.eventNotFound.code, who: "admin", params: { ...missingSlug, userId: randomUuid() } },
      { spec: R.removeOrganizer, code: E.userNotFound.code, who: "admin", params: { slug: TEST_EVENT_SLUG, userId: randomUuid() } },
      { spec: R.createTestUsers, code: E.eventNotFound.code, who: "automation", data: { count: 1, checkInTo: missingSlug.slug } },
      { spec: R.deleteTestUser, code: E.testUserNotFound.code, who: "automation", params: { id: randomUuid() } },
      { spec: R.createTestSession, code: E.testUserNotFound.code, who: "automation", params: { id: randomUuid() } },
    ];

    // 404s that need a person in a given state get their own tests below.
    const ELSEWHERE = new Set([`${R.livePerson.id} ${E.attendeeNotFound.code}`, `${R.removeAttendee.id} ${E.attendeeNotFound.code}`]);

    test("every documented 404 has a case (the admin gate's not_found is covered above) @real", () => {
      const covered = new Set([...CASES.map(({ spec, code }) => `${spec.id} ${code}`), ...ELSEWHERE]);
      const documented = ROUTES.flatMap((spec) =>
        spec.errors.filter((error) => error.status === 404 && !(isAdminRoute(spec) && error.code === E.notFound.code)).map((error) => `${spec.id} ${error.code}`),
      );
      expect(documented.filter((key) => !covered.has(key))).toEqual([]);
    });

    for (const { spec, code, who, params = {}, data, title } of CASES) {
      test(`${label(spec)} answers 404 ${code} ${title ?? `(${who})`} @real`, async ({ request, realMode, testUsers }) => {
        const attempt = async () => {
          const headers = await headersFor(who, { realMode, testUsers, request });
          const response = await call(request, spec, { path: pathFor(spec, paramsWith(spec, params)), headers: { ...JSON_HEADERS, ...headers }, data });
          await expectError(response, 404, code);
        };
        // A parallel sign-in as the shared test admin can revoke this one: retry with a new session (the code stays exact).
        if (who === "admin") await expect(attempt).toPass({ timeout: 30_000 });
        else await attempt();
      });
    }

    async function headersFor(who: Who, { realMode, testUsers, request }: { realMode: RealModeClient; testUsers: (count: number) => Promise<TestUserT[]>; request: APIRequestContext }): Promise<Record<string, string>> {
      if (who === "anonymous") return {};
      if (who === "automation") return automationHeaders();
      if (who === "admin") return sessionHeaders((await adminSession(realMode, request)).cookieHeader);
      // "user" and "fresh" both get a fresh test user: it keeps rate counters and data of tests apart.
      const [user] = await testUsers(1);
      if (!user) throw new Error("test user not created");
      return sessionHeaders((await realMode.signInAs(user)).cookieHeader);
    }

    test("GET /api/e/{code}/live/people/{userId} answers 404 attendee_not_found for someone not at the event @real", async ({ request, testEvent }) => {
      const path = pathFor(R.livePerson, { code: testEvent.accessCode, userId: randomUuid() });
      await expectError(await call(request, R.livePerson, { path }), 404, E.attendeeNotFound.code);
    });

    test("DELETE attendee answers 204, then 404 attendee_not_found once the person is gone @real", async ({ request, realMode, testUsers }) => {
      const [person] = await testUsers(1);
      if (!person) throw new Error("test user not created");
      const path = pathFor(R.removeAttendee, { slug: TEST_EVENT_SLUG, userId: person.id });
      const asAdmin = async () => call(request, R.removeAttendee, { path, headers: sessionHeaders((await adminSession(realMode, request)).cookieHeader) });
      // Retried like the cases above: a revoked admin session answers the gate's not_found and changes nothing.
      await expect(async () => expect((await asAdmin()).status()).toBe(204)).toPass({ timeout: 30_000 });
      await expect(async () => expectError(await asAdmin(), 404, E.attendeeNotFound.code)).toPass({ timeout: 30_000 });
    });
  });

  test.describe("per-user rate limits answer 429 rate_limited with Retry-After", () => {
    type Burst = { spec: AnyRouteSpec; limit: number; send: (request: APIRequestContext, cookie: string) => ReturnType<typeof call> };
    const BURSTS: Burst[] = [
      {
        spec: R.createConnection,
        limit: LIMITS.scanPerMinute.limit,
        send: (request, cookie) => call(request, R.createConnection, { headers: { ...JSON_HEADERS, cookie }, data: { toHandle: "nobody-at-all", screenConsent: true } }),
      },
      {
        spec: R.draftSummary,
        limit: LIMITS.draftPerMinute.limit,
        send: (request, cookie) => call(request, R.draftSummary, { headers: { ...JSON_HEADERS, cookie }, data: { connectionId: randomUuid(), text: "Hablamos de su serie A." } }),
      },
      {
        spec: R.transcribe,
        limit: LIMITS.transcribePerMinute.limit,
        // No `audio` field: the route answers 400 invalid_audio without calling the transcription model.
        send: (request, cookie) => call(request, R.transcribe, { headers: { cookie }, multipart: { note: "no audio here" } }),
      },
    ];

    for (const { spec, limit, send } of BURSTS) {
      test(`${label(spec)} allows ${limit} calls a minute per user @real`, async ({ request, realMode, testUsers }) => {
        const [first, second] = await testUsers(2);
        if (!first || !second) throw new Error("test users not created");
        const cookie = (await realMode.signInAs(first)).cookieHeader;
        const { before, limited } = await burstUntilLimited(() => send(request, cookie), limit);
        expect(limited, `no 429 after ${before.length} calls`).not.toBeNull();
        expect(before.length).toBeGreaterThanOrEqual(limit);
        expect(before.every((status) => status !== 429 && status < 500)).toBe(true);
        if (!limited) return;
        await expectError(limited, 429, E.rateLimited.code);
        const retryAfter = Number(limited.headers()["retry-after"]);
        expect(retryAfter).toBeGreaterThanOrEqual(1);
        expect(retryAfter).toBeLessThanOrEqual(60);
        // Keyed by user, never IP: someone else at the same venue is not limited.
        const other = await send(request, (await realMode.signInAs(second)).cookieHeader);
        expect(other.status()).not.toBe(429);
      });
    }
  });
});
