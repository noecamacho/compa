// F-74: every page route of app/**/page.tsx renders at 390, 834 and 1440 (one project each) with no horizontal
// scroll and no browser errors, using the mock server's examples.
import { expect, test } from "../fixtures";
import { collectConsoleErrors, horizontalOverflow, PAGE_ROUTES, SCREEN_ROUTES, urlOf } from "./helpers";

test.describe("responsive layouts", () => {
  test("every page route has a sample URL @mock", () => {
    expect(PAGE_ROUTES.length).toBeGreaterThan(20);
    for (const route of PAGE_ROUTES) expect(urlOf(route)).not.toContain("[");
  });

  for (const route of SCREEN_ROUTES) {
    test(`${route} fits the viewport with no browser errors @mock`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const response = await page.goto(urlOf(route));
      expect(response?.status() ?? 0).toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();
      await expect.poll(() => horizontalOverflow(page), { message: "elements that cause a horizontal scroll" }).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});
