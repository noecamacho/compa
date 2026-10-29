// F-13, F-21, F-22, F-24, F-27, F-29: the register screen /connect/<handle> (kind, topics, screen notice, Confirm)
// and POST /api/connections with every documented error. Error copy beyond rate limits is the server message
// today (localized error copy is T-111).
import type { Page, Route } from "@playwright/test";
import { ids, valeriaPublic } from "../../lib/api/examples";
import { E } from "../../lib/api/errors";
import { common, confirmation, register } from "../../lib/copy/es";
import { firstName } from "../../lib/format";
import { errorCopy, expect, test } from "../fixtures";
import { detailOf, expectError, expectNotFound, listOf, sendRequest, skipTours } from "./helpers";

const kindButton = (page: Page, label: string) => page.getByRole("group", { name: register.typeLabel }).getByRole("button", { name: new RegExp(label) });
const topic = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const confirmButton = (page: Page, points: number) => page.getByRole("button", { name: register.confirm(points) });

const [TOPIC_A = "", TOPIC_B = "", TOPIC_C = "", TOPIC_D = ""] = register.topics;

test.describe("connect: register screen (mock)", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("a person I already knew starts as a reconnection; kind and topics move the total @mock", async ({ page }) => {
    await page.goto(`/connect/${valeriaPublic.handle}`);
    await expect(page.getByRole("heading", { name: register.title })).toBeVisible();
    await expect(page.getByText(valeriaPublic.name).first()).toBeVisible();
    await expect(page.getByText(register.alreadyKnew)).toBeVisible();
    await expect(kindButton(page, register.reconnectionType)).toHaveAttribute("aria-pressed", "true");
    await expect(confirmButton(page, 20)).toBeVisible();

    await kindButton(page, register.newType).click();
    await expect(kindButton(page, register.newType)).toHaveAttribute("aria-pressed", "true");
    await expect(kindButton(page, register.reconnectionType)).toHaveAttribute("aria-pressed", "false");
    await expect(confirmButton(page, 50)).toBeVisible();

    await topic(page, TOPIC_A).click();
    await expect(confirmButton(page, 55)).toBeVisible();
    await topic(page, TOPIC_B).click();
    await topic(page, TOPIC_C).click();
    await expect(confirmButton(page, 55)).toBeVisible();
    // A fourth topic is refused: at most three.
    await topic(page, TOPIC_D).click();
    await expect(topic(page, TOPIC_D)).toHaveAttribute("aria-pressed", "false");
    for (const name of [TOPIC_A, TOPIC_B, TOPIC_C]) await expect(topic(page, name)).toHaveAttribute("aria-pressed", "true");

    await topic(page, TOPIC_A).click();
    await expect(topic(page, TOPIC_A)).toHaveAttribute("aria-pressed", "false");
    await topic(page, TOPIC_D).click();
    await expect(topic(page, TOPIC_D)).toHaveAttribute("aria-pressed", "true");
  });

  test("Confirm shows the screen notice first, sends the request and opens the done page @mock", async ({ page }) => {
    await page.goto(`/connect/${valeriaPublic.handle}`);
    await expect(page.getByText(register.screenNotice)).toBeVisible();
    await kindButton(page, register.newType).click();
    await topic(page, TOPIC_A).click();
    await topic(page, TOPIC_B).click();
    const sent = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith("/api/connections"));
    await confirmButton(page, 55).click();
    expect((await sent).postDataJSON()).toEqual({ toHandle: valeriaPublic.handle, knew: false, screenConsent: true, topics: [TOPIC_A, TOPIC_B] });
    await expect(page).toHaveURL(new RegExp(`/connections/${ids.connection}/done$`));
  });

  test("while sending, the button says so and a double tap sends one request @mock", async ({ page }) => {
    await page.goto(`/connect/${valeriaPublic.handle}`);
    let posts = 0;
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/connections", async (route: Route) => {
      if (route.request().method() !== "POST") return route.fallback();
      posts += 1;
      await held;
      await route.fallback();
    });
    await confirmButton(page, 20).click();
    await expect(page.getByRole("button", { name: register.sending })).toBeDisabled();
    await page.getByRole("button", { name: register.sending }).click({ force: true });
    release();
    await expect(page).toHaveURL(/\/done$/);
    expect(posts).toBe(1);
  });

  test("the back arrow returns to the scanner @mock", async ({ page }) => {
    await page.goto(`/connect/${valeriaPublic.handle}`);
    await page.getByRole("link", { name: common.back }).click();
    await expect(page).toHaveURL(/\/connect\?tab=scan$/);
  });

  test("an unknown handle is a 404 @mock", async ({ page, mock }) => {
    await mock.mockServerError("user_not_found");
    await page.goto("/connect/nobody-here");
    await expectNotFound(page);
    await expect(page.getByRole("heading", { name: register.title })).toHaveCount(0);
  });

  const ERRORS_WITH_COPY = [E.invalidInput, E.unauthorized, E.userNotFound, E.selfConnection, E.notAtEvent, E.consentRequired, E.testUserNotAllowed];
  for (const error of ERRORS_WITH_COPY) {
    test(`${error.code} keeps the form and shows the error @mock`, async ({ page, mock }) => {
      await page.goto(`/connect/${valeriaPublic.handle}`);
      await mock.mockError(error.code, "**/api/connections");
      const answered = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/connections"));
      await confirmButton(page, 20).click();
      expect((await answered).status()).toBe(error.status);
      await expect(page.getByText(errorCopy(error))).toBeVisible();
      await expect(confirmButton(page, 20)).toBeEnabled();
      await expect(page).toHaveURL(new RegExp(`/connect/${valeriaPublic.handle}$`));
    });
  }

  for (const [code, text] of [
    ["rate_limited", common.rateLimited],
    ["limit_reached", common.limitReached],
  ] as const) {
    test(`${code} shows its own copy @mock`, async ({ page, mock }) => {
      await page.goto(`/connect/${valeriaPublic.handle}`);
      await mock.mockError(code, "**/api/connections");
      await confirmButton(page, 20).click();
      await expect(page.getByText(text)).toBeVisible();
      await expect(confirmButton(page, 20)).toBeEnabled();
    });
  }

  test("offline, Confirm keeps the form @mock", async ({ page, context }) => {
    await page.goto(`/connect/${valeriaPublic.handle}`);
    await expect(confirmButton(page, 20)).toBeVisible();
    await context.setOffline(true);
    await confirmButton(page, 20).click();
    await expect(confirmButton(page, 20)).toBeEnabled();
    await expect(page).toHaveURL(new RegExp(`/connect/${valeriaPublic.handle}$`));
    await context.setOffline(false);
  });
});

