// The admin QR promo poster in mock mode: the event page and its QR panel link to it, and the poster fills one screen
// with no scroll: a big logo, the event name, the owner's caption in both languages (cross-fading, or stacked with
// reduced motion) and a large, still QR nothing covers. The projects supply the viewport (390, 834, 1440), the locale
// (es, en) and reduced motion; one describe adds iPad landscape (1180×820).
import type { Locator, Page, TestInfo } from "@playwright/test";
import { adminEvent } from "../../lib/api/admin-examples";
import { MOCK_HEADERS } from "../../lib/api/mock-headers";
import { copyFor } from "../../lib/copy";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { expect, test } from "../fixtures";

const EVENT_PAGE = `/admin/events/${adminEvent.slug}`;
const POSTER = `${EVENT_PAGE}/poster`;
// The owner's caption, word for word: a copy edit that changes it must change this test too.
const CAPTION = { en: "BE THE ONE WHO CONNECTS THE MOST AND WIN A PRIZE FOR FREE", es: "SÉ QUIEN MÁS CONECTE Y GANA UN PREMIO GRATIS" } as const;

async function open(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(200);
  await page.waitForLoadState("load");
}

// How far the page scrolls each way; the poster must fit one screen.
function overflow(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return { x: root.scrollWidth - root.clientWidth, y: root.scrollHeight - root.clientHeight };
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

const runningAnimations = (page: Page) => page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running" && document.querySelector("main")?.contains((animation.effect as KeyframeEffect | null)?.target ?? null)).length);

const adminCopy = (testInfo: TestInfo) => copyFor(localeFromAcceptLanguage(testInfo.project.use.locale)).admin;

// Everything the poster promises on any screen; `viewport` is the size the test runs at.
async function expectPoster(page: Page, testInfo: TestInfo, viewport: { width: number; height: number }) {
  const copy = adminCopy(testInfo);
  const reduced = testInfo.project.use.reducedMotion === "reduce";
  const short = Math.min(viewport.width, viewport.height);
  await open(page, POSTER);

  // A bare stage: no admin shell navigation.
  await expect(page.getByRole("navigation", { name: copy.navLabel })).toHaveCount(0);
  await expect(page.getByRole("main", { name: copy.ui.poster.stage(adminEvent.name) })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: adminEvent.name })).toBeVisible();
  await expect(page.getByRole("link", { name: copy.ui.poster.back })).toHaveAttribute("href", EVENT_PAGE);
  // The button only renders where the Fullscreen API exists (not iPhone Safari).
  const canFullscreen = await page.evaluate(() => Boolean(document.fullscreenEnabled));
  await expect(page.getByRole("button", { name: copy.ui.poster.fullscreen })).toHaveCount(canFullscreen ? 1 : 0);

  const lines = { es: page.locator('main p[lang="es"]'), en: page.locator('main p[lang="en"]') };
  for (const lang of ["es", "en"] as const) {
    await expect(lines[lang]).toHaveText(CAPTION[lang]);
    await expect(page.locator(`figcaption [lang="${lang}"]`)).toHaveText(new RegExp(copyFor(lang).admin.ui.poster.scan));
  }

  // One screen: no scroll either way.
  await expect.poll(() => overflow(page), { message: "the poster scrolls" }).toEqual({ x: 0, y: 0 });

  const logo = page.getByRole("img", { name: "compa", exact: true });
  await expect(logo).toBeVisible();
  const logoBox = await logo.boundingBox();
  expect(logoBox?.height ?? 0, "the logo is hero-sized").toBeGreaterThanOrEqual(short * 0.12);

  const qr = page.getByRole("img", { name: copy.detail.qrLabel(adminEvent.name) });
  await expect(qr).toBeVisible();
  const state = await qrState(qr);
  expect(state.uncovered, "the QR center is the QR").toBe(true);
  expect(state.moving, "the QR and its ancestors never animate or transform").toEqual([]);
  expect(Math.abs(state.width - state.height)).toBeLessThanOrEqual(1);
  expect(state.width, "the QR is large").toBeGreaterThanOrEqual(short * 0.4);

  // Landscape puts the logo beside the QR, portrait above it.
  const qrBox = await qr.boundingBox();
  if (logoBox && qrBox && viewport.width > viewport.height) expect(logoBox.x + logoBox.width).toBeLessThanOrEqual(qrBox.x);
  if (logoBox && qrBox && viewport.width <= viewport.height) expect(logoBox.y + logoBox.height).toBeLessThanOrEqual(qrBox.y);

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
}

test.describe("admin QR poster", () => {
  test("the event page and its QR panel open the poster in a new tab @mock", async ({ page }, testInfo) => {
    const copy = adminCopy(testInfo);
    // Below 1280 the QR panel is the QR tab; from 1280 it is the side column.
    await open(page, `${EVENT_PAGE}?tab=qr`);
    for (const name of [copy.ui.poster.open, copy.ui.poster.panelLink]) {
      const link = page.getByRole("link", { name });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", POSTER);
      await expect(link).toHaveAttribute("target", "_blank");
    }
  });

  test("poster: big logo, the caption in both languages and a large, still, uncovered QR on one screen @mock", async ({ page }, testInfo) => {
    await expectPoster(page, testInfo, testInfo.project.use.viewport ?? { width: 1440, height: 900 });
  });

  // The admin layout streams first, so the not-found page can arrive with a 200; assert what the page shows instead.
  test("an unknown event gets the not-found page @mock", async ({ page }, testInfo) => {
    await page.setExtraHTTPHeaders({ [MOCK_HEADERS.status]: "404" });
    await page.goto(POSTER);
    const { notFound } = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale));
    await expect(page.getByRole("heading", { level: 1, name: notFound.title })).toBeVisible();
    await expect(page.getByRole("img", { name: "compa", exact: true })).toHaveCount(0);
  });
});

// iPad landscape (1180×820): run once per locale, from the tablet projects. iPad portrait is the tablet-834 project.
test.describe("admin QR poster on iPad landscape", () => {
  const IPAD_LANDSCAPE = { width: 1180, height: 820 };
  test.use({ viewport: IPAD_LANDSCAPE });

  test("poster fills the landscape screen @mock", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("tablet-834"), "iPad landscape runs from the tablet projects");
    await expectPoster(page, testInfo, IPAD_LANDSCAPE);
  });
});
