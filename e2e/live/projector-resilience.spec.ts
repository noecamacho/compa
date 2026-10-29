// The projector keeps working through a code rotation and an outage (conference-load findings 19 and 20), in mock mode.
import { accessCode } from "../../lib/api/examples";
import { copyFor } from "../../lib/copy";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { expect, test } from "../fixtures";

const LIVE_API = "**/api/e/*/live";

test.describe("live screen resilience", () => {
  test("a rotated code keeps the board up and says to reopen the link @mock", async ({ page }, testInfo) => {
    const copy = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale)).live;
    await page.goto(`/e/${accessCode}/live`);
    await expect(page.getByText(copy.scanToJoin)).toBeVisible();
    await page.route(LIVE_API, (route) => route.fulfill({ status: 404, json: { error: { code: "event_not_found", message: "Event not found." } } }));
    await expect(page.getByRole("status").filter({ hasText: copy.codeChanged })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(copy.scanToJoin)).toBeVisible();
  });

  test("a hung snapshot request shows the age of the data, then recovers @mock", async ({ page }, testInfo) => {
    const copy = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale)).live;
    await page.goto(`/e/${accessCode}/live`);
    await expect(page.getByText(copy.scanToJoin)).toBeVisible();
    let started = 0;
    await page.route(LIVE_API, () => {
      started += 1;
    });
    const pill = page.getByRole("status").filter({ hasText: copy.stale });
    await expect(pill).toBeVisible({ timeout: 20_000 });
    expect(started).toBeLessThanOrEqual(2);
    await page.unroute(LIVE_API);
    await expect(pill).toBeHidden({ timeout: 15_000 });
  });
});
