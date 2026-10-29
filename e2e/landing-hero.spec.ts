// The landing hero shows the SVG crowd, with the scene's six monitos, whenever the Three.js scene must stay off.
import { copyFor } from "../lib/copy";
import { localeFromAcceptLanguage } from "../lib/i18n";
import { expect, test } from "./fixtures";

const SCENE = '[data-testid="hero-scene"]';

test.describe("landing hero fallback", () => {
  test("reduced motion keeps the SVG crowd and never mounts the scene @prod", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const { sceneLabel } = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale)).landing;
    const crowd = page.getByRole("img", { name: sceneLabel });
    await expect(crowd).toBeVisible();
    expect(await crowd.locator("svg").count()).toBeGreaterThanOrEqual(6);
    await expect(page.locator(SCENE)).toHaveCount(0);
  });

  test("a weak device (2 cores) keeps the SVG crowd @prod", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 }));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(1_500);
    await expect(page.locator(SCENE)).toHaveCount(0);
  });
});
