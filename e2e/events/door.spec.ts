// The event door /e/<code> and its consent step /e/<code>/join (F-10, F-12, F-15): what a visitor and a signed-in
// person see, how the code is normalized, and what an unknown, malformed or rotated code shows.
import { eventDoor } from "../../lib/api/examples";
import { EventDoor } from "../../lib/api/schemas";
import { formatNumber } from "../../lib/copy";
import { copyOf, expect, expectEventNotFound, localeOf, test } from "./helpers";

const joinPathOf = (code: string) => `/e/${code}/join`;
const signInHref = (code: string) => `/auth/linkedin?next=${encodeURIComponent(joinPathOf(code))}`;

test.describe("door in mock mode @mock", () => {
  test("shows the event, its counters and the signed-in entry", async ({ page }, testInfo) => {
    const copy = copyOf(testInfo);
    const locale = localeOf(testInfo);
    await page.goto(`/e/${eventDoor.code}`);
    await expect(page.getByRole("heading", { level: 1, name: eventDoor.name })).toBeVisible();
    await expect(page.getByText(copy.door.invitedTo)).toBeVisible();
    await expect(page.getByText(copy.door.live, { exact: true })).toBeVisible();
    await expect(page.getByText(formatNumber(locale, eventDoor.counters.checkedIn), { exact: true })).toBeVisible();
    await expect(page.getByText(formatNumber(locale, eventDoor.counters.connections), { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: copy.door.ctaSignedIn })).toHaveAttribute("href", joinPathOf(eventDoor.code));
    await expect(page.getByRole("link", { name: copy.door.watchLive })).toHaveAttribute("href", `/e/${eventDoor.code}/live`);
    // Mock mode is always signed in: no LinkedIn button and no email form.
    await expect(page.getByRole("link", { name: copy.door.cta })).toHaveCount(0);
    await expect(page.getByLabel(copy.door.emailLabel)).toHaveCount(0);
  });

  test("enter → consent → accept checks in and opens home", async ({ page }, testInfo) => {
    const copy = copyOf(testInfo);
    await page.goto(`/e/${eventDoor.code}`);
    await page.getByRole("link", { name: copy.door.ctaSignedIn }).click();
    await expect(page).toHaveURL(new RegExp(`${joinPathOf(eventDoor.code)}$`));
    await expect(page.getByRole("heading", { level: 1, name: copy.join.title })).toBeVisible();
    await expect(page.getByText(eventDoor.name)).toBeVisible();
    await expect(page.getByText(copy.join.notice)).toBeVisible();
    const checkIn = page.waitForRequest((request) => request.url().endsWith(`/api/e/${eventDoor.code}/check-in`) && request.method() === "POST");
    await page.getByRole("button", { name: copy.join.accept }).click();
    expect((await checkIn).postDataJSON()).toEqual({ screenConsent: true });
    await expect(page).toHaveURL(/\/home$/);
  });

  test("declining the notice goes back to the door without checking in", async ({ page }, testInfo) => {
    const copy = copyOf(testInfo);
    const checkIns: string[] = [];
    page.on("request", (request) => request.url().includes("/check-in") && checkIns.push(request.url()));
    await page.goto(joinPathOf(eventDoor.code));
    await page.getByRole("link", { name: copy.join.cancel }).click();
    await expect(page).toHaveURL(new RegExp(`/e/${eventDoor.code}$`));
    await expect(page.getByRole("heading", { level: 1, name: eventDoor.name })).toBeVisible();
    expect(checkIns).toEqual([]);
  });

  const failures = [
    { code: "event_not_running", text: (copy: ReturnType<typeof copyOf>) => copy.join.notRunning },
    { code: "event_not_found", text: (copy: ReturnType<typeof copyOf>) => copy.join.failed },
    { code: "invalid_input", text: (copy: ReturnType<typeof copyOf>) => copy.join.failed },
    { code: "test_user_not_allowed", text: (copy: ReturnType<typeof copyOf>) => copy.join.failed },
  ];
  for (const failure of failures) {
    test(`a ${failure.code} check-in shows its copy and lets the person retry`, async ({ page, mock }, testInfo) => {
      const copy = copyOf(testInfo);
      await mock.mockError(failure.code, "**/api/e/*/check-in");
      await page.goto(joinPathOf(eventDoor.code));
      const accept = page.getByRole("button", { name: copy.join.accept });
      await accept.click();
      await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(failure.text(copy));
      await expect(accept).toBeEnabled();
      await expect(page).toHaveURL(new RegExp(`${joinPathOf(eventDoor.code)}$`));
    });
  }

  test("a 401 check-in sends the person to sign in", async ({ page, mock }, testInfo) => {
    const copy = copyOf(testInfo);
    await mock.mockError("unauthorized", "**/api/e/*/check-in");
    // Stop at our sign-in route: LinkedIn is never called.
    await page.route("**/auth/linkedin**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "sign-in" }));
    await page.goto(joinPathOf(eventDoor.code));
    await page.getByRole("button", { name: copy.join.accept }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/auth/linkedin" && url.searchParams.get("next") === joinPathOf(eventDoor.code));
  });

  test("an unknown code shows the not-found door on /e, /join and /live", async ({ page, mock }, testInfo) => {
    const copy = copyOf(testInfo);
    await mock.mockServerError("event_not_found");
    for (const path of ["/e/zzzzzzzzzz", "/e/zzzzzzzzzz/join", "/e/zzzzzzzzzz/live"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expectEventNotFound(page, copy);
    }
  });
});

test.describe("door in real mode @real", () => {
  test("a visitor sees LinkedIn with the join path as next, and the email option", async ({ page, testEvent }, testInfo) => {
    const copy = copyOf(testInfo);
    await page.goto(`/e/${testEvent.accessCode}`);
    await expect(page.getByRole("heading", { level: 1, name: testEvent.name })).toBeVisible();
    await expect(page.getByRole("link", { name: copy.door.cta })).toHaveAttribute("href", signInHref(testEvent.accessCode));
    await expect(page.getByText(copy.door.note)).toBeVisible();
    await expect(page.getByText(copy.door.orEmail)).toBeVisible();
    await expect(page.getByLabel(copy.door.emailLabel)).toHaveAttribute("type", "email");
    await expect(page.getByRole("button", { name: copy.door.emailCta })).toBeEnabled();
    await expect(page.getByRole("link", { name: copy.door.watchLive })).toHaveAttribute("href", `/e/${testEvent.accessCode}/live`);
  });

  test("the email form sends a link with the join path, and says when it fails", async ({ page, testEvent }, testInfo) => {
    const copy = copyOf(testInfo);
    const email = "door-e2e@test.compa.lol";
    // Stubbed so no mail leaves and the Supabase email limit is not spent; the auth spec owns the route itself.
    let answer = 500;
    const bodies: unknown[] = [];
    await page.route("**/api/auth/email", (route) => {
      bodies.push(route.request().postDataJSON());
      return route.fulfill(answer === 204 ? { status: 204 } : { status: answer, json: { error: { code: "internal", message: "x" } } });
    });
    await page.goto(`/e/${testEvent.accessCode}`);
    await page.getByLabel(copy.door.emailLabel).fill(email);
    await page.getByRole("button", { name: copy.door.emailCta }).click();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(copy.door.emailFailed);
    answer = 204;
    await page.getByRole("button", { name: copy.door.emailCta }).click();
    await expect(page.getByRole("status")).toHaveText(copy.door.emailSent(email));
    expect(bodies.at(-1)).toEqual({ email, next: joinPathOf(testEvent.accessCode) });
  });

  test("a visitor opening /join is sent to sign in with next", async ({ page, testEvent }) => {
    const response = await page.request.get(joinPathOf(testEvent.accessCode), { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain(signInHref(testEvent.accessCode));
  });

  test("a signed-in person enters, accepts and lands on home; the door then skips to home", async ({ page, context, signIn, freshUsers, throwawayEvent }, testInfo) => {
    const copy = copyOf(testInfo);
    const event = await throwawayEvent();
    const [person] = await freshUsers({ count: 1 });
    if (!person) throw new Error("test user not created");
    await signIn(context, person);
    await page.goto(`/e/${event.code}`);
    await expect(page.getByRole("link", { name: copy.door.cta })).toHaveCount(0);
    await expect(page.getByLabel(copy.door.emailLabel)).toHaveCount(0);
    await page.getByRole("link", { name: copy.door.ctaSignedIn }).click();
    await expect(page.getByRole("heading", { level: 1, name: copy.join.title })).toBeVisible();
    await expect(page.getByText(event.name)).toBeVisible();
    const checkIn = page.waitForResponse((response) => response.url().endsWith(`/api/e/${event.code}/check-in`));
    await page.getByRole("button", { name: copy.join.accept }).click();
    expect((await checkIn).status()).toBe(201);
    await expect(page).toHaveURL(/\/home$/);
    await page.goto(`/e/${event.code}`);
    await expect(page).toHaveURL(/\/home$/);
    await page.goto(joinPathOf(event.code));
    await expect(page).toHaveURL(/\/home$/);
  });

  // The padded case needs the codeFromSegment fix (lib/access-code.ts): Next.js passes the segment still encoded.
  for (const [name, variantOf] of [
    ["an uppercase", (code: string) => code.toUpperCase()],
    ["a space-padded", (code: string) => `%20${code}%20`],
  ] as const) {
    test(`${name} code opens the same door`, async ({ page, testEvent }, testInfo) => {
      const code = testEvent.accessCode;
      const variant = variantOf(code);
      const response = await page.request.get(`/api/e/${variant}`);
      expect(response.status()).toBe(200);
      expect(EventDoor.parse(await response.json()).code).toBe(code);
      await page.goto(`/e/${variant}`);
      await expect(page.getByRole("heading", { level: 1, name: testEvent.name })).toBeVisible();
      await expect(page.getByRole("link", { name: copyOf(testInfo).door.watchLive })).toHaveAttribute("href", `/e/${code}/live`);
    });
  }

  test("unknown and malformed codes show the not-found door and a 404", async ({ page, testEvent }, testInfo) => {
    const copy = copyOf(testInfo);
    // A slug is not a code: the door only opens with the access code from the QR (A10).
    for (const code of ["zzzzzzzzzz", "ab", "bad!code", testEvent.slug]) {
      const response = await page.goto(`/e/${encodeURIComponent(code)}`);
      expect(response?.status()).toBe(404);
      await expectEventNotFound(page, copy);
      const api = await page.request.get(`/api/e/${encodeURIComponent(code)}`);
      expect(api.status()).toBe(404);
      expect((await api.json()).error.code).toBe("event_not_found");
    }
  });

  test("GET /api/e/{code} answers the door fields only", async ({ page, testEvent }) => {
    const response = await page.request.get(`/api/e/${testEvent.accessCode}`);
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    const door = EventDoor.parse(body);
    expect(Object.keys(body as object).sort()).toEqual(["code", "counters", "endsAt", "isRunning", "name", "phase", "startsAt"]);
    expect(door).toMatchObject({ code: testEvent.accessCode, name: testEvent.name, isRunning: true, phase: "running" });
  });

  test("a rotated code: the old one shows not found, the new one works, a checked-in person still gets home", async ({ page, context, signIn, freshUsers, throwawayEvent, rotateCode }, testInfo) => {
    const copy = copyOf(testInfo);
    const event = await throwawayEvent();
    const [person] = await freshUsers({ count: 1, checkInTo: event.slug });
    if (!person) throw new Error("test user not created");
    const fresh = await rotateCode(event);
    expect(fresh).not.toBe(event.code);
    for (const path of [`/api/e/${event.code}`, `/api/e/${event.code}/live`, `/api/e/${event.code}/leaderboard`]) {
      expect((await page.request.get(path)).status()).toBe(404);
    }
    const old = await page.goto(`/e/${event.code}`);
    expect(old?.status()).toBe(404);
    await expectEventNotFound(page, copy);
    await page.goto(`/e/${fresh}`);
    await expect(page.getByRole("heading", { level: 1, name: event.name })).toBeVisible();
    await signIn(context, person);
    await page.goto(`/e/${fresh}`);
    await expect(page).toHaveURL(/\/home$/);
  });
});
