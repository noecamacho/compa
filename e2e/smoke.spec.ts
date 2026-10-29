// First spec of the harness (backlog T-000). Mock-mode scenarios need a server started with API_MODE=mock;
// the real-mode one needs TEST_AUTOMATION_SECRET and the seeded test project (docs/testing/real-mode.md).
import { me } from "../lib/api/examples";
import { copyFor } from "../lib/copy";
import { firstName } from "../lib/format";
import { localeFromAcceptLanguage } from "../lib/i18n";
import { expect, test } from "./fixtures";

const REQUEST_ID = "0d9c8b7a-6f5e-4d3c-8b1a-0f9e8d7c6b5a";

test.describe("smoke", () => {
  test("the landing renders its promise in the visitor's language @prod", async ({ page }, testInfo) => {
    const [headline] = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale)).landing.title;
    if (!headline) throw new Error("the landing copy has no title");
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(headline);
  });

  test("a mocked /api/me renders home @mock", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByText(firstName(me.name), { exact: false }).first()).toBeVisible();
  });

  test("accepting an already answered request shows the error @mock", async ({ page, mock }, testInfo) => {
    const { request } = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale));
    await page.goto(`/requests/${REQUEST_ID}`);
    await mock.mockError("not_pending", "**/api/connections/*/accept");
    const statuses: number[] = [];
    page.on("response", (response) => response.url().endsWith("/accept") && statuses.push(response.status()));
    const error = page.getByRole("alert").filter({ hasText: /\S/ });
    // On a cold dev server a click can land before hydration and the route compiles slowly: click until the error shows.
    await expect(async () => {
      await page.getByRole("button", { name: request.accept }).click();
      await expect(error).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 45_000 });
    expect(statuses).toContain(409);
    await expect(page).toHaveURL(new RegExp(`/requests/${REQUEST_ID}$`));
  });

  test("a seeded test user signs in and opens /me @real", async ({ page, realUser }) => {
    await page.goto("/me");
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByText(realUser.user.name).first()).toBeVisible();
  });
});
