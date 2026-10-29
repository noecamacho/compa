// The super-admin console in mock mode: the shell nav, the events list (KPIs, table or cards, sort, filters, search,
// pages, states, row menu, bulk bar), the event page tabs and the rotate confirm, the new-event slug, people filters and
// the test-user generator. The projects supply the viewport (390, 834, 1440) and the locale (es, en); assertions branch
// on the width where the layout does. Every page is checked for sideways overflow.
import type { Page, TestInfo } from "@playwright/test";
import { adminEvent, upcomingEvent } from "../../lib/api/admin-examples";
import { MOCK_HEADERS } from "../../lib/api/mock-headers";
import { copyFor } from "../../lib/copy";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { expect, test } from "../fixtures";

const MD = 768;
const LG = 1024;
const XL = 1280;

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Chips and tabs carry a count after the label ("People 340").
const startsWith = (label: string) => new RegExp(`^${escape(label)}`);

// Measured once the page has settled: right after a form GET commits, the dev server's stylesheet may not be applied
// yet and an unstyled table is briefly wider than the screen.
async function expectNoSidewaysScroll(page: Page, where: string) {
  await page.waitForLoadState("load");
  const overflow = () =>
    page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });
  await expect.poll(overflow, { message: `horizontal overflow on ${where}`, timeout: 5_000 }).toBeLessThanOrEqual(0);
}

async function open(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(200);
}

// Server-rendered states come from page-request headers that lib/api/server-fetch.ts forwards to every API call except
// the fixed /api/me gate. Not mock.mockServerError: its cookie also reaches /api/me, so the admin gate answers 404.
const serverMock = (page: Page, header: string, value: string) => page.setExtraHTTPHeaders({ [header]: value });

function setup(testInfo: TestInfo) {
  const viewport = testInfo.project.use.viewport ?? { width: 1440, height: 900 };
  const copy = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale)).admin;
  return { viewport, copy, phone: viewport.width < MD };
}

