// 12 Invitar and the invite reward (F-47, F-48): slots and link, copy with and without clipboard access, WhatsApp, the
// share sheet and its fallback, and in real mode claim → first accept → +100 / +50 once → golden cap. Spanish-only copy.
import type { Page } from "@playwright/test";
import { invites as invitesExample } from "../../lib/api/examples";
import { ClaimedInvite, Invites, Me } from "../../lib/api/schemas";
import { common, home, invite as copy } from "../../lib/copy/es";
import { firstName } from "../../lib/format";
import { GOLDEN_CAP } from "../../lib/monito/look";
import { GOLDEN_CAP_INVITES, INVITE_POINTS } from "../../lib/points";
import type { SignedInUser } from "../fixtures/two-users";
import { acceptedConnection, call, expect, expectApiError, expectErrorScreen, skipTours, test } from "../profiles/helpers";

const shownLink = (url: string) => url.replace(/^https?:\/\//, "");

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

  test("shows the prize, my invitees, the free slots and my link @mock", async ({ page }) => {
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
    await expect(page.getByText(shownLink(invitesExample.url), { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: copy.showQr })).toHaveAttribute("href", "/connect");
    await expect(page.getByRole("link", { name: common.close })).toHaveAttribute("href", "/home");
  });

  test("Copiar puts the link on the clipboard and says so @mock", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are a Chromium feature");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/invite");
    await page.getByRole("button", { name: copy.copy, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.copied, exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(invitesExample.url);
    await expect(page.getByRole("button", { name: copy.copy, exact: true })).toBeVisible();
  });

  test("a denied clipboard selects the link instead of claiming it was copied @mock", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } });
    });
    await page.goto("/invite");
    await page.getByRole("button", { name: copy.copy, exact: true }).click();
    await expect.poll(() => selectedText(page)).toBe(shownLink(invitesExample.url));
    await expect(page.getByRole("button", { name: copy.copied, exact: true })).toHaveCount(0);
  });

  test("WhatsApp opens wa.me with the invite text @mock", async ({ page, context }) => {
    // Never reach the real wa.me: answer the popup locally.
    await context.route("https://wa.me/**", (route) => route.fulfill({ contentType: "text/html", body: "<title>wa</title>" }));
    await page.goto("/invite");
    const popup = page.waitForEvent("popup");
    await page.getByRole("button", { name: copy.whatsapp }).click();
    const opened = await popup;
    await opened.waitForLoadState();
    const text = new URL(opened.url()).searchParams.get("text");
    expect(text).toBe(copy.shareText(invitesExample.url));
    await opened.close();
  });

  for (const via of [copy.more, copy.instagram]) {
    test(`${via} opens the share sheet with the link @mock`, async ({ page }) => {
      await stubShare(page);
      await page.goto("/invite");
      await page.getByRole("button", { name: via, exact: true }).click();
      await expect.poll(() => page.locator("html").getAttribute("data-shared")).toBe(JSON.stringify({ text: copy.shareText(invitesExample.url), url: invitesExample.url }));
    });
  }

  test("without a share sheet Más falls back to copying @mock", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are a Chromium feature");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await noShareSheet(page);
    await page.goto("/invite");
    await page.getByRole("button", { name: copy.more, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.copied, exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(invitesExample.url);
  });

  test("the QR button and the close button navigate @mock", async ({ page }) => {
    await page.goto("/invite");
    await page.getByRole("link", { name: copy.showQr }).click();
    await expect(page).toHaveURL(/\/connect$/);
    await page.goto("/invite");
    await page.getByRole("link", { name: common.close }).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("a failed invite load shows the error screen @mock", async ({ page, mock }) => {
    await mock.mockServerError("unauthorized");
    await page.goto("/invite");
    await expectErrorScreen(page);
  });
});

const invitesOf = (who: SignedInUser) => call(who.page.request, "GET", "/api/invites/me", Invites);
const pointsOf = async (who: SignedInUser) => (await call(who.page.request, "GET", "/api/me", Me)).scores?.event.points ?? 0;
const claim = (who: SignedInUser, code: string) => call(who.page.request, "POST", `/api/invites/${code}/claim`, ClaimedInvite, {});

// The open invite row is created when its owner first loads it (/invite or the home card), as before sharing a link.
const openInvite = async (inviter: SignedInUser) => (await invitesOf(inviter)).code;

test.describe("invite in real mode", () => {
  test("my link uses my handle and every slot starts empty @real", async ({ people, baseURL }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    const invites = await invitesOf(ana);
    expect(invites).toMatchObject({ code: ana.user.handle, invitees: [], target: GOLDEN_CAP_INVITES, goldenCap: false });
    expect(invites.url).toBe(new URL(`/i/${ana.user.handle}`, baseURL).toString());
    await ana.page.goto("/invite");
    await expect(ana.page.getByText(shownLink(invites.url), { exact: true })).toBeVisible();
    await expect(ana.page.getByText(copy.progress(0, GOLDEN_CAP_INVITES), { exact: true })).toBeVisible();
    for (const slot of [1, 2, 3]) await expect(ana.page.getByText(copy.friendSlot(slot), { exact: true })).toBeVisible();
  });

  test("an unknown or own code cannot be claimed @real", async ({ people }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    await expectApiError(await ana.page.request.post("/api/invites/no-such-invite-code/claim", { data: {} }), 404, "not_found");
    await expectApiError(await ana.page.request.post(`/api/invites/${await openInvite(ana)}/claim`, { data: {} }), 404, "not_found");
  });

  test("the invitee's first accept pays +100 and +50 once @real", async ({ people }) => {
    const [inviter, invitee, bruno, carla] = await people([{}, {}, {}, {}]);
    if (!inviter || !invitee || !bruno || !carla) throw new Error("test users not created");
    const claimed = await claim(invitee, await openInvite(inviter));
    expect(claimed.inviter.handle).toBe(inviter.user.handle);
    await acceptedConnection(invitee, bruno);
    expect(await pointsOf(inviter)).toBe(INVITE_POINTS.inviter);
    expect(await pointsOf(invitee)).toBe(50 + INVITE_POINTS.invitee);

    await acceptedConnection(carla, invitee);
    expect(await pointsOf(inviter)).toBe(INVITE_POINTS.inviter);
    expect(await pointsOf(invitee)).toBe(100 + INVITE_POINTS.invitee);
    const invites = await invitesOf(inviter);
    expect(invites.invitees).toHaveLength(1);
    expect(invites.invitees[0]).toMatchObject({ person: { handle: invitee.user.handle }, points: INVITE_POINTS.inviter });

    await inviter.page.goto("/invite");
    await expect(inviter.page.getByText(copy.progress(1, GOLDEN_CAP_INVITES), { exact: true })).toBeVisible();
    await expect(inviter.page.getByText(firstName(invitee.user.name), { exact: true })).toBeVisible();
    await expect(inviter.page.getByText(`+${INVITE_POINTS.inviter} pts`, { exact: true })).toHaveCount(2);
  });

  test("three invitees who connect unlock the golden cap @real", async ({ people }) => {
    const [inviter, first, second, third] = await people([{}, {}, {}, {}]);
    if (!inviter || !first || !second || !third) throw new Error("test users not created");
    // Each claim uses the link the inviter has open at that moment (a claimed code is replaced by a new one).
    for (const invitee of [first, second, third]) await claim(invitee, await openInvite(inviter));
    await acceptedConnection(first, second);
    await acceptedConnection(third, inviter);
    const invites = await invitesOf(inviter);
    expect(invites.goldenCap).toBe(true);
    expect((await call(inviter.page.request, "GET", "/api/me", Me)).avatar).toMatchObject(GOLDEN_CAP);
    await inviter.page.goto("/home");
    await expect(inviter.page.getByRole("link", { name: new RegExp(home.inviteTitle) })).toContainText(home.inviteLeft(0));
  });

  test("two friends who claim the same shared link both count @real", async ({ people }) => {
    test.fixme(true, "BUG: claimInvite overwrites invitee_id on the one open invite row, so a second claim of a shared link unlinks the first friend");
    const [inviter, first, second] = await people([{}, {}, {}]);
    if (!inviter || !first || !second) throw new Error("test users not created");
    const code = await openInvite(inviter);
    await claim(first, code);
    await claim(second, code);
    await acceptedConnection(first, second);
    const invites = await invitesOf(inviter);
    expect(invites.invitees.map((invitee) => invitee.person.handle).sort()).toEqual([first.user.handle, second.user.handle].sort());
    expect(await pointsOf(inviter)).toBe(2 * INVITE_POINTS.inviter);
  });
});
