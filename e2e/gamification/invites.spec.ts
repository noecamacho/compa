// 12 Invitar and the referral code (F-47, F-48): slots and link, copy with and without clipboard access, WhatsApp, the
// share sheet and its fallback; in real mode: the code is the handle and works in or out of an event, a friend joining
// pays +100 on the inviter's current event (none outside one) once, three friends unlock the golden cap, which is
// worn on the monito and over the photo and can be hidden.
import type { Page, TestInfo } from "@playwright/test";
import { invites as invitesExample } from "../../lib/api/examples";
import { CheckIn, ClaimedInvite, Invites, Leaderboard, Me } from "../../lib/api/schemas";
import { copyFor } from "../../lib/copy";
import { firstName } from "../../lib/format";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { GOLDEN_CAP } from "../../lib/monito/look";
import { GOLDEN_CAP_INVITES, INVITE_POINTS } from "../../lib/points";
import type { SignedInUser } from "../fixtures/two-users";
import { acceptedConnection, call, expect, expectApiError, expectErrorScreen, skipTours, test } from "../profiles/helpers";

const copyOf = (testInfo: TestInfo) => copyFor(localeFromAcceptLanguage(testInfo.project.use.locale));

const shownLink = (url: string) => url.replace(/^https?:\/\//, "");

const mockLink = invitesExample.link;
const mockEvent = mockLink.event;
if (!mockEvent) throw new Error("the invites example has no event");

const selectedText = (page: Page) => page.evaluate(() => window.getSelection()?.toString() ?? "");

// What the page handed to navigator.share, kept on <html> by a stub (desktop Chromium has no share sheet).
async function stubShare(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        document.documentElement.dataset.shared = JSON.stringify(data);
      },
    });
  });
}

async function noShareSheet(page: Page): Promise<void> {
  await page.addInitScript(() => Object.defineProperty(navigator, "share", { configurable: true, value: undefined }));
}

