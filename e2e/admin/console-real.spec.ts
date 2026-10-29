// The console UI against real data, as the seeded test admin: search, sort and phase filter on this run's events, then
// End now, Archive and Restore through the menus. Run against a real-mode server (docs/testing/real-mode.md) with
// E2E_BASE_URL, TEST_AUTOMATION_SECRET and, for the SQL cleanup, a local DATABASE_URL.
import type { BrowserContext, Page } from "@playwright/test";
import { CreatedEvent } from "../../lib/api/schemas";
import { copyFor } from "../../lib/copy";
import type { TestSessionCookies } from "../../lib/testing/real-mode";
import { expect, test } from "../fixtures";
import { adminApi, harnessFor, localSql, runPrefix, signInAsTestAdmin, type AdminApi, type Sql } from "./real-helpers";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const P = runPrefix();
const copy = copyFor("en").admin;
const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Alpha is running, Bravo and Charlie are upcoming; names sort by their suffix.
const PLAN = [
  { key: "alpha", start: -HOUR, end: 2 * HOUR },
  { key: "bravo", start: 2 * DAY, end: 3 * DAY },
  { key: "charlie", start: 3 * DAY, end: 4 * DAY },
] as const;
const nameOf = (key: string) => `${P} ${key[0]?.toUpperCase()}${key.slice(1)}`;
const NAMES = PLAN.map((plan) => nameOf(plan.key));

async function addSession(context: BrowserContext, session: TestSessionCookies) {
  await context.addCookies(
    session.cookies.map(({ name, value, path, httpOnly, secure, sameSite, expires }) => ({
      name,
      value,
      url: new URL(path, baseUrl).toString(),
      httpOnly,
      secure,
      sameSite,
      ...(expires ? { expires } : {}),
    })),
  );
}

// The event names in the table, top to bottom (the name links are labelled "Open: <name>").
const tableNames = (page: Page) =>
  page
    .getByRole("table")
    .locator("tbody tr")
    .getByRole("link", { name: new RegExp(`^${copy.events.open}: `) })
    .evaluateAll((links) => links.map((link) => link.textContent ?? ""));