test.describe("admin console", () => {
  test.describe.configure({ timeout: 120_000 });

  test("shell: skip link and the nav for this width reach every section @mock", async ({ page }, testInfo) => {
    const { viewport, copy, phone } = setup(testInfo);
    await open(page, "/admin");
    // The loading skeleton (app/admin/loading.tsx) has its own shell and main; skip from the streamed page, not from it.
    await expect(page.getByRole("heading", { level: 1, name: copy.events.title })).toBeVisible();
    // The active element, not toBeFocused: parallel workers share one browser, so the window itself may lack focus.
    const activeId = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute("href"));
    await page.keyboard.press("Tab");
    await expect.poll(activeId).toBe("#admin-main");
    await expect(page.getByRole("link", { name: copy.ui.nav.skip })).toHaveAttribute("href", "#admin-main");
    await page.keyboard.press("Enter");
    await expect.poll(activeId).toBe("admin-main");

    // Bottom tabs below 768, an 80 px rail to 1279, a 248 px sidebar from 1280.
    const aside = page.locator("aside").first();
    if (phone) await expect(aside).toBeHidden();
    if (!phone) expect((await aside.boundingBox())?.width).toBe(viewport.width < XL ? 80 : 248);
    const nav = page.getByRole("navigation", { name: copy.navLabel });
    await expect(nav).toHaveCount(1);
    if (phone) expect((await nav.boundingBox())?.y).toBeGreaterThan(viewport.height - 100);

    const steps = [
      { label: copy.nav.people, url: /\/admin\/people$/, title: copy.people.title },
      { label: copy.nav.testUsers, url: /\/admin\/test-users$/, title: copy.tests.title },
      { label: copy.nav.events, url: /\/admin$/, title: copy.events.title },
    ];
    for (const step of steps) {
      await nav.getByRole("link", { name: step.label }).click();
      await expect(page).toHaveURL(step.url);
      await expect(nav.getByRole("link", { name: step.label })).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("heading", { level: 1, name: step.title })).toBeVisible();
      await expectNoSidewaysScroll(page, `${step.url}`);
    }
  });

  test("events list: KPIs, table or cards, sort, phase chip, search, row menu and bulk bar @mock", async ({ page }, testInfo) => {
    const { viewport, copy, phone } = setup(testInfo);
    await open(page, "/admin");
    const kpis = page.getByRole("region", { name: copy.ui.tabs.overview });
    await expect(kpis.getByText(copy.ui.kpi.running, { exact: true })).toBeVisible();
    await expect(kpis.getByText(copy.ui.kpi.checkIns, { exact: true })).toBeVisible();
    const openFirst = page.getByRole("link", { name: `${copy.events.open}: ${upcomingEvent.name}` });
    await expect(openFirst).toBeVisible();
    if (phone) await expect(page.getByRole("table")).toBeHidden();
    if (!phone) await expect(page.getByRole("table")).toBeVisible();
    await expectNoSidewaysScroll(page, "/admin");

    // Row menu: the ⋯ of the first row (a card on a phone) opens a popover that Esc closes.
    await page.getByRole("button", { name: copy.ui.menu.moreFor(upcomingEvent.name) }).click();
    const popover = page.locator(":popover-open");
    await expect(popover).toHaveCount(1);
    await expect(popover.getByRole("link", { name: copy.ui.menu.open, exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(popover).toHaveCount(0);

    if (!phone) {
      const byName = page.getByRole("columnheader", { name: copy.ui.colEvent, exact: true });
      await expect(page.getByRole("columnheader", { name: copy.ui.colWhen, exact: true })).toHaveAttribute("aria-sort", "descending");
      await expect(byName).toHaveAttribute("aria-sort", "none");
      await byName.getByRole("link").click();
      await expect(page).toHaveURL(/\/admin\?sort=name$/);
      await expect(byName).toHaveAttribute("aria-sort", "ascending");
      await byName.getByRole("link").click();
      await expect(page).toHaveURL(/\/admin\?sort=name&dir=desc$/);
      await expect(byName).toHaveAttribute("aria-sort", "descending");
    }

    if (viewport.width >= LG) {
      await page.getByRole("checkbox", { name: copy.ui.eventList.selectRow(upcomingEvent.name) }).check();
      await expect(page.getByText(copy.ui.bulk.selected(1), { exact: true })).toBeVisible();
      await page.getByRole("button", { name: copy.detail.archive, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: copy.ui.eventList.bulkArchive(1) });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("button", { name: copy.ui.cancel })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(page.getByText(copy.ui.bulk.selected(1), { exact: true })).toBeVisible();
      await page.getByRole("button", { name: copy.ui.bulk.clear }).click();
      await expect(page.getByText(copy.ui.bulk.selected(1), { exact: true })).toBeHidden();
    }

    const chips = page.getByRole("navigation", { name: copy.ui.sort.status });
    await chips.getByRole("link", { name: startsWith(copy.ui.phase.running) }).click();
    await expect(page).toHaveURL(/[?&]phase=running(&|$)/);
    await expect(chips.getByRole("link", { name: startsWith(copy.ui.phase.running) })).toHaveAttribute("aria-current", "page");

    const search = page.getByRole("searchbox", { name: copy.ui.eventList.searchLabel });
    await search.fill("fest");
    await search.press("Enter");
    await expect(page).toHaveURL(/[?&]q=fest(&|$)/);
    await expect(page).toHaveURL(/[?&]phase=running(&|$)/);
    await expect(page.getByRole("searchbox", { name: copy.ui.eventList.searchLabel })).toHaveValue("fest");
    await expectNoSidewaysScroll(page, "/admin filtered");
  });

  test("events list states: pages, empty, invalid params and the error boundary @mock", async ({ page }, testInfo) => {
    const { copy, phone } = setup(testInfo);
    await serverMock(page, MOCK_HEADERS.example, "paged");
    await open(page, "/admin");
    const pages = page.getByRole("navigation", { name: copy.ui.list.pagination });
    await expect(pages.getByText(copy.ui.list.pageOf(2, 3))).toBeVisible();
    await expect(pages.getByRole("link", { name: copy.ui.list.next })).toHaveAttribute("href", "/admin?page=3");
    await expect(pages.getByRole("link", { name: copy.ui.list.prev })).toHaveAttribute("href", "/admin");
    await expectNoSidewaysScroll(page, "/admin paged");

    await serverMock(page, MOCK_HEADERS.example, "empty");
    await open(page, "/admin");
    await expect(page.getByText(copy.ui.list.noMatch(""), { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: copy.ui.list.clearFilters })).toBeVisible();
    await expect(page.getByRole("table")).toBeHidden();
    await expectNoSidewaysScroll(page, "/admin empty");

    await page.setExtraHTTPHeaders({});
    await open(page, "/admin?page=abc&test=foo&sort=bogus");
    // Filtered: Next's route announcer is a role="alert" too.
    await expect(page.getByRole("alert").filter({ hasText: copy.ui.pageError.title })).toHaveCount(0);
    await expect(page.getByRole("link", { name: `${copy.events.open}: ${upcomingEvent.name}` })).toBeVisible();
    if (!phone) await expect(page.getByRole("columnheader", { name: copy.ui.colWhen, exact: true })).toHaveAttribute("aria-sort", "descending");

    // Any API failure the page cannot absorb: the console frame stays, with the error and a retry.
    // Undocumented on purpose: every list call fails (400 mock_error_unknown) while stats degrade to "—".
    await serverMock(page, MOCK_HEADERS.error, "e2e_forced");
    await page.goto("/admin");
    const alert = page.getByRole("alert").filter({ hasText: copy.ui.pageError.title });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole("button", { name: copy.ui.retry })).toBeVisible();
    await expect(page.getByRole("navigation", { name: copy.navLabel })).toHaveCount(1);
    await expectNoSidewaysScroll(page, "/admin error");
  });

  test("event page: tabs by ?tab, QR tab or column, rotate confirm @mock", async ({ page }, testInfo) => {
    const { viewport, copy } = setup(testInfo);
    const base = `/admin/events/${adminEvent.slug}`;
    await open(page, base);
    await expect(page.getByRole("heading", { level: 1, name: adminEvent.name })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: copy.ui.detail.sections });
    await expect(tabs.getByRole("link", { name: startsWith(copy.ui.tabs.overview) })).toHaveAttribute("aria-current", "page");
    await expectNoSidewaysScroll(page, `${base} overview`);

    // Below 1280 the QR is a tab; from 1280 it is the sticky column and the tab is gone.
    const qrImage = page.getByRole("img", { name: copy.detail.qrLabel(adminEvent.name) });
    const qrTab = tabs.getByRole("link", { name: copy.ui.tabs.qr });
    if (viewport.width >= XL) {
      await expect(qrTab).toBeHidden();
      await expect(qrImage).toBeVisible();
    }
    const keys = viewport.width >= XL ? (["people", "organizers", "settings"] as const) : (["qr", "people", "organizers", "settings"] as const);
    for (const key of keys) {
      await tabs.getByRole("link", { name: startsWith(copy.ui.tabs[key]) }).click();
      await expect(page).toHaveURL(new RegExp(`\\?tab=${key}$`));
      await expect(tabs.getByRole("link", { name: startsWith(copy.ui.tabs[key]) })).toHaveAttribute("aria-current", "page");
      if (key === "qr") await expect(qrImage).toBeVisible();
      if (key === "settings") await expect(page.getByRole("heading", { name: copy.ui.detail.dangerZone })).toBeVisible();
      await expectNoSidewaysScroll(page, `${base}?tab=${key}`);
    }

    await page.getByRole("button", { name: copy.ui.menu.moreFor(adminEvent.name) }).click();
    await page.locator(":popover-open").getByRole("button", { name: copy.detail.rotate }).click();
    const dialog = page.getByRole("dialog", { name: copy.ui.dialogs.rotate.title });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: copy.ui.cancel })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("forms and lists: new-event slug, people filters and sort, test-user generator @mock", async ({ page }, testInfo) => {
    const { copy, phone } = setup(testInfo);
    await open(page, "/admin/events/new");
    // Typing before hydration never reaches React's onChange (slow on WebKit), so retype until the slug follows.
    await expect(async () => {
      await page.locator("#event-name").fill("Noche Tapatía 2026");
      await expect(page.locator("#event-slug")).toHaveValue("noche-tapatia-2026", { timeout: 2_000 });
    }).toPass();
    await expectNoSidewaysScroll(page, "/admin/events/new");

    await open(page, "/admin/people");
    const chips = page.getByRole("navigation", { name: copy.people.title });
    await chips.getByRole("link", { name: copy.people.filter.only, exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/people\?test=only$/);
    await expect(chips.getByRole("link", { name: copy.people.filter.only, exact: true })).toHaveAttribute("aria-current", "page");
    // The selects submit on change once hydrated; a change before that is lost, so let each page settle first.
    await page.waitForLoadState("networkidle");
    await page.getByRole("combobox", { name: copy.people.sortLabel }).selectOption("createdAt");
    await expect(page).toHaveURL(/[?&]sort=createdAt(&|$)/);
    await expect(page).toHaveURL(/[?&]test=only(&|$)/);
    await page.waitForLoadState("networkidle");
    await page.getByRole("combobox", { name: copy.people.roleLabel }).selectOption("super_admin");
    await expect(page).toHaveURL(/[?&]role=super_admin(&|$)/);
    await expect(page).toHaveURL(/[?&]sort=createdAt(&|$)/);
    await expectNoSidewaysScroll(page, "/admin/people filtered");

    // The generator: a closed <details> on a phone (the mock list is not empty), always open from 768.
    await open(page, "/admin/test-users");
    const count = page.locator("#test-count");
    if (phone) {
      await expect(count).toBeHidden();
      await page.locator("summary").filter({ hasText: copy.tests.generatorTitle }).click();
    }
    await expect(count).toBeVisible();
    await expect(page.getByRole("button", { name: copy.tests.createN(Number(await count.inputValue())) })).toBeVisible();
    await expectNoSidewaysScroll(page, "/admin/test-users");
  });
});
