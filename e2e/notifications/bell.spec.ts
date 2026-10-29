// F-49 Bell and notifications: the Home bell polls the unseen count, /notifications lists requests, acceptances
// and badges in the visitor's language and marks them seen (POST /api/notifications/seen) when opened.
import type { Page } from "@playwright/test";
import { ids, notifications as example, rodrigo, valeriaPublic } from "../../lib/api/examples";
import { expect, test } from "../fixtures";
import { accept, copyOf, expectError, notificationsOf, sendRequest, skipTours } from "../connect/helpers";

const bell = (page: Page, label: string) => page.getByRole("link", { name: label, exact: true });

test.describe("notifications (mock)", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("the list shows every kind, unseen marks and the right links @mock", async ({ page }, testInfo) => {
    const copy = copyOf(testInfo).notifications;
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible();
    const request = page.getByRole("link", { name: new RegExp(copy.request(valeriaPublic.name, "Founders Fest GDL")) });
    const accepted = page.getByRole("link", { name: new RegExp(copy.accepted(rodrigo.name, "Founders Fest GDL")) });
    const badge = page.getByRole("link", { name: new RegExp(copy.badgeEarned("Primer apretón")) });
    await expect(request).toHaveAttribute("href", `/requests/${ids.connection}`);
    await expect(accepted).toHaveAttribute("href", "/connections");
    await expect(badge).toHaveAttribute("href", "/me/badges");
    await expect(page.getByLabel(copy.newLabel, { exact: true })).toHaveCount(example.unseenCount);
    await request.click();
    await expect(page).toHaveURL(new RegExp(`/requests/${ids.connection}$`));
  });

  test("the back arrow goes home @mock", async ({ page }, testInfo) => {
    await page.goto("/notifications");
    // The dock has an "Inicio" tab as text; the back arrow is the link labelled by aria-label.
    await page.locator(`a[aria-label="${copyOf(testInfo).notifications.home}"]`).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("the Home bell shows the unseen count and opens the list @mock", async ({ page }, testInfo) => {
    const copy = copyOf(testInfo).notifications;
    await page.goto("/home");
    await bell(page, copy.bellLabel(example.unseenCount)).click();
    await expect(page).toHaveURL(/\/notifications$/);
  });

  test("the bell count follows the API by polling @mock", async ({ page }, testInfo) => {
    const copy = copyOf(testInfo).notifications;
    await page.goto("/home");
    await expect(bell(page, copy.bellLabel(example.unseenCount))).toBeVisible();
    await page.route("**/api/notifications", (route) => route.fulfill({ json: { ...example, unseenCount: 7 } }));
    await expect(bell(page, copy.bellLabel(7))).toBeVisible({ timeout: 8_000 });
    await page.route("**/api/notifications", (route) => route.fulfill({ json: { notifications: [], unseenCount: 0 } }));
    await expect(bell(page, copy.bellLabel(0))).toBeVisible({ timeout: 8_000 });
  });

  test("a failed poll keeps the last count @mock", async ({ page, mock }, testInfo) => {
    const copy = copyOf(testInfo).notifications;
    await page.goto("/home");
    const polled = page.waitForResponse((response) => response.url().endsWith("/api/notifications") && response.status() === 401);
    await mock.mockError("unauthorized", "**/api/notifications");
    await polled;
    await expect(bell(page, copy.bellLabel(example.unseenCount))).toBeVisible();
  });
});

test.describe("notifications (real)", () => {
  test("a newcomer sees the empty state and a bell without a count @real", async ({ page, testUsers, signIn }, testInfo) => {
    const copy = copyOf(testInfo).notifications;
    const [newcomer] = await testUsers(1);
    if (!newcomer) throw new Error("test user not created");
    await signIn(page.context(), newcomer);
    await skipTours(page.context());
    await page.goto("/notifications");
    await expect(page.getByText(copy.emptyTitle)).toBeVisible();
    await expect(page.getByText(copy.emptyHint)).toBeVisible();
    await page.goto("/home");
    await expect(bell(page, copy.bellLabel(0))).toBeVisible();
  });

  test("a request notifies B; opening the list marks it seen; a newer one stays unseen; acceptance notifies A @real", async ({ twoUsers, testUsers, signIn, browser, baseURL, testEvent }, testInfo) => {
    const copy = copyOf(testInfo).notifications;
    const [ana, bruno] = twoUsers;
    await skipTours(bruno.context);
    const { body: sent } = await sendRequest(ana.page.request, bruno.user.handle);

    const before = await notificationsOf(bruno.page.request);
    expect(before.unseenCount).toBe(1);
    expect(before.notifications).toEqual([expect.objectContaining({ kind: "request", connectionId: sent.connectionId, unseen: true })]);
    await bruno.page.goto("/home");
    await expect(bell(bruno.page, copy.bellLabel(1))).toBeVisible();
    await bell(bruno.page, copy.bellLabel(1)).click();
    const item = bruno.page.getByRole("link", { name: new RegExp(copy.request(ana.user.name, testEvent.name)) });
    await expect(item).toHaveAttribute("href", `/requests/${sent.connectionId}`);
    await expect.poll(async () => (await notificationsOf(bruno.page.request)).unseenCount).toBe(0);

    const [carla] = await testUsers(1);
    if (!carla) throw new Error("test user not created");
    const context = await browser.newContext({ baseURL });
    await signIn(context, carla);
    await sendRequest(context.request, bruno.user.handle);
    await context.close();
    const after = await notificationsOf(bruno.page.request);
    expect(after.unseenCount).toBe(1);
    expect(after.notifications.filter((notice) => notice.unseen).map((notice) => notice.kind)).toEqual(["request"]);

    expect((await accept(bruno.page.request, sent.connectionId)).status()).toBe(200);
    await skipTours(ana.context);
    await ana.page.goto("/notifications");
    const acceptedItem = ana.page.getByRole("link", { name: new RegExp(copy.accepted(bruno.user.name, testEvent.name)) });
    await expect(acceptedItem).toHaveAttribute("href", "/connections");
    await acceptedItem.click();
    await expect(ana.page).toHaveURL(/\/connections$/);
  });

  test("POST /api/notifications/seen: 204, 400 on a bad body, 401 signed out @real", async ({ page, realUser, browser, baseURL }) => {
    expect(realUser.user.id).toBeTruthy();
    const seen = await page.request.post("/api/notifications/seen", { data: { seenThrough: new Date().toISOString() } });
    expect(seen.status()).toBe(204);
    expect((await notificationsOf(page.request)).unseenCount).toBe(0);
    await expectError(await page.request.post("/api/notifications/seen", { data: { seenThrough: "yesterday" } }), 400, "invalid_input");
    const anonymous = await browser.newContext({ baseURL });
    await expectError(await anonymous.request.get("/api/notifications"), 401, "unauthorized");
    await expectError(await anonymous.request.post("/api/notifications/seen", { data: { seenThrough: new Date().toISOString() } }), 401, "unauthorized");
    await anonymous.close();
  });
});
