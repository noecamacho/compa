// F-73 basics without axe (not a dependency): every screen has exactly one h1, and every button, link, form
// field and image has an accessible name or text alternative.
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { SCREEN_ROUTES, urlOf } from "./helpers";

async function expectNamed(locator: Locator, what: string) {
  for (const element of await locator.all()) {
    const html = await element.evaluate((node) => node.outerHTML.slice(0, 160));
    await expect(element, `${what} without a name: ${html}`).toHaveAccessibleName(/\S/);
  }
}

const visibleImagesWithoutAlt = (page: Page) =>
  page.locator("img:not([alt])").evaluateAll((nodes) => nodes.filter((node) => node.getClientRects().length > 0).map((node) => node.outerHTML.slice(0, 160)));

test.describe("accessibility basics", () => {
  for (const route of SCREEN_ROUTES) {
    test(`${route} has one h1 and named controls @mock`, async ({ page }) => {
      await page.goto(urlOf(route));
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expectNamed(page.getByRole("button"), "button");
      await expectNamed(page.getByRole("link"), "link");
      await expectNamed(page.getByRole("textbox"), "text field");
      await expectNamed(page.getByRole("checkbox"), "checkbox");
      expect(await visibleImagesWithoutAlt(page)).toEqual([]);
    });
  }
});
