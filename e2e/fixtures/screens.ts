import { expect, test, type Page } from "@playwright/test";
import { copyFor } from "../../lib/copy";
import { localeFromAcceptLanguage } from "../../lib/i18n";

// Streamed notFound() can keep HTTP 200; assert the localized error screen itself.
export async function expectNotFound(page: Page): Promise<void> {
  const copy = copyFor(localeFromAcceptLanguage(test.info().project.use.locale)).notFound;
  const screen = page.getByRole("main");
  await expect(screen.getByRole("heading", { level: 1, name: copy.title, exact: true })).toBeVisible();
  await expect(screen.getByText(copy.body, { exact: true })).toBeVisible();
  await expect(screen.getByRole("link", { name: copy.home, exact: true })).toBeVisible();
}
