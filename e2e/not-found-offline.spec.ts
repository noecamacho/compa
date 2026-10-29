// Unknown routes get one bilingual way back; the app shows a status strip while the device is offline.
import { copyFor } from "../lib/copy";
import { localeFromAcceptLanguage } from "../lib/i18n";
import { expect, test } from "./fixtures";

test.describe("not found and offline", () => {
  test("an unknown page says so in the visitor's language and links back @mock", async ({ page }, testInfo) => {
    const copy = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale)).notFound;
    await page.goto("/no-such-page");
    await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible();
    await expect(page.getByRole("link", { name: copy.home })).toBeVisible();
  });

  test("going offline shows the strip and coming back removes it @mock", async ({ page, context }, testInfo) => {
    const { offline } = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale));
    await page.goto("/home");
    await expect(page.getByText(offline.banner)).toHaveCount(0);
    await context.setOffline(true);
    await expect(page.getByRole("status").filter({ hasText: offline.banner })).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText(offline.banner)).toHaveCount(0);
  });
});