test.describe("connect: register screen (real)", () => {
  test("A registers B with two topics: pending screen, topics kept, one row @real", async ({ twoUsers }) => {
    const [ana, bruno] = twoUsers;
    await skipTours(ana.context);
    await ana.page.goto(`/connect/${bruno.user.handle}`);
    await expect(ana.page.getByText(bruno.user.name).first()).toBeVisible();
    await expect(ana.page.getByText(register.alreadyKnew)).toHaveCount(0);
    await expect(kindButton(ana.page, register.newType)).toHaveAttribute("aria-pressed", "true");
    await topic(ana.page, TOPIC_A).click();
    await topic(ana.page, TOPIC_B).click();
    await confirmButton(ana.page, 55).click();
    await expect(ana.page).toHaveURL(/\/connections\/[0-9a-f-]{36}\/done$/);
    await expect(ana.page.getByRole("heading", { name: confirmation.titlePending(firstName(bruno.user.name)) })).toBeVisible();
    await expect(ana.page.getByText(confirmation.pendingNote)).toBeVisible();

    const connectionId = ana.page.url().split("/").at(-2) ?? "";
    const detail = await detailOf(ana.page.request, connectionId);
    expect(detail).toMatchObject({ status: "pending", direction: "sent", topics: [TOPIC_A, TOPIC_B], points: { total: 0 } });

    // F-24: a second Confirm at the same event returns the same connection with 200.
    await ana.page.goto(`/connect/${bruno.user.handle}`);
    const again = ana.page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/connections"));
    await confirmButton(ana.page, 50).click();
    expect((await again).status()).toBe(200);
    await expect(ana.page).toHaveURL(new RegExp(`/connections/${connectionId}/done$`));
    const list = await listOf(ana.page.request);
    expect(list.people.filter((entry) => entry.person.id === bruno.user.id).flatMap((entry) => entry.meetings)).toHaveLength(1);
  });

  test("scanning myself fails on Confirm with self_connection @real", async ({ page, realUser }) => {
    await skipTours(page.context());
    await page.goto(`/connect/${realUser.user.handle}`);
    await expect(page.getByText(realUser.user.name).first()).toBeVisible();
    await page.getByRole("button", { name: /^Confirmar/ }).click();
    await expect(page.getByText(errorCopy(E.selfConnection))).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/connect/${realUser.user.handle}$`));
    await expectError(await page.request.post("/api/connections", { data: { toHandle: realUser.user.handle, screenConsent: true } }), 409, "self_connection");
  });

  test("a target with no current event fails with not_at_event @real", async ({ page, realUser, realMode }) => {
    const [loner] = await realMode.createTestUsers({ count: 1 });
    if (!loner) throw new Error("test user not created");
    try {
      await skipTours(page.context());
      expect(loner.id).not.toBe(realUser.user.id);
      await page.goto(`/connect/${loner.handle}`);
      await page.getByRole("button", { name: /^Confirmar/ }).click();
      await expect(page.getByText(errorCopy(E.notAtEvent))).toBeVisible();
      await expectError(await page.request.post("/api/connections", { data: { toHandle: loner.handle, screenConsent: true } }), 409, "not_at_event");
    } finally {
      await realMode.deleteTestUser(loner.id);
    }
  });

  test("a scanner who is not checked in sees the notice; without consent the API refuses, with it they join @real", async ({ page, realMode, signIn, testUsers }) => {
    const [target] = await testUsers(1);
    const [newcomer] = await realMode.createTestUsers({ count: 1 });
    if (!target || !newcomer) throw new Error("test users not created");
    try {
      await signIn(page.context(), newcomer);
      await skipTours(page.context());
      await expectError(await page.request.post("/api/connections", { data: { toHandle: target.handle } }), 409, "consent_required");
      await page.goto(`/connect/${target.handle}`);
      await expect(page.getByText(register.screenNotice)).toBeVisible();
      await confirmButton(page, 50).click();
      await expect(page).toHaveURL(/\/done$/);
      const list = await listOf(page.request);
      expect(list.people.map((entry) => entry.person.id)).toContain(target.id);
    } finally {
      await realMode.deleteTestUser(newcomer.id);
    }
  });

  test("an unknown handle is a 404 page and a 404 user_not_found @real", async ({ page, realUser }) => {
    expect(realUser.user.handle).toBeTruthy();
    await page.goto("/connect/zz-nobody-by-this-handle");
    await expectNotFound(page);
    await expectError(await page.request.post("/api/connections", { data: { toHandle: "zz-nobody-by-this-handle", screenConsent: true } }), 404, "user_not_found");
  });

  test("signed out, the register screen goes to LinkedIn and comes back @real", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL });
    const response = await context.request.get("/connect/someone-here", { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(response.status());
    expect(response.headers()["location"]).toContain(`/auth/linkedin?next=${encodeURIComponent("/connect/someone-here")}`);
    await expectError(await context.request.post("/api/connections", { data: { toHandle: "someone-here", screenConsent: true } }), 401, "unauthorized");
    await context.close();
  });

  test("invalid bodies answer 400 invalid_input @real", async ({ twoUsers }) => {
    const [ana, bruno] = twoUsers;
    const post = (data: unknown) => ana.page.request.post("/api/connections", { data });
    await expectError(await post({ toHandle: bruno.user.handle, screenConsent: true, topics: ["a", "b", "c", "d"] }), 400, "invalid_input");
    await expectError(await post({ toHandle: bruno.user.handle, screenConsent: true, topics: ["x".repeat(41)] }), 400, "invalid_input");
    await expectError(await post({ toHandle: "Not A Handle!", screenConsent: true }), 400, "invalid_input");
    await expectError(await post({ toHandle: bruno.user.handle, screenConsent: false }), 400, "invalid_input");
    await expectError(await post({}), 400, "invalid_input");
  });

  test("more than 30 scans a minute answer 429 rate_limited @real", async ({ twoUsers }) => {
    const [ana, bruno] = twoUsers;
    await sendRequest(ana.page.request, bruno.user.handle);
    // Fixed one-minute windows: 61 tries always put 31 in one window.
    let limited = null;
    for (let attempt = 0; attempt < 61 && !limited; attempt += 1) {
      const response = await ana.page.request.post("/api/connections", { data: { toHandle: bruno.user.handle, screenConsent: true } });
      if (response.status() === 429) limited = response;
    }
    if (!limited) throw new Error("no 429 after 61 scans");
    await expectError(limited, 429, "rate_limited");
    expect(Number(limited.headers()["retry-after"])).toBeGreaterThan(0);
  });
});
