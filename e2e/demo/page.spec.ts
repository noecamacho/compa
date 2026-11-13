// D3: the /demo page, the big screen and the phone side by side with a six-step guide. Needs a server started with
// API_MODE=demo (only @demo specs run against it); the @mock spec checks the page stays closed everywhere else.
import type { Page } from "@playwright/test";
import { copyFor } from "../../lib/copy";
import { demoCast } from "../../lib/demo/cast";
import { DEMO_EVENT_CODE } from "../../lib/demo/scenario";
import { DEMO_VISITOR_ID } from "../../lib/demo/visitor";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { firstName } from "../../lib/format";
import { expect, test } from "../fixtures";

// A fresh visitor has met nobody, so the guide connects them with the first person of the cast.
const alina = demoCast()[0]!;
let copy = copyFor("es");

test.beforeEach(async ({}, testInfo) => {
  copy = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale));
});

const phone = (page: Page) => page.frameLocator(`iframe[title="${copy.demo.phoneTitle}"]`);
const step = (page: Page, index: number) => page.getByRole("button", { name: copy.demo.steps[index]!.label });
const phoneAt = (page: Page, path: RegExp) => expect.poll(() => page.frames().some((frame) => path.test(new URL(frame.url()).pathname)));

// The two frames load whole apps; the guide itself is ready once the document is.
const openDemo = (page: Page) => page.goto("/demo", { waitUntil: "domcontentloaded" });

// Reduced motion keeps the guide still, so each step stays put while the spec looks at it.
async function openStill(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDemo(page);
  await expect(page.getByText(copy.demo.reducedMotion)).toBeVisible();
}

async function visitorLinks(page: Page): Promise<{ a: string; b: string }[]> {
  const response = await page.request.get(`/api/e/${DEMO_EVENT_CODE}/live`);
  return ((await response.json()) as { connections: { a: string; b: string }[] }).connections;
}

test.describe("demo page: the big screen and the phone side by side", () => {
  test("shows the notice, both screens and the first step @demo", async ({ page }) => {
    await openDemo(page);
    await expect(page.getByRole("heading", { level: 1, name: copy.demo.title })).toBeVisible();
    await expect(page.getByText(copy.demo.notice)).toBeVisible();
    await expect(page.locator(`iframe[title="${copy.demo.screenTitle}"]`)).toBeVisible();
    await expect(page.locator(`iframe[title="${copy.demo.phoneTitle}"]`)).toBeVisible();
    await expect(step(page, 0)).toHaveAttribute("aria-current", "step");
    await expect(page.getByText(copy.demo.stepOf(1, copy.demo.steps.length))).toBeVisible();
    await phoneAt(page, /^\/home$/).toBe(true);
    await expect(page.getByRole("link", { name: copy.demo.openScreen })).toHaveAttribute("href", `/e/${DEMO_EVENT_CODE}/live`);
    await expect(page.getByRole("link", { name: copy.demo.openConsole })).toHaveAttribute("href", "/admin/events/compa-demo");
  });

  test("plays on its own and pauses on demand @demo", async ({ page }, testInfo) => {
    test.skip(testInfo.project.use.reducedMotion === "reduce", "Reduced motion keeps the guide still (next test).");
    await openDemo(page);
    await expect(page.getByText(copy.demo.stepOf(2, copy.demo.steps.length))).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: copy.demo.pause }).click();
    await expect(page.getByRole("button", { name: copy.demo.play })).toBeVisible();
  });

  test("stays still when the system asks for less motion @demo", async ({ page }) => {
    await openStill(page);
    await expect(page.getByRole("button", { name: copy.demo.play })).toBeVisible();
    await page.getByRole("button", { name: copy.demo.next }).click();
    await expect(step(page, 1)).toHaveAttribute("aria-current", "step");
    await phoneAt(page, /^\/connect$/).toBe(true);
    await page.getByRole("button", { name: copy.demo.previous }).click();
    await page.getByRole("button", { name: copy.demo.previous }).click();
    // Previous from the first step wraps to the last one.
    await expect(step(page, 5)).toHaveAttribute("aria-current", "step");
    await phoneAt(page, /^\/ranking$/).toBe(true);
  });

  test("step 4 connects the visitor, the phone confirms it and the board lists it @demo", async ({ page }) => {
    await openStill(page);
    await step(page, 3).click();
    await expect(step(page, 3)).toHaveAttribute("aria-current", "step");
    // The fictional person accepts a few seconds later; the confirmation screen polls and shows the points.
    await expect(phone(page).getByRole("heading", { name: copy.confirmation.titleNew(firstName(alina.name)) })).toBeVisible({ timeout: 20_000 });
    expect(await visitorLinks(page)).toContainEqual(expect.objectContaining({ a: DEMO_VISITOR_ID, b: alina.id }));

    await page.getByRole("button", { name: copy.demo.next }).click();
    await expect(page.getByText(copy.demo.stepOf(5, copy.demo.steps.length))).toBeVisible();
    await phoneAt(page, /\/note$/).toBe(true);
  });

  test("start over gives a fresh visitor @demo", async ({ page }) => {
    await openStill(page);
    await step(page, 3).click();
    await expect.poll(async () => (await visitorLinks(page)).some((link) => link.a === DEMO_VISITOR_ID && link.b === alina.id), { timeout: 20_000 }).toBe(true);
    await page.getByRole("button", { name: copy.demo.startOver }).click();
    await expect(step(page, 0)).toHaveAttribute("aria-current", "step");
    await expect.poll(async () => (await visitorLinks(page)).some((link) => link.a === DEMO_VISITOR_ID)).toBe(false);
  });

  test("the landing page links to the demo @demo", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: copy.demo.landingCta }).click();
    await expect(page).toHaveURL(/\/demo$/);
  });

  test("outside demo mode the page does not exist @mock", async ({ page }) => {
    const response = await page.goto("/demo");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("link", { name: copy.demo.landingCta })).toHaveCount(0);
  });
});
