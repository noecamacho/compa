// T-031: incoming requests reach the addressee (docs/flows/backlog.md). Needs a server started with API_MODE=mock.
import { andrea, connectionList, ids, paola } from "../../lib/api/examples";
import { copyFor } from "../../lib/copy";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { firstName } from "../../lib/format";
import { expect, test } from "../fixtures";

const NEW_REQUEST_ID = "7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d";

const copyOf = (testInfo: { project: { use: { locale?: string } } }) => copyFor(localeFromAcceptLanguage(testInfo.project.use.locale));

test.describe("incoming requests @mock", () => {
  test("the bell opens the notifications list", async ({ page }) => {
    // The first-visit home tour covers the bell on wide screens.
    await page.addInitScript(() => localStorage.setItem("compa:tour:home", "done"));
    await page.goto("/home");
    await page.locator('a[href="/notifications"]').first().click();
    await expect(page).toHaveURL(/\/notifications$/);
  });

  test("/connections lists incoming requests on top", async ({ page }, testInfo) => {
    const { tour } = copyOf(testInfo);
    await page.goto("/connections");
    const card = page.locator(`a[href="/requests/${ids.connection3}"]`);
    await expect(card).toContainText(tour.incoming.title(firstName(paola.name)));
  });

  test("a new request shows up by polling within 4 s", async ({ page }, testInfo) => {
    const { request } = copyOf(testInfo);
    const fresh = { connectionId: NEW_REQUEST_ID, from: andrea, event: connectionList.incoming[0]?.event, createdAt: "2026-10-29T19:00:00.000Z" };
    // The page renders on the server; only the browser's polls see the new request.
    await page.route("**/api/connections", (route) => route.fulfill({ json: { ...connectionList, incoming: [fresh, ...connectionList.incoming] } }));
    await page.goto("/connections");
    await expect(page.locator(`a[href="/requests/${ids.connection3}"]`)).toBeVisible();
    await expect(page.locator(`a[href="/requests/${NEW_REQUEST_ID}"]`)).toHaveCount(0);
    // A cold dev server hydrates late; the 4 s budget starts once the poller is running.
    await page.waitForLoadState("networkidle");
    await page.waitForRequest("**/api/connections", { timeout: 4_000 });
    await expect(page.locator(`a[href="/requests/${NEW_REQUEST_ID}"]`)).toContainText(firstName(andrea.name));
  });

  test("accepting after the event ended shows the expired copy", async ({ page, mock }, testInfo) => {
    const { apiErrors, request } = copyOf(testInfo);
    await page.goto(`/requests/${ids.connection3}`);
    await mock.mockError("event_ended", "**/api/connections/*/accept");
    // On a cold dev server a click can land before hydration: click until the message shows.
    await expect(async () => {
      await page.getByRole("button", { name: request.accept }).click();
      await expect(page.getByRole("alert").filter({ hasText: apiErrors.codes.event_ended })).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 45_000 });
  });
});
