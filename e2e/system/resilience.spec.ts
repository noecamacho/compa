// F-66 and F-67: a failed server fetch shows the error screen with a working Retry, a slow screen shows the
// skeleton, an unknown path answers 404, and a write while offline fails visibly without leaving the screen.
import { MOCK_ERROR_COOKIE } from "../../lib/api/mock-cookie";
import * as X from "../../lib/api/examples";
import { copyFor } from "../../lib/copy";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { expect, test } from "../fixtures";
import { skipTours } from "./helpers";

let { dock, request: requestCopy, screenState } = copyFor("es");
test.beforeEach(({}, testInfo) => {
  ({ dock, request: requestCopy, screenState } = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale)));
});

// Signed-in screens whose main fetch throws (apiGet); every one of their API routes documents 401.
const FAILING_SCREENS = [
  "/home",
  "/me",
  "/connect",
  "/connections",
  "/invite",
  "/notifications",
  "/ranking",
  `/requests/${X.ids.connection}`,
  `/connections/${X.ids.connection}/done`,
  "/onboarding/profile",
  "/onboarding/monito",
];

test.describe("resilience", () => {
  test.beforeEach(({ context }) => skipTours(context));

  for (const path of FAILING_SCREENS) {
    test(`${path}: a failed server fetch shows the error screen and Retry recovers @mock`, async ({ page, context, mock }) => {
      await mock.mockServerError("unauthorized");
      await page.goto(path);
      // Error copy follows the configured browser and request locale.
      const alert = page.getByRole("alert").filter({ hasText: screenState.errorTitle });
      await expect(alert).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: screenState.errorTitle })).toBeVisible();
      await context.clearCookies({ name: MOCK_ERROR_COOKIE });
      await page.getByRole("button", { name: screenState.retry }).click();
      await expect(alert).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    });
  }

  test("a slow screen shows the loading skeleton until it arrives @mock", async ({ page }) => {
    test.fail(true, "Known broken: holding the whole RSC response also holds its fallback; docs/testing/e2e-stability.md#loading-fallback");
    let delayed = 0;
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => { release = resolve; });
    // Abort prefetches so the click must request RSC; hold that response until the skeleton is observed.
    await page.route(/\/connections(\?|$)/, async (route) => {
      const headers = route.request().headers();
      if (headers["next-router-prefetch"]) return route.abort();
      if (!headers.rsc) return route.continue();
      delayed += 1;
      await held;
      await route.continue();
    });
    await page.goto("/home");
    try {
      await page.getByRole("navigation").getByRole("link", { name: dock.tabs.connections }).click();
      await expect.poll(() => delayed).toBeGreaterThan(0);
      await expect(page.getByRole("status").filter({ hasText: screenState.loading })).toBeAttached();
    } finally {
      release();
    }
    await expect(page).toHaveURL(/\/connections$/);
    await expect(page.getByRole("status").filter({ hasText: screenState.loading })).toHaveCount(0, { timeout: 15_000 });
  });

  test("an unknown path answers 404 with a page @mock", async ({ page }) => {
    const response = await page.goto("/no-such-page-e2e");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("a write while offline shows an error and keeps the screen usable @mock", async ({ page, context }) => {
    await page.goto(`/requests/${X.ids.connection}`);
    const accept = page.getByRole("button", { name: requestCopy.accept });
    await expect(accept).toBeEnabled();
    await context.setOffline(true);
    try {
      await accept.click();
      await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible();
      await expect(accept).toBeEnabled();
      await expect(page).toHaveURL(new RegExp(`/requests/${X.ids.connection}$`));
    } finally {
      await context.setOffline(false);
    }
  });
});
