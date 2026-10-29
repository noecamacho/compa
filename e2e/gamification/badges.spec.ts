// 10 Insignias (F-44): earned, close and secret badges, the three filters, the back link and a failed list. Badge names
// and the screen copy are Spanish-only (lib/badges/catalog.ts, lib/copy/es.ts), so both locales assert them.
import type { Page } from "@playwright/test";
import { badgeList, valeriaPublic } from "../../lib/api/examples";
import { BadgeList } from "../../lib/api/schemas";
import { BADGES, BADGE_IDS, isSecret } from "../../lib/badges/catalog";
import { badges as copy, common } from "../../lib/copy/es";
import { acceptedConnection, call, expect, skipTours, test } from "../profiles/helpers";

// A badge tile's image says its name, plus ", por ganar" while it is locked (components/badges/Badge.tsx).
const tile = (page: Page, id: keyof typeof BADGES, earned: boolean) =>
  page.getByRole("img", { name: earned ? BADGES[id].name : `${BADGES[id].name}, por ganar`, exact: true });

const earnedIds = badgeList.badges.filter((status) => status.earnedAt).map((status) => status.id);
const pendingIds = badgeList.badges.filter((status) => !status.earnedAt).map((status) => status.id);

test.describe("badges in mock mode", () => {
  test.beforeEach(async ({ page }) => skipTours(page));

  test("shows the count, the close and secret summary, and every badge @mock", async ({ page }) => {
    await page.goto("/me/badges");
    await expect(page.getByRole("heading", { name: copy.title })).toBeVisible();
    await expect(page.getByText(copy.earned(badgeList.earned, badgeList.total))).toBeVisible();
    await expect(page.getByText(copy.summary(4, 4))).toBeVisible();
    for (const id of earnedIds) await expect(tile(page, id, true)).toBeVisible();
    for (const id of pendingIds) await expect(tile(page, id, false)).toBeVisible();
    await expect(page.getByText(copy.secret, { exact: true })).toHaveCount(pendingIds.filter(isSecret).length);
    await expect(page.getByText(copy.progress(7, 10, "te escanearon"))).toBeVisible();
    await expect(page.getByRole("link", { name: common.back })).toHaveAttribute("href", "/me");
  });

  test("the filters split earned from still to earn @mock", async ({ page }) => {
    await page.goto("/me/badges");
    const filters = page.getByRole("group", { name: copy.filterLabel });
    await filters.getByRole("button", { name: copy.filters.earned }).click();
    await expect(page.getByRole("img", { name: /, por ganar$/ })).toHaveCount(0);
    for (const id of earnedIds) await expect(tile(page, id, true)).toBeVisible();
    await filters.getByRole("button", { name: copy.filters.pending }).click();
    await expect(page.getByRole("img", { name: /, por ganar$/ })).toHaveCount(pendingIds.length);
    await expect(tile(page, "apreton", true)).toHaveCount(0);
    await filters.getByRole("button", { name: copy.filters.all }).click();
    await expect(page.getByRole("img", { name: /, por ganar$/ })).toHaveCount(pendingIds.length);
    await expect(tile(page, "apreton", true)).toBeVisible();
  });

  test("from another person's shelf the back link returns to them @mock", async ({ page }) => {
    await page.goto(`/me/badges?of=${valeriaPublic.handle}`);
    await page.getByRole("link", { name: common.back }).click();
    await expect(page).toHaveURL(new RegExp(`/people/${valeriaPublic.handle}$`));
  });

  test("a failed list renders empty instead of the error screen @mock", async ({ page, mock }) => {
    await mock.mockServerError("unauthorized");
    await page.goto("/me/badges");
    await expect(page.getByText(copy.earned(0, BADGE_IDS.length))).toBeVisible();
    await expect(page.getByRole("img", { name: BADGES.apreton.name })).toHaveCount(0);
  });
});

test.describe("badges in real mode", () => {
  test("a newcomer has every badge locked and secret ones without a hint @real", async ({ people }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    await ana.page.goto("/me/badges");
    await expect(ana.page.getByText(copy.earned(0, BADGE_IDS.length))).toBeVisible();
    await expect(ana.page.getByRole("img", { name: /, por ganar$/ })).toHaveCount(BADGE_IDS.length);
    await expect(ana.page.getByText(copy.secret, { exact: true })).toHaveCount(BADGE_IDS.filter(isSecret).length);
  });

  test("the first accepted connection earns Primer apretón @real", async ({ people }) => {
    const [ana, bruno] = await people([{}, {}]);
    if (!ana || !bruno) throw new Error("test users not created");
    await acceptedConnection(ana, bruno);
    // Badges are awarded right after the accept response (conference-scale finding 13), so wait for them.
    const earned = async () => (await call(ana.page.request, "GET", "/api/badges", BadgeList)).badges.find((status) => status.id === "apreton")?.earnedAt ?? null;
    await expect.poll(earned).toBeTruthy();
    const list = await call(ana.page.request, "GET", "/api/badges", BadgeList);
    await ana.page.goto("/me/badges");
    await expect(ana.page.getByText(copy.earned(list.earned, list.total))).toBeVisible();
    await ana.page.getByRole("group", { name: copy.filterLabel }).getByRole("button", { name: copy.filters.earned }).click();
    await expect(tile(ana.page, "apreton", true)).toBeVisible();
    await expect(ana.page.getByRole("img", { name: /, por ganar$/ })).toHaveCount(0);
  });
});
