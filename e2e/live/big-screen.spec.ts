// The projected big screen /e/<code>/live at 1920×1080 (F-51..F-54): counters, the leaderboard and person cards,
// live updates after an accept, the empty event, polling failures, rotated codes, and no email anywhere.
import type { Page } from "@playwright/test";
import { leaderboard as leaderboardExample, liveSnapshot, valeriaPublic } from "../../lib/api/examples";
import { Leaderboard, LivePersonCard, LiveSnapshot, type LiveSnapshotT } from "../../lib/api/schemas";
import { formatNumber, type Dictionary } from "../../lib/copy";
import type { Locale } from "../../lib/i18n";
import { LIVE_BOARD_ROWS } from "../../lib/live/live-model";
import { connectAndAccept, copyOf, endedWindow, expect, expectEventNotFound, localeOf, test } from "../events/helpers";

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const COUNTERS = ["checkedIn", "connections", "newCount", "reconnections"] as const;

type Watch = { errors: string[]; payloads: string[] };

// Console errors, uncaught exceptions and every API body the page receives, to assert on at the end.
function watch(page: Page): Watch {
  const seen: Watch = { errors: [], payloads: [] };
  page.on("console", (message) => message.type() === "error" && seen.errors.push(message.text()));
  page.on("pageerror", (error) => seen.errors.push(error.message));
  page.on("response", (response) => {
    if (!response.url().includes("/api/")) return;
    response.text().then((text) => seen.payloads.push(text), () => undefined);
  });
  return seen;
}

async function expectNoEmail(page: Page, seen: Watch): Promise<void> {
  expect(await page.content()).not.toMatch(EMAIL);
  for (const payload of seen.payloads) expect(payload).not.toMatch(EMAIL);
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const counter = (page: Page, label: string) => page.locator("dt", { hasText: new RegExp(`^${escape(label)}$`) }).locator("xpath=following-sibling::dd");

async function expectCounters(page: Page, copy: Dictionary, locale: Locale, counters: LiveSnapshotT["counters"]): Promise<void> {
  for (const key of COUNTERS) await expect(counter(page, copy.live[key])).toHaveText(formatNumber(locale, counters[key]));
}

const board = (page: Page, copy: Dictionary) => page.getByRole("region", { name: copy.live.leaderboard });

test.describe("big screen in mock mode @mock", () => {
  const code = liveSnapshot.event.code;

  test("shows the event, its counters, the join QR, the legend and the board in snapshot order", async ({ page }, testInfo) => {
    const copy = copyOf(testInfo);
    const seen = watch(page);
    await page.goto(`/e/${code}/live`);
    await expect(page.getByRole("heading", { level: 1, name: liveSnapshot.event.name })).toBeVisible();
    await expect(page.getByText(copy.live.live, { exact: true })).toBeVisible();
    await expectCounters(page, copy, localeOf(testInfo), liveSnapshot.counters);
    // The origin is NEXT_PUBLIC_SITE_URL when set, so only the door path is asserted.
    await expect(page.getByRole("img", { name: new RegExp(`^https?://[^/]+/e/${code}$`) })).toBeVisible();
    await expect(page.getByText(copy.live.scanToJoin)).toBeVisible();
    await expect(page.getByText(copy.live.legendNew, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.live.legendReconnection, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.live.hint)).toBeVisible();
    await expect(page.getByRole("region", { name: copy.live.vizLabel })).toBeVisible();
    const rows = board(page, copy).getByRole("listitem");
    // The board shows the top LIVE_BOARD_ROWS, readable from 10 m.
    const shown = liveSnapshot.people.slice(0, LIVE_BOARD_ROWS);
    await expect(rows).toHaveCount(shown.length);
    for (const [index, person] of shown.entries()) await expect(rows.nth(index)).toContainText(person.name);
    await expectNoEmail(page, seen);
    expect(seen.errors).toEqual([]);
  });

  test("tapping a board row opens the public card, and closing returns to the board", async ({ page }, testInfo) => {
    const copy = copyOf(testInfo);
    const locale = localeOf(testInfo);
    await page.goto(`/e/${code}/live`);
    const cardRequest = page.waitForResponse((response) => response.url().endsWith(`/api/e/${code}/live/people/${valeriaPublic.id}`));
    await board(page, copy).getByRole("button", { name: new RegExp(valeriaPublic.name) }).click();
    expect((await cardRequest).status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: valeriaPublic.name })).toBeVisible();
    await expect(page.getByText([valeriaPublic.headline, valeriaPublic.company, valeriaPublic.city].join(" · "))).toBeVisible();
    await expect(page.getByText(formatNumber(locale, 1980), { exact: true })).toBeVisible();
    await expect(page.getByText("#1", { exact: true })).toBeVisible();
    for (const interest of valeriaPublic.interests ?? []) await expect(page.getByRole("listitem").filter({ hasText: interest })).toBeVisible();
    await page.getByRole("button", { name: copy.live.close }).click();
    await expect(board(page, copy)).toBeVisible();
  });

  test("a card that cannot load says so and still closes", async ({ page, mock }, testInfo) => {
    const copy = copyOf(testInfo);
    await mock.mockError("attendee_not_found", "**/api/e/*/live/people/*");
    await page.goto(`/e/${code}/live`);
    await board(page, copy).getByRole("button", { name: new RegExp(valeriaPublic.name) }).click();
    const panel = page.locator("section[aria-live=polite]");
    await expect(panel.getByText(copy.live.stale)).toBeVisible();
    await page.getByRole("button", { name: copy.live.close }).click();
    await expect(board(page, copy)).toBeVisible();
  });

  test("failed polls show reconnecting, keep the last numbers, and recover", async ({ page }, testInfo) => {
    const copy = copyOf(testInfo);
    await page.goto(`/e/${code}/live`);
    const reconnecting = page.getByRole("status").filter({ hasText: copy.live.stale });
    await expect(reconnecting).toHaveCount(0);
    await page.route("**/api/e/*/live", (route) => route.abort());
    await expect(reconnecting).toBeVisible({ timeout: 10_000 });
    await expectCounters(page, copy, localeOf(testInfo), liveSnapshot.counters);
    await page.unroute("**/api/e/*/live");
    await expect(reconnecting).toHaveCount(0, { timeout: 10_000 });
  });

  test("an unknown code shows the not-found door", async ({ page, mock }, testInfo) => {
    await mock.mockServerError("event_not_found");
    const response = await page.goto("/e/zzzzzzzzzz/live");
    expect(response?.status()).toBe(404);
    await expectEventNotFound(page, copyOf(testInfo));
  });

  test("the leaderboard and person routes answer their documented examples", async ({ page }) => {
    const rows = Leaderboard.parse(await (await page.request.get(`/api/e/${code}/leaderboard`)).json()).rows;
    expect(rows.map((row) => row.userId)).toEqual(leaderboardExample.rows.map((row) => row.userId));
    const card = LivePersonCard.parse(await (await page.request.get(`/api/e/${code}/live/people/${valeriaPublic.id}`)).json());
    expect(card).toMatchObject({ points: 1980, rank: 1 });
  });
});

