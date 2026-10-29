// 12 Invitar and the invite reward (F-47, F-48): slots and link, copy with and without clipboard access, WhatsApp, the
// share sheet and its fallback, and in real mode claim → first accept → +100 / +50 once → golden cap. Spanish-only copy.
import type { Page } from "@playwright/test";
import { invites as invitesExample } from "../../lib/api/examples";
import { ClaimedInvite, Invites, Me } from "../../lib/api/schemas";
import { common, connect, home, invite as copy } from "../../lib/copy/es";
import { firstName } from "../../lib/format";
import { GOLDEN_CAP } from "../../lib/monito/look";
import { GOLDEN_CAP_INVITES, INVITE_POINTS } from "../../lib/points";
import type { SignedInUser } from "../fixtures/two-users";
import { acceptedConnection, call, expect, expectApiError, expectErrorScreen, skipTours, test } from "../profiles/helpers";

const shownLink = (url: string) => url.replace(/^https?:\/\//, "");

if (!invitesExample.link) throw new Error("the invites example has no link");
const mockLink = invitesExample.link;

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
    await expect(page.getByText(shownLink(mockLink.url), { exact: true })).toBeVisible();
    await expect(page.getByText(copy.forEvent(mockLink.event.name))).toBeVisible();
    await expect(page.getByRole("link", { name: copy.showQr })).toHaveAttribute("href", "/connect");
    await expect(page.getByRole("link", { name: common.close })).toHaveAttribute("href", "/home");
  });

  test("Copiar puts the link on the clipboard and says so @mock", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are a Chromium feature");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/invite");
    await page.getByRole("button", { name: copy.copy, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.copied, exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(mockLink.url);
    await expect(page.getByRole("button", { name: copy.copy, exact: true })).toBeVisible();
  });

  test("a denied clipboard selects the link instead of claiming it was copied @mock", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } });
    });
    await page.goto("/invite");
    await page.getByRole("button", { name: copy.copy, exact: true }).click();
    await expect.poll(() => selectedText(page)).toBe(shownLink(mockLink.url));
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
    expect(text).toBe(copy.shareText(mockLink.url, mockLink.event.name));
    await opened.close();
  });

  for (const via of [copy.more, copy.instagram]) {
    test(`${via} opens the share sheet with the link @mock`, async ({ page }) => {
      await stubShare(page);
      await page.goto("/invite");
      await page.getByRole("button", { name: via, exact: true }).click();
      await expect.poll(() => page.locator("html").getAttribute("data-shared")).toBe(JSON.stringify({ text: copy.shareText(mockLink.url, mockLink.event.name), url: mockLink.url }));
    });
  }

  test("without a share sheet Más falls back to copying @mock", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are a Chromium feature");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await noShareSheet(page);
    await page.goto("/invite");
    await page.getByRole("button", { name: copy.more, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.copied, exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(mockLink.url);
  });

  test("the QR button and the close button navigate @mock", async ({ page }) => {
    await page.goto("/invite");
    await page.getByRole("link", { name: copy.showQr }).click();
    await expect(page).toHaveURL(/\/connect$/);
    await page.goto("/invite");
    await page.getByRole("link", { name: common.close }).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("outside an event the API gives no link @mock", async ({ page }) => {
    const response = await page.request.get("/api/invites/me", { headers: { "x-compa-mock-example": "noEvent" } });
    expect(Invites.parse(await response.json())).toMatchObject({ link: null, target: invitesExample.target });
  });

  test("a failed invite load shows the error screen @mock", async ({ page, mock }) => {
    await mock.mockServerError("unauthorized");
    await page.goto("/invite");
    await expectErrorScreen(page);
  });
});

const invitesOf = (who: SignedInUser) => call(who.page.request, "GET", "/api/invites/me", Invites);
// Rankings are cached per server instance for 3 s (wiki/conference-scale.md), so points settle within a few seconds.
const POINTS_POLL = { timeout: 8_000 };
const pointsOf = async (who: SignedInUser) => (await call(who.page.request, "GET", "/api/me", Me)).scores?.event.points ?? 0;
const claim = (who: SignedInUser, code: string) => call(who.page.request, "POST", `/api/invites/${code}/claim`, ClaimedInvite, {});

// The open invite row is created when its owner first loads it while checked in (/invite or the home card).
const openInvite = async (inviter: SignedInUser) => {
  const { link } = await invitesOf(inviter);
  if (!link) throw new Error("no invite link: the inviter is not checked in to an event");
  return link.code;
};

test.describe("invite in real mode", () => {
  test("my link uses my handle, names my event and every slot starts empty @real", async ({ people, baseURL, testEvent }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    const invites = await invitesOf(ana);
    const url = new URL(`/i/${ana.user.handle}`, baseURL).toString();
    expect(invites).toMatchObject({ link: { code: ana.user.handle, url, event: { code: testEvent.accessCode, name: testEvent.name } }, invitees: [], target: GOLDEN_CAP_INVITES, goldenCap: false });
    await ana.page.goto("/invite");
    await expect(ana.page.getByText(shownLink(url), { exact: true })).toBeVisible();
    await expect(ana.page.getByText(copy.forEvent(testEvent.name))).toBeVisible();
    await expect(ana.page.getByText(copy.progress(0, GOLDEN_CAP_INVITES), { exact: true })).toBeVisible();
    for (const slot of [1, 2, 3]) await expect(ana.page.getByText(copy.friendSlot(slot), { exact: true })).toBeVisible();
  });

  test("outside an event there is no link, no invite button and nothing is created @real", async ({ people }) => {
    const [ana] = await people([{}], { checkIn: false });
    if (!ana) throw new Error("test user not created");
    expect(await invitesOf(ana)).toMatchObject({ link: null, invitees: [], target: GOLDEN_CAP_INVITES });
    await ana.page.goto("/invite");
    await expect(ana.page.getByText(copy.noEventTitle)).toBeVisible();
    await expect(ana.page.getByText(copy.noEvent)).toBeVisible();
    await expect(ana.page.getByRole("button", { name: copy.copy, exact: true })).toHaveCount(0);
    await ana.page.goto("/home");
    await expect(ana.page.getByRole("link", { name: new RegExp(home.inviteTitle) })).toHaveCount(0);
    await ana.page.goto("/connect");
    await expect(ana.page.getByRole("link", { name: connect.invite })).toHaveCount(0);
  });

  test("inside an event home and Conectar offer the invite @real", async ({ people }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    await ana.page.goto("/home");
    await expect(ana.page.getByRole("link", { name: new RegExp(home.inviteTitle) })).toBeVisible();
    await ana.page.goto("/connect");
    await expect(ana.page.getByRole("link", { name: connect.invite })).toHaveAttribute("href", "/invite");
  });

  test("an unknown or own code cannot be claimed @real", async ({ people }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    await expectApiError(await ana.page.request.post("/api/invites/no-such-invite-code/claim", { data: {} }), 404, "not_found");
    await expectApiError(await ana.page.request.post(`/api/invites/${await openInvite(ana)}/claim`, { data: {} }), 404, "not_found");
  });

  test("the invitee's first accept pays +100 and +50 once @real", async ({ people, testEvent }) => {
    const [inviter, invitee, bruno, carla] = await people([{}, {}, {}, {}]);
    if (!inviter || !invitee || !bruno || !carla) throw new Error("test users not created");
    const claimed = await claim(invitee, await openInvite(inviter));
    expect(claimed.inviter.handle).toBe(inviter.user.handle);
    expect(claimed.event.code).toBe(testEvent.accessCode);
    await acceptedConnection(invitee, bruno);
    await expect.poll(() => pointsOf(inviter), POINTS_POLL).toBe(INVITE_POINTS.inviter);
    await expect.poll(() => pointsOf(invitee), POINTS_POLL).toBe(50 + INVITE_POINTS.invitee);

    await acceptedConnection(carla, invitee);
    await expect.poll(() => pointsOf(inviter), POINTS_POLL).toBe(INVITE_POINTS.inviter);
    await expect.poll(() => pointsOf(invitee), POINTS_POLL).toBe(100 + INVITE_POINTS.invitee);
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

  test("a second claim of a used link never unlinks the first friend @real", async ({ people }) => {
    const [inviter, first, second] = await people([{}, {}, {}]);
    if (!inviter || !first || !second) throw new Error("test users not created");
    const code = await openInvite(inviter);
    await claim(first, code);
    await claim(second, code);
    const invites = await invitesOf(inviter);
    expect(invites.invitees.map((invitee) => invitee.person.handle)).toEqual([first.user.handle]);
  });

  test("two friends who claim the same shared link both count @real", async ({ people }) => {
    test.fixme(true, "OPEN QUESTION 59 (wiki/open-questions.md): a used link links nobody else; crediting later friends is undecided (farming risk)");
    const [inviter, first, second] = await people([{}, {}, {}]);
    if (!inviter || !first || !second) throw new Error("test users not created");
    const code = await openInvite(inviter);
    await claim(first, code);
    await claim(second, code);
    await acceptedConnection(first, second);
    const invites = await invitesOf(inviter);
    expect(invites.invitees.map((invitee) => invitee.person.handle).sort()).toEqual([first.user.handle, second.user.handle].sort());
    await expect.poll(() => pointsOf(inviter), POINTS_POLL).toBe(2 * INVITE_POINTS.inviter);
  });
});
