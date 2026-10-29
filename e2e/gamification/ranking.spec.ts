// 11 Ranking (F-45, F-46): tonight's podium and my card with the gap to the next person, the all-year board, the links
// and the leaderboard API. Spanish-only copy, so both locales assert lib/copy/es.
import type { Page } from "@playwright/test";
import { leaderboard, leaderboardLifetime, me as diego, valeriaPublic } from "../../lib/api/examples";
import { Leaderboard, Me, type LeaderboardT } from "../../lib/api/schemas";
import { common, ranking as copy, tour } from "../../lib/copy/es";
import { firstName, formatPoints } from "../../lib/format";
import { acceptedConnection, call, expect, expectApiError, expectErrorScreen, skipTours, test } from "../profiles/helpers";

const scopeButton = (page: Page, label: string) => page.getByRole("group", { name: copy.scopeLabel }).getByRole("button", { name: label });

// The podium is three links in the order 2, 1, 3 on screen; each holds the first name and the points.
async function expectPodium(page: Page, board: LeaderboardT): Promise<void> {
  for (const row of board.rows.slice(0, 3)) {
    await expect(page.getByRole("link", { name: new RegExp(`${firstName(row.name)}.*${row.rank}.*${formatPoints("es", row.points)}`) }).first()).toBeVisible();
  }
}

async function expectMyCard(page: Page, board: LeaderboardT, sub: string): Promise<void> {
  const mine = board.me;
  if (!mine) throw new Error("the board has no `me`");
  await expect(page.getByText(copy.youRank(mine.rank), { exact: true })).toBeVisible();
  await expect(page.getByText(copy.youSub(formatPoints("es", mine.points), sub), { exact: true })).toBeVisible();
  if (!mine.above) return;
  await expect(page.getByText(copy.toPass(firstName(mine.above.name)), { exact: true })).toBeVisible();
  await expect(page.getByText(copy.pointsShort(mine.gap), { exact: true })).toBeVisible();
  if (mine.tip) await expect(page.getByText(mine.tip)).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`#${mine.above.rank}.*${mine.above.name}`) })).toBeVisible();
}

test.describe("ranking in mock mode", () => {
  test.beforeEach(async ({ page }) => skipTours(page));

  test("tonight shows the podium, my place and the gap to the next @mock", async ({ page }) => {
    await page.goto("/ranking");
    await expect(page.getByRole("heading", { name: copy.title })).toBeVisible();
    await expect(page.getByText(common.liveShort, { exact: true })).toBeVisible();
    await expect(scopeButton(page, copy.tonight)).toHaveAttribute("aria-pressed", "true");
    await expectPodium(page, leaderboard);
    await expectMyCard(page, leaderboard, copy.tonightSub);
    await expect(page.getByRole("link", { name: copy.connectNow })).toHaveAttribute("href", "/connect");
    await expect(page.getByRole("link", { name: common.back })).toHaveAttribute("href", "/home");
  });

  test("all year switches to the lifetime board @mock", async ({ page }) => {
    await page.goto("/ranking");
    await scopeButton(page, copy.allYear).click();
    await expect(scopeButton(page, copy.allYear)).toHaveAttribute("aria-pressed", "true");
    await expectPodium(page, leaderboardLifetime);
    await expectMyCard(page, leaderboardLifetime, copy.inEvents(diego.stats?.events ?? 0));
    await scopeButton(page, copy.tonight).click();
    await expectMyCard(page, leaderboard, copy.tonightSub);
  });

  test("a podium place I am connected with opens their profile @mock", async ({ page }) => {
    await page.goto("/ranking");
    const first = page.getByRole("link", { name: new RegExp(`${firstName(valeriaPublic.name)}.*1.*${formatPoints("es", 1980)}`) });
    await expect(first).toHaveAttribute("href", `/people/${valeriaPublic.handle}`);
    await page.getByRole("link", { name: copy.connectNow }).click();
    await expect(page).toHaveURL(/\/connect$/);
  });

  test("a failed /api/me shows the error screen @mock", async ({ page, mock }) => {
    await mock.mockServerError("unauthorized");
    await page.goto("/ranking");
    await expectErrorScreen(page);
  });

  test("the tour explains the scope and my card on the first visit @mock", async ({ context, page }) => {
    await context.clearCookies();
    await page.addInitScript(() => localStorage.removeItem("compa:tour:ranking"));
    await page.goto("/ranking");
    await expect(page.getByRole("dialog", { name: tour.ranking[0]?.title })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: tour.next }).click();
    await expect(page.getByRole("dialog", { name: tour.ranking[1]?.title })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: tour.done }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("ranking in real mode", () => {
  test("a newcomer has no place yet, out of an event the boards are empty @real", async ({ people }) => {
    const [ana] = await people([{}]);
    const [outside] = await people([{}], { checkIn: false });
    if (!ana || !outside) throw new Error("test users not created");
    await ana.page.goto("/ranking");
    await expect(ana.page.getByText(copy.youRank(null), { exact: true })).toBeVisible();
    await expect(ana.page.getByText(copy.noRank)).toBeVisible();
    await outside.page.goto("/ranking");
    await expect(outside.page.getByText(copy.youRank(null), { exact: true })).toBeVisible();
    await expect(outside.page.getByText(copy.youSub("0", copy.tonightSub), { exact: true })).toBeVisible();
  });

  test("after an accepted connection my card matches the leaderboard, tonight and all year @real", async ({ people }) => {
    const [ana, bruno] = await people([{}, {}]);
    if (!ana || !bruno) throw new Error("test users not created");
    await acceptedConnection(ana, bruno);
    const code = (await call(ana.page.request, "GET", "/api/me", Me)).currentEvent?.code;
    if (!code) throw new Error("the test user is not checked in");
    // Other workers score at the same event, so the screen and a fresh board are compared until they agree.
    for (const scope of ["event", "lifetime"] as const) {
      await expect(async () => {
        await ana.page.goto("/ranking");
        if (scope === "lifetime") await scopeButton(ana.page, copy.allYear).click();
        const board = await call(ana.page.request, "GET", `/api/e/${code}/leaderboard?scope=${scope}`, Leaderboard);
        expect(board.me?.points).toBe(50);
        expect(board.me?.rank).not.toBeNull();
        await expect(ana.page.getByText(copy.youRank(board.me?.rank ?? null), { exact: true })).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 30_000 });
    }
  });

  test("the leaderboard API validates scope and limit and hides unknown codes @real", async ({ people }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    const code = (await call(ana.page.request, "GET", "/api/me", Me)).currentEvent?.code;
    if (!code) throw new Error("the test user is not checked in");
    const board = await call(ana.page.request, "GET", `/api/e/${code}/leaderboard?limit=3`, Leaderboard);
    expect(board.rows.length).toBeLessThanOrEqual(3);
    expect(board.rows.map((row) => row.points)).toEqual([...board.rows.map((row) => row.points)].sort((a, b) => b - a));
    await expectApiError(await ana.page.request.get(`/api/e/${code}/leaderboard?scope=forever`), 400, "invalid_input");
    await expectApiError(await ana.page.request.get(`/api/e/${code}/leaderboard?limit=0`), 400, "invalid_input");
    await expectApiError(await ana.page.request.get("/api/e/zzzzzzzzzz/leaderboard"), 404, "event_not_found");
  });
});
