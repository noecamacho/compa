// Every attendee screen reads in the browser's language, and a failed call shows the text of its error code (DESIGN.md "Internationalization").
import { copyFor } from "../lib/copy";
import { localeFromAcceptLanguage } from "../lib/i18n";
import { expect, test } from "./fixtures";

const REQUEST_ID = "0d9c8b7a-6f5e-4d3c-8b1a-0f9e8d7c6b5a";

const copyOf = (testInfo: { project: { use: { locale?: string } } }) => {
  const locale = localeFromAcceptLanguage(testInfo.project.use.locale);
  return { locale, copy: copyFor(locale) };
};

test.describe("i18n", () => {
  test("every app screen sets <html lang> and reads its heading in the browser language @mock", async ({ page }, testInfo) => {
    const { locale, copy } = copyOf(testInfo);
    const headings: [string, string][] = [
      ["/connections", copy.connections.title],
      ["/me/badges", copy.badges.title],
      ["/invite", copy.invite.title],
      ["/ranking", copy.ranking.title],
    ];
    for (const [path, heading] of headings) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByText(heading, { exact: true }).first()).toBeVisible();
    }
  });

  test("badge names and progress follow the locale @mock", async ({ page }, testInfo) => {
    const { copy } = copyOf(testInfo);
    await page.goto("/me/badges");
    await expect(page.getByText(copy.badgeNames.apreton.name, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(copy.badges.secret).first()).toBeVisible();
  });

  test("an already answered accept shows the localized text, never the API message @mock", async ({ page, mock }, testInfo) => {
    const { copy } = copyOf(testInfo);
    await page.goto(`/requests/${REQUEST_ID}`);
    await mock.mockError("not_pending", "**/api/connections/*/accept");
    const alert = page.getByRole("alert").filter({ hasText: /\S/ });
    await expect(async () => {
      await page.getByRole("button", { name: copy.request.accept }).click();
      await expect(alert).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 45_000 });
    await expect(alert).toContainText(copy.errors.codes.not_pending ?? "");
  });
});
