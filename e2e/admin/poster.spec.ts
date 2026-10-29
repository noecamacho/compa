// The admin QR promo poster in mock mode: the event page links to it, and the poster shows the logo, the event name, a
// large still QR nothing covers, and the call to action in both languages (cross-fading, or stacked with reduced
// motion). The projects supply the viewport (390, 834, 1440), the locale (es, en) and reduced motion.
import type { Locator, Page } from "@playwright/test";
import { adminEvent } from "../../lib/api/admin-examples";
import { MOCK_HEADERS } from "../../lib/api/mock-headers";
import { copyFor } from "../../lib/copy";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { expect, test } from "../fixtures";

const EVENT_PAGE = `/admin/events/${adminEvent.slug}`;
const POSTER = `${EVENT_PAGE}/poster`;

async function open(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(200);
  await page.waitForLoadState("load");
}

async function sidewaysOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
}

// Whether the point at the QR's center belongs to the QR, and which of it and its ancestors animate or transform.
function qrState(qr: Locator) {
  return qr.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    const moving: string[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      const still = style.animationName === "none" && [style.transform, style.rotate, style.scale, style.translate].every((value) => value === "none");
      if (!still) moving.push(node.tagName);
    }
    return { uncovered: hit !== null && element.contains(hit), moving, width: box.width, height: box.height };
  });
}

const runningAnimations = (page: Page) => page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);

test.describe("admin QR poster", () => {
  test("the event page opens the poster in a new tab @mock", async ({ page }, testInfo) => {
    const copy = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale)).admin;
    await open(page, EVENT_PAGE);
    const link = page.getByRole("link", { name: copy.ui.poster.open });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", POSTER);
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("poster: logo, name, both languages and a large, still, uncovered QR @mock", async ({ page }, testInfo) => {
    const copy = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale)).admin;
    const viewport = testInfo.project.use.viewport ?? { width: 1440, height: 900 };
    const reduced = testInfo.project.use.reducedMotion === "reduce";
    await open(page, POSTER);

    // A bare stage: no admin shell navigation.
    await expect(page.getByRole("navigation", { name: copy.navLabel })).toHaveCount(0);
    await expect(page.getByRole("main", { name: copy.ui.poster.stage(adminEvent.name) })).toBeVisible();
    await expect(page.getByRole("img", { name: "compa", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: adminEvent.name })).toBeVisible();
    await expect(page.getByRole("link", { name: copy.ui.poster.back })).toHaveAttribute("href", EVENT_PAGE);
    await expect(page.getByRole("button", { name: copy.ui.poster.fullscreen })).toBeVisible();

    const lines = { es: page.locator('main p[lang="es"]'), en: page.locator('main p[lang="en"]') };
    for (const lang of ["es", "en"] as const) {
      const words = copyFor(lang).admin.ui.poster;
      await expect(lines[lang]).toContainText(words.title[1] ?? "");
      await expect(lines[lang]).toContainText(words.prize);
      await expect(lines[lang]).toContainText(words.free);
      await expect(page.locator(`figcaption [lang="${lang}"]`)).toHaveText(new RegExp(words.scan));
    }

    const qr = page.getByRole("img", { name: copy.detail.qrLabel(adminEvent.name) });
    await expect(qr).toBeVisible();
    await qr.scrollIntoViewIfNeeded();
    const state = await qrState(qr);
    expect(state.uncovered, "the QR center is the QR").toBe(true);
    expect(state.moving, "the QR and its ancestors never animate or transform").toEqual([]);
    expect(Math.abs(state.width - state.height)).toBeLessThanOrEqual(1);
    expect(state.width, "the QR is large").toBeGreaterThanOrEqual(Math.min(viewport.width, viewport.height) * 0.4);
    await expect.poll(() => sidewaysOverflow(page), { message: "horizontal overflow on the poster" }).toBeLessThanOrEqual(0);

    // Layout boxes, not bounding boxes: the cross-fade nudges the fading line up with a transform.
    const layout = (line: Locator) => line.evaluate((element) => ({ top: (element as HTMLElement).offsetTop, height: (element as HTMLElement).offsetHeight }));
    const [es, en] = await Promise.all([layout(lines.es), layout(lines.en)]);
    if (reduced) {
      // Calm variant: nothing moves and both languages stack, both readable.
      expect(await runningAnimations(page)).toBe(0);
      expect(en.top).toBeGreaterThanOrEqual(es.top + es.height);
      return;
    }
    // With motion: the two languages share one spot and cross-fade, and the stage keeps moving.
    expect(en.top).toBe(es.top);
    expect(await runningAnimations(page)).toBeGreaterThan(0);
  });

  // The admin layout streams first, so the not-found page can arrive with a 200; assert what the page shows instead.
  test("an unknown event gets the not-found page @mock", async ({ page }) => {
    await page.setExtraHTTPHeaders({ [MOCK_HEADERS.status]: "404" });
    await page.goto(POSTER);
    await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
    await expect(page.getByRole("img", { name: "compa", exact: true })).toHaveCount(0);
  });
});