test.describe("admin console UI @real", () => {
  test.skip(!process.env.TEST_AUTOMATION_SECRET, "real mode needs TEST_AUTOMATION_SECRET");
  test.describe.configure({ mode: "serial", timeout: 240_000 });

  let session: TestSessionCookies;
  let api: AdminApi;
  let sql: Sql | null = null;

  // One project: the run's events are shared state, and the flow reads the table, so desktop width in English.
  test.beforeAll(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440-en", "the console real-data flow runs in desktop-1440-en only");
    sql = localSql();
    session = await signInAsTestAdmin(harnessFor(baseUrl));
    api = adminApi(baseUrl, session);
    const now = Date.now();
    for (const plan of PLAN) {
      const body = { slug: `${P}-${plan.key}`, name: nameOf(plan.key), startsAt: new Date(now + plan.start).toISOString(), endsAt: new Date(now + plan.end).toISOString(), isTest: true };
      await api.post("/api/admin/events", body, CreatedEvent);
    }
  });

  test.afterAll(async () => {
    if (sql) {
      await sql`delete from events where slug like ${`${P}-%`}`;
      await sql.end();
      return;
    }
    // shortcut: without a local DATABASE_URL the run's events stay behind, archived; delete them by hand if they pile up.
    for (const plan of PLAN) await api?.raw("POST", `/api/admin/events/${P}-${plan.key}/archive`);
  });

  test("search, sort, phase chip, then End now, Archive and Restore through the menus @real", async ({ context, page }) => {
    await addSession(context, session);
    const chips = page.getByRole("navigation", { name: copy.ui.sort.status });
    const chip = (label: string) => chips.getByRole("link", { name: new RegExp(`^${label}`) });

    await test.step("the test admin banner and a search by the run prefix", async () => {
      await page.goto("/admin");
      await expect(page.getByText(copy.ui.nav.testAdminBanner).first()).toBeVisible();
      const search = page.getByRole("searchbox", { name: copy.ui.eventList.searchLabel });
      await search.fill(P);
      await search.press("Enter");
      await expect(page).toHaveURL(new RegExp(`[?&]q=${P}(&|$)`));
      await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(3);
      await expect(page.getByRole("status").filter({ hasText: copy.ui.list.range(1, 3, 3) })).toBeVisible();
    });

    await test.step("sort by name both ways", async () => {
      const header = page.getByRole("columnheader", { name: copy.ui.colEvent, exact: true });
      await header.getByRole("link").click();
      await expect(header).toHaveAttribute("aria-sort", "ascending");
      expect(await tableNames(page)).toEqual(NAMES);
      await header.getByRole("link").click();
      await expect(header).toHaveAttribute("aria-sort", "descending");
      expect(await tableNames(page)).toEqual([...NAMES].reverse());
    });

    await test.step("phase chips", async () => {
      await chip(copy.ui.phase.running).click();
      await expect(page).toHaveURL(/[?&]phase=running(&|$)/);
      await expect.poll(() => tableNames(page)).toEqual([NAMES[0]]);
      await chip(copy.ui.phase.upcoming).click();
      await expect(page).toHaveURL(/[?&]phase=upcoming(&|$)/);
      await expect.poll(async () => (await tableNames(page)).sort()).toEqual([NAMES[1], NAMES[2]]);
    });

    const alpha = NAMES[0] ?? "";
    const header = page.locator("main header").first();
    const runFromMenu = async (item: string, dialogTitle: string, confirm: string) => {
      await page.getByRole("button", { name: copy.ui.menu.moreFor(alpha) }).click();
      await page.locator(":popover-open").getByRole("button", { name: item }).click();
      const dialog = page.getByRole("dialog", { name: dialogTitle });
      await expect(dialog.getByRole("button", { name: copy.ui.cancel })).toBeFocused();
      await dialog.getByRole("button", { name: confirm }).click();
      await expect(dialog).toBeHidden();
    };

    await test.step("End now from the event menu", async () => {
      await page.goto(`/admin/events/${P}-alpha`);
      await expect(header.getByText(copy.ui.phase.running, { exact: true })).toBeVisible();
      await runFromMenu(copy.detail.end, copy.ui.dialogs.end.title, copy.ui.dialogs.end.confirm);
      await expect(page.getByText(copy.ui.dialogs.end.done)).toBeVisible();
      await expect(header.getByText(copy.ui.phase.ended, { exact: true })).toBeVisible();
    });

    await test.step("Archive, then it is listed under Archived", async () => {
      await runFromMenu(copy.detail.archive, copy.ui.dialogs.archive.title, copy.ui.dialogs.archive.confirm);
      await expect(header.getByText(copy.ui.phase.archived, { exact: true })).toBeVisible();
      await page.goto(`/admin?q=${P}`);
      await expect.poll(async () => (await tableNames(page)).includes(alpha)).toBe(false);
      await chip(copy.ui.phase.archived).click();
      await expect(page).toHaveURL(/[?&]phase=archived(&|$)/);
      await expect.poll(() => tableNames(page)).toEqual([alpha]);
    });

    await test.step("Restore from the row menu brings it back as ended", async () => {
      await page.getByRole("button", { name: copy.ui.menu.moreFor(alpha) }).click();
      await page.locator(":popover-open").getByRole("button", { name: copy.ui.menu.restore }).click();
      await expect(page.getByText(copy.ui.eventList.restored)).toBeVisible();
      await expect.poll(() => tableNames(page)).toEqual([]);
      await chip(copy.ui.phase.ended).click();
      await expect.poll(() => tableNames(page)).toEqual([alpha]);
    });
  });
});
