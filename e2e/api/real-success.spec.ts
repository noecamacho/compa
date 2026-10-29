// Real handlers answer with the documented success shape: every read route a test user or the test admin can
// call, the simple writes, the sign-in redirects (LinkedIn is never followed) and the health check.
import type { APIRequestContext } from "@playwright/test";
import type { AnyRouteSpec } from "../../lib/api/route-spec";
import * as R from "../../lib/api/routes";
import { expect, test, TEST_EVENT_SLUG } from "../fixtures";
import { adminSession, automationHeaders, call, expectSuccessBody, label, ONCE_REASON, pathFor, runsOnce, sessionHeaders, successStatuses } from "./helpers";

type Read = { spec: AnyRouteSpec; path?: string; data?: unknown };

async function expectDocumented(request: APIRequestContext, headers: Record<string, string>, { spec, path, data }: Read) {
  const response = await call(request, spec, { path, headers: { "Content-Type": "application/json", ...headers }, data });
  expect(successStatuses(spec), `${label(spec)} → ${response.status()} ${await response.text()}`).toContain(response.status());
  await expectSuccessBody(spec, response);
}

test.describe("real handlers match their documented success schema", () => {
  test.beforeEach(({}, testInfo) => test.skip(!runsOnce(testInfo), ONCE_REASON));

  test("signed-in reads and writes of an attendee @real", async ({ request, realMode, testUsers, testEvent }) => {
    const [user] = await testUsers(1);
    if (!user) throw new Error("test user not created");
    const headers = sessionHeaders((await realMode.signInAs(user)).cookieHeader);
    const code = testEvent.accessCode;
    const reads: Read[] = [
      { spec: R.getMe },
      { spec: R.listInterests },
      { spec: R.getUser, path: pathFor(R.getUser, { handle: user.handle }) },
      { spec: R.getEvent, path: pathFor(R.getEvent, { code }) },
      { spec: R.liveSnapshot, path: pathFor(R.liveSnapshot, { code }) },
      { spec: R.livePerson, path: pathFor(R.livePerson, { code, userId: user.id }) },
      { spec: R.leaderboard, path: pathFor(R.leaderboard, { code }) },
      { spec: R.leaderboard, path: `${pathFor(R.leaderboard, { code })}?scope=lifetime&limit=5` },
      { spec: R.listConnections },
      { spec: R.listNotifications },
      { spec: R.listBadges },
      { spec: R.myInvites },
      { spec: R.patchMe, data: { headline: "QA at Codex Conf" } },
      { spec: R.patchVisibility, data: { company: "connections" } },
      { spec: R.markNotificationsSeen, data: { seenThrough: new Date().toISOString() } },
      // The fixture already checked the user in: the repeat answers 200 with alreadyCheckedIn.
      { spec: R.checkIn, path: pathFor(R.checkIn, { code }), data: { screenConsent: true } },
    ];
    // Rankings are cached per instance for 3 s (wiki/conference-scale.md), so a fresh attendee's live card can 404 briefly;
    // every read here is idempotent, so each retries until it settles.
    for (const read of reads) await test.step(label(read.spec), () => expect(() => expectDocumented(request, headers, read)).toPass({ timeout: 10_000 }));
  });

  test("the super-admin console reads @real", async ({ request, realMode }) => {
    const slug = TEST_EVENT_SLUG;
    const reads: Read[] = [
      { spec: R.listAdminEvents },
      { spec: R.getAdminEvent, path: pathFor(R.getAdminEvent, { slug }) },
      { spec: R.listAttendees, path: pathFor(R.listAttendees, { slug }) },
      { spec: R.listOrganizers, path: pathFor(R.listOrganizers, { slug }) },
      { spec: R.searchUsers, path: `${R.searchUsers.path}?q=codex&test=only&limit=5` },
      { spec: R.listTestUsers, path: `${R.listTestUsers.path}?handlePrefix=codex&limit=5` },
    ];
    // A parallel sign-in as the shared test admin can revoke the session: each read retries with a new one.
    for (const read of reads) {
      await test.step(label(read.spec), () =>
        expect(async () => expectDocumented(request, sessionHeaders((await adminSession(realMode, request)).cookieHeader), read)).toPass({ timeout: 30_000 }),
      );
    }
  });

  test("the automation header opens the test-user routes @real", async ({ request }) => {
    await expectDocumented(request, automationHeaders(), { spec: R.listTestUsers, path: `${R.listTestUsers.path}?limit=1` });
  });

  test("sign-out answers 204 and clears the session cookies @real", async ({ request, realMode, testUsers }) => {
    const [user] = await testUsers(1);
    if (!user) throw new Error("test user not created");
    const response = await call(request, R.signOut, { headers: sessionHeaders((await realMode.signInAs(user)).cookieHeader) });
    expect(response.status()).toBe(204);
    const cleared = response.headersArray().filter(({ name, value }) => name.toLowerCase() === "set-cookie" && /max-age=0|expires=thu, 01 jan 1970/i.test(value));
    expect(cleared.length).toBeGreaterThan(0);
  });

  test("an invalid email never reaches the mailer: 400 invalid_input @real", async ({ request }) => {
    const response = await call(request, R.authEmail, { headers: { "Content-Type": "application/json" }, data: { email: "not-an-email" } });
    expect(response.status()).toBe(400);
  });

  test("sign-in redirects and never leaves for LinkedIn on its own @real", async ({ request }) => {
    const start = await call(request, R.authLinkedin, { path: `${R.authLinkedin.path}?next=/me` });
    expect([302, 303, 307]).toContain(start.status());
    const location = new URL(start.headers().location ?? "", "http://localhost");
    expect(location.hostname).not.toBe("compa.lol");
    expect(`${location.pathname}${location.search}`).toMatch(/linkedin_oidc|error=signin/);

    const failed = await call(request, R.authCallback, { path: `${R.authCallback.path}?error=access_denied` });
    expect([302, 303, 307]).toContain(failed.status());
    expect(new URL(failed.headers().location ?? "", "http://localhost").search).toContain("error=signin");
  });

  test("GET /api/health reports the database @real", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.json()).toMatchObject({ status: "ok", db: "ok", ms: expect.any(Number) });
  });
});