test.describe("big screen in real mode @real", () => {
  test("an empty event shows zeros and the empty state, with no errors", async ({ page, throwawayEvent }, testInfo) => {
    const copy = copyOf(testInfo);
    const event = await throwawayEvent();
    const seen = watch(page);
    await page.goto(`/e/${event.code}/live`);
    await expect(page.getByRole("heading", { level: 1, name: event.name })).toBeVisible();
    await expect(page.getByText(copy.live.live, { exact: true })).toBeVisible();
    await expectCounters(page, copy, localeOf(testInfo), { checkedIn: 0, connections: 0, newCount: 0, reconnections: 0 });
    await expect(board(page, copy).getByText(copy.live.empty)).toBeVisible();
    await expect(board(page, copy).getByRole("listitem")).toHaveCount(0);
    expect(seen.errors).toEqual([]);
  });

  test("an accept between two attendees updates the counters, the edge and the board, without leaking email", async ({ page, baseURL, realMode, freshUsers, throwawayEvent }, testInfo) => {
    const copy = copyOf(testInfo);
    const locale = localeOf(testInfo);
    const event = await throwawayEvent();
    const people = await freshUsers({ count: 3, checkInTo: event.slug });
    const [ana, bruno] = people;
    if (!ana || !bruno) throw new Error("test users not created");
    const seen = watch(page);
    await page.goto(`/e/${event.code}/live`);
    await expectCounters(page, copy, locale, { checkedIn: 3, connections: 0, newCount: 0, reconnections: 0 });
    await expect(board(page, copy).getByRole("listitem")).toHaveCount(3);

    const base = baseURL ?? "";
    await connectAndAccept(base, await realMode.signInAs(ana), await realMode.signInAs(bruno));
    const snapshot = LiveSnapshot.parse(await (await page.request.get(`/api/e/${event.code}/live`)).json());
    expect(snapshot.connections).toEqual([expect.objectContaining({ a: ana.id, b: bruno.id, kind: "new" })]);
    expect(snapshot.counters).toEqual({ checkedIn: 3, connections: 1, newCount: 1, reconnections: 0 });
    // One poll (3 s) plus the 1 s shared cache.
    await expectCounters(page, copy, locale, snapshot.counters);

    const ranked = Leaderboard.parse(await (await page.request.get(`/api/e/${event.code}/leaderboard`)).json()).rows;
    expect(ranked.slice(0, 2).map((row) => row.userId).sort()).toEqual([ana.id, bruno.id].sort());
    for (const [index, row] of ranked.entries()) expect(row.points).toBeLessThanOrEqual(ranked[index - 1]?.points ?? row.points);
    const rows = board(page, copy).getByRole("listitem");
    for (const [index, row] of ranked.entries()) await expect(rows.nth(index)).toContainText(row.name);
    await expect(rows.first()).toContainText(`${formatNumber(locale, ranked[0]?.points ?? 0)} ${copy.live.points}`);

    for (const person of people) expect(await page.content()).not.toContain(person.email ?? "@test.compa.lol");
    await expectNoEmail(page, seen);
    expect(seen.errors).toEqual([]);
  });

  test("a person card shows public fields only", async ({ page, freshUsers, throwawayEvent }, testInfo) => {
    const copy = copyOf(testInfo);
    const event = await throwawayEvent();
    const profile = {
      name: "Card Check",
      headline: "Public headline",
      company: "Hidden Company",
      city: "Guadalajara",
      links: { github: "https://github.com/card-check", x: "https://x.com/card-check" },
      visibility: { headline: "public", company: "hidden", links: { github: "connections", x: "public" } },
    } as const;
    const [person] = await freshUsers({ users: [profile], checkInTo: event.slug });
    if (!person) throw new Error("test user not created");

    const response = await page.request.get(`/api/e/${event.code}/live/people/${person.id}`);
    expect(response.status()).toBe(200);
    const body = LivePersonCard.parse(await response.json());
    expect(body).toMatchObject({ points: 0, connections: 0, rank: 1, card: { id: person.id, name: profile.name, headline: profile.headline } });
    expect(body.card.company).toBeUndefined();
    expect(body.card.links?.github).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(EMAIL);

    await page.goto(`/e/${event.code}/live`);
    await board(page, copy).getByRole("button", { name: new RegExp(profile.name) }).click();
    await expect(page.getByRole("heading", { level: 2, name: profile.name })).toBeVisible();
    await expect(page.getByText(profile.headline, { exact: false })).toBeVisible();
    await expect(page.getByText(profile.company)).toHaveCount(0);
    await expect(page.getByText(person.email ?? "@test.compa.lol")).toHaveCount(0);
  });

  test("person and leaderboard routes reject unknown people, bad input and unknown codes", async ({ page, testEvent }) => {
    const code = testEvent.accessCode;
    const stranger = await page.request.get(`/api/e/${code}/live/people/00000000-0000-4000-8000-000000000000`);
    expect(stranger.status()).toBe(404);
    expect((await stranger.json()).error.code).toBe("attendee_not_found");
    expect((await page.request.get(`/api/e/${code}/live/people/not-a-uuid`)).status()).toBe(400);
    expect((await page.request.get(`/api/e/${code}/leaderboard?limit=0`)).status()).toBe(400);
    expect((await page.request.get(`/api/e/${code}/leaderboard?scope=lifetime&limit=5`)).status()).toBe(200);
    for (const path of ["/api/e/zzzzzzzzzz/live", "/api/e/zzzzzzzzzz/leaderboard", "/api/e/zzzzzzzzzz/live/people/00000000-0000-4000-8000-000000000000"]) {
      const response = await page.request.get(path);
      expect(response.status()).toBe(404);
      expect((await response.json()).error.code).toBe("event_not_found");
    }
  });

  test("rotating the code while the screen is open turns it into the not-found door", async ({ page, throwawayEvent, rotateCode }, testInfo) => {
    const copy = copyOf(testInfo);
    const event = await throwawayEvent();
    await page.goto(`/e/${event.code}/live`);
    await expect(page.getByRole("heading", { level: 1, name: event.name })).toBeVisible();
    await rotateCode(event);
    await expectEventNotFound(page, copy);
  });

  test("an ended event still shows its screen, without the LIVE badge", async ({ page, throwawayEvent }, testInfo) => {
    const copy = copyOf(testInfo);
    const event = await throwawayEvent(endedWindow());
    await page.goto(`/e/${event.code}/live`);
    await expect(page.getByRole("heading", { level: 1, name: event.name })).toBeVisible();
    await expect(page.getByText(copy.live.live, { exact: true })).toHaveCount(0);
  });
});