test.describe("invite in mock mode", () => {
  test.beforeEach(async ({ page }) => skipTours(page));

  test("shows the prize, my invitees, the free slots, my code and the points it earns here @mock", async ({ page }, testInfo) => {
    const { home, invite: copy, common } = copyOf(testInfo);
    await page.goto("/invite");
    await expect(page.getByRole("heading", { name: copy.title })).toBeVisible();
    await expect(page.getByText(copy.prize)).toBeVisible();
    await expect(page.getByRole("img", { name: home.goldenCapLabel })).toBeVisible();
    await expect(page.getByText(copy.progress(1, invitesExample.target), { exact: true })).toBeVisible();
    const [andrea] = invitesExample.invitees;
    await expect(page.getByText(firstName(andrea?.person.name ?? ""), { exact: true })).toBeVisible();
    // The prize line also says "+100 pts"; the invitee's slot is the second one on the page.
    await expect(page.getByText(`+${andrea?.points ?? 0} pts`, { exact: true }).nth(1)).toBeVisible();
    for (const slot of [2, 3]) await expect(page.getByText(copy.friendSlot(slot), { exact: true })).toBeVisible();
    await expect(page.getByText(copy.cap, { exact: true })).toBeVisible();
    await expect(page.getByText(shownLink(mockLink.url), { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByTestId("invite-points")).toContainText(copy.pointsAt(mockEvent.name));
    await expect(page.getByRole("link", { name: copy.showQr })).toHaveAttribute("href", "/connect");
    await expect(page.getByRole("link", { name: common.close })).toHaveAttribute("href", "/home");
  });

  test("Copiar puts the link on the clipboard and says so @mock", async ({ page, context, browserName }, testInfo) => {
    test.skip(browserName !== "chromium", "clipboard permissions are a Chromium feature");
    const copy = copyOf(testInfo).invite;
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/invite");
    await page.getByRole("button", { name: copy.copy, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.copied, exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(mockLink.url);
    await expect(page.getByRole("button", { name: copy.copy, exact: true })).toBeVisible();
  });

  test("a denied clipboard selects the link instead of claiming it was copied @mock", async ({ page }, testInfo) => {
    const copy = copyOf(testInfo).invite;
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } });
    });
    await page.goto("/invite");
    await page.getByRole("button", { name: copy.copy, exact: true }).click();
    await expect.poll(() => selectedText(page)).toBe(shownLink(mockLink.url));
    await expect(page.getByRole("button", { name: copy.copied, exact: true })).toHaveCount(0);
  });

  test("WhatsApp opens wa.me with the invite text @mock", async ({ page, context }, testInfo) => {
    const copy = copyOf(testInfo).invite;
    // Never reach the real wa.me: answer the popup locally.
    await context.route("https://wa.me/**", (route) => route.fulfill({ contentType: "text/html", body: "<title>wa</title>" }));
    await page.goto("/invite");
    const popup = page.waitForEvent("popup");
    await page.getByRole("button", { name: copy.whatsapp }).click();
    const opened = await popup;
    await opened.waitForLoadState();
    const text = new URL(opened.url()).searchParams.get("text");
    expect(text).toBe(copy.shareText(mockLink.url, mockEvent.name));
    await opened.close();
  });

  for (const via of ["more", "instagram"] as const) {
    test(`${via} opens the share sheet with the link @mock`, async ({ page }, testInfo) => {
      const copy = copyOf(testInfo).invite;
      await stubShare(page);
      await page.goto("/invite");
      await page.getByRole("button", { name: copy[via], exact: true }).click();
      await expect.poll(() => page.locator("html").getAttribute("data-shared")).toBe(JSON.stringify({ text: copy.shareText(mockLink.url, mockEvent.name), url: mockLink.url }));
    });
  }

  test("without a share sheet Más falls back to copying @mock", async ({ page, context, browserName }, testInfo) => {
    test.skip(browserName !== "chromium", "clipboard permissions are a Chromium feature");
    const copy = copyOf(testInfo).invite;
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await noShareSheet(page);
    await page.goto("/invite");
    await page.getByRole("button", { name: copy.more, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.copied, exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(mockLink.url);
  });

  test("the QR button and the close button navigate @mock", async ({ page }, testInfo) => {
    const { invite: copy, common } = copyOf(testInfo);
    await page.goto("/invite");
    await page.getByRole("link", { name: copy.showQr }).click();
    await expect(page).toHaveURL(/\/connect$/);
    await page.goto("/invite");
    await page.getByRole("link", { name: common.close }).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("outside an event the code is still there, with no event to pay on @mock", async ({ page }) => {
    const response = await page.request.get("/api/invites/me", { headers: { "x-compa-mock-example": "noEvent" } });
    expect(Invites.parse(await response.json())).toMatchObject({ link: { code: mockLink.code, event: null }, target: invitesExample.target });
  });

  test("a failed invite load shows the error screen @mock", async ({ page, mock }) => {
    await mock.mockServerError("unauthorized");
    await page.goto("/invite");
    await expectErrorScreen(page);
  });
});

const invitesOf = (who: SignedInUser) => call(who.page.request, "GET", "/api/invites/me", Invites);
const meOf = (who: SignedInUser) => call(who.page.request, "GET", "/api/me", Me);
// Rankings are cached per server instance for 3 s (wiki/conference-scale.md), so points settle within a few seconds.
const POINTS_POLL = { timeout: 8_000 };
const eventPointsOf = async (who: SignedInUser) => (await meOf(who)).scores?.event.points ?? 0;
const lifetimePointsOf = async (who: SignedInUser) => (await meOf(who)).scores?.lifetime.points ?? 0;
const claim = (who: SignedInUser, code: string) => call(who.page.request, "POST", `/api/invites/${code}/claim`, ClaimedInvite, {});
const checkIn = (who: SignedInUser, code: string) => call(who.page.request, "POST", `/api/e/${code}/check-in`, CheckIn, { screenConsent: true });

// Friends who join through a referral are new to COMPA: created without a check-in.
const newFriends = (people: (profiles: object[], options?: { checkIn?: boolean }) => Promise<SignedInUser[]>, count: number) =>
  people(Array.from({ length: count }, () => ({})), { checkIn: false });

test.describe("referral code in real mode", () => {
  test("in an event: my code is my handle and says +100 pts at my event @real", async ({ people, baseURL, testEvent }, testInfo) => {
    const { invite: copy, home, connect } = copyOf(testInfo);
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    const url = new URL(`/i/${ana.user.handle}`, baseURL).toString();
    expect(await invitesOf(ana)).toMatchObject({ link: { code: ana.user.handle, url, event: { code: testEvent.accessCode, name: testEvent.name } }, invitees: [], target: GOLDEN_CAP_INVITES, goldenCap: false });
    await ana.page.goto("/invite");
    await expect(ana.page.getByText(shownLink(url), { exact: true })).toBeVisible();
    await expect(ana.page.getByRole("main").getByTestId("invite-points")).toContainText(copy.pointsAt(testEvent.name));
    await expect(ana.page.getByRole("main").getByText(copy.progress(0, GOLDEN_CAP_INVITES), { exact: true })).toBeVisible();
    for (const slot of [1, 2, 3]) await expect(ana.page.getByText(copy.friendSlot(slot), { exact: true })).toBeVisible();
    await ana.page.goto("/home");
    await expect(ana.page.getByRole("link", { name: new RegExp(home.inviteTitle) })).toContainText(home.invitePoints(testEvent.name));
    await ana.page.goto("/connect");
    await expect(ana.page.getByRole("link", { name: connect.invite })).toHaveAttribute("href", "/invite");
  });

  test("outside an event: the code still works and says plainly it earns no points @real", async ({ people, baseURL }, testInfo) => {
    const { invite: copy, home, connect } = copyOf(testInfo);
    const [ana] = await people([{}], { checkIn: false });
    if (!ana) throw new Error("test user not created");
    const url = new URL(`/i/${ana.user.handle}`, baseURL).toString();
    expect(await invitesOf(ana)).toMatchObject({ link: { code: ana.user.handle, url, event: null }, invitees: [], target: GOLDEN_CAP_INVITES });
    await ana.page.goto("/invite");
    const notice = ana.page.getByRole("main").getByTestId("invite-points");
    await expect(notice).toContainText(copy.noPointsTitle);
    await expect(notice).toContainText(copy.noPoints);
    await expect(ana.page.getByRole("button", { name: copy.copy, exact: true })).toBeVisible();
    await ana.page.goto("/home");
    await expect(ana.page.getByRole("link", { name: new RegExp(home.inviteTitle) })).toContainText(home.inviteNoPoints);
    await ana.page.goto("/connect");
    await expect(ana.page.getByRole("link", { name: connect.invite })).toHaveAttribute("href", "/invite");
  });

  test("an unknown or own code cannot be claimed @real", async ({ people }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    await expectApiError(await ana.page.request.post("/api/invites/no-such-invite-code/claim", { data: {} }), 404, "not_found");
    await expectApiError(await ana.page.request.post(`/api/invites/${ana.user.handle}/claim`, { data: {} }), 404, "not_found");
  });

  test("someone who has already been at an event is not a referral @real", async ({ people }) => {
    const [inviter, regular] = await people([{}, {}]);
    if (!inviter || !regular) throw new Error("test users not created");
    await expectApiError(await regular.page.request.post(`/api/invites/${inviter.user.handle}/claim`, { data: {} }), 409, "referral_not_new");
    expect((await invitesOf(inviter)).invitees).toEqual([]);
  });

  test("a friend joining while I am at an event pays +100 there, once; their first connection pays them +50 @real", async ({ people, testEvent }, testInfo) => {
    const copy = copyOf(testInfo).invite;
    const [inviter, bruno] = await people([{}, {}]);
    const [friend] = await newFriends(people, 1);
    if (!inviter || !bruno || !friend) throw new Error("test users not created");
    const claimed = await claim(friend, inviter.user.handle);
    expect(claimed.inviter.handle).toBe(inviter.user.handle);
    expect(claimed.event?.code).toBe(testEvent.accessCode);
    await expect.poll(() => eventPointsOf(inviter), POINTS_POLL).toBe(INVITE_POINTS.inviter);
    // A second claim (a reload, a second tab) pays nothing more.
    await claim(friend, inviter.user.handle);
    expect((await invitesOf(inviter)).invitees).toMatchObject([{ person: { handle: friend.user.handle }, points: INVITE_POINTS.inviter, firstConnectionAt: null }]);

    await checkIn(friend, testEvent.accessCode);
    await acceptedConnection(friend, bruno);
    await expect.poll(() => eventPointsOf(friend), POINTS_POLL).toBe(50 + INVITE_POINTS.invitee);
    await expect.poll(() => lifetimePointsOf(inviter), POINTS_POLL).toBe(INVITE_POINTS.inviter);

    await inviter.page.goto("/invite");
    await expect(inviter.page.getByRole("main").getByText(copy.progress(1, GOLDEN_CAP_INVITES), { exact: true })).toBeVisible();
    await expect(inviter.page.getByText(firstName(friend.user.name), { exact: true })).toBeVisible();
  });

  test("a friend joining while I am outside an event pays nothing but counts toward the cap @real", async ({ people }, testInfo) => {
    const copy = copyOf(testInfo).invite;
    const [inviter] = await people([{}], { checkIn: false });
    const [friend] = await newFriends(people, 1);
    if (!inviter || !friend) throw new Error("test users not created");
    expect((await claim(friend, inviter.user.handle)).event).toBeNull();
    expect((await invitesOf(inviter)).invitees).toMatchObject([{ person: { handle: friend.user.handle }, points: 0 }]);
    expect(await lifetimePointsOf(inviter)).toBe(0);
    await inviter.page.goto("/invite");
    await expect(inviter.page.getByRole("main").getByText(copy.progress(1, GOLDEN_CAP_INVITES), { exact: true })).toBeVisible();
    await expect(inviter.page.getByRole("main").getByText(copy.noPointsShort, { exact: true })).toBeVisible();
  });

  test("three friends unlock the golden cap: over my photo, on my monito, on the board, and I can hide it @real", async ({ people, baseURL, testEvent }, testInfo) => {
    const copy = copyOf(testInfo).invite;
    const photoUrl = new URL("/icon.png", baseURL).toString();
    const [inviter] = await people([{ photoUrl, avatarMode: "photo" }]);
    const friends = await newFriends(people, GOLDEN_CAP_INVITES);
    if (!inviter || friends.length !== GOLDEN_CAP_INVITES) throw new Error("test users not created");
    const storedLook = (await meOf(inviter)).avatar;
    for (const [index, friend] of friends.entries()) {
      await claim(friend, inviter.user.handle);
      expect((await invitesOf(inviter)).goldenCap).toBe(index + 1 === GOLDEN_CAP_INVITES);
    }
    // Idempotent: a repeated claim neither adds a friend nor unlocks anything twice.
    await claim(friends[0] as SignedInUser, inviter.user.handle);
    expect((await invitesOf(inviter)).invitees).toHaveLength(GOLDEN_CAP_INVITES);

    const me = await meOf(inviter);
    expect(me).toMatchObject({ accessories: ["golden_cap"], showAccessories: true, photoUrl });
    // The stored monito and photo never change: the cap is drawn on top.
    expect(me.avatar).toEqual(storedLook);

    await inviter.page.goto("/invite");
    const earned = inviter.page.getByRole("main").getByRole("region", { name: copy.capEarned });
    await expect(earned).toContainText(copy.capEarned);
    await expect(earned.getByRole("img", { name: inviter.user.name })).toBeVisible();
    await expect(earned.locator('[data-accessory="golden_cap"]')).toBeVisible();

    // The board and the big screen carry it with the photo.
    const boardAccessories = async () =>
      (await call(inviter.page.request, "GET", `/api/e/${testEvent.accessCode}/leaderboard`, Leaderboard)).rows.find((row) => row.handle === inviter.user.handle)?.accessories;
    await expect.poll(boardAccessories, POINTS_POLL).toEqual(["golden_cap"]);

    // On the monito: the same cap, worn at render time.
    await call(inviter.page.request, "PATCH", "/api/me", Me, { avatarMode: "monito" });
    await inviter.page.reload();
    const monito = earned.getByRole("img", { name: inviter.user.name });
    await expect(monito).toHaveAttribute("data-look", new RegExp(`"hatColor":"${GOLDEN_CAP.hatColor}"`));
    await call(inviter.page.request, "PATCH", "/api/me", Me, { avatarMode: "photo" });
    await inviter.page.reload();

    // Hide it: gone from the photo and from the API, still earned.
    const toggle = earned.getByRole("switch", { name: copy.showCap });
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(earned).toContainText(copy.capHidden);
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(earned.locator('[data-accessory="golden_cap"]')).toHaveCount(0);
    const hidden = await meOf(inviter);
    expect(hidden.showAccessories).toBe(false);
    expect(hidden.accessories).toBeUndefined();
    expect((await invitesOf(inviter)).goldenCap).toBe(true);
  });
});
