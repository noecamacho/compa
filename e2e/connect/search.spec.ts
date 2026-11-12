// F-19: name search uses GET /api/users?q=; an empty result falls back to the slugified handle.
import type { Page } from "@playwright/test";
import { valeriaPublic } from "../../lib/api/examples";
import { expect, test } from "../fixtures";
import { waitForHydration } from "../onboarding/helpers";
import { copyOf, skipTours } from "./helpers";

async function search(page: Page, query: string): Promise<void> {
  await waitForHydration(page, "#search-handle");
  const box = page.getByRole("searchbox");
  await box.fill(query);
  await box.press("Enter");
}

test.describe("connect: search by name", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("a name with accents and capitals finds the person and opens the register screen @mock", async ({ page }, testInfo) => {
    const { connect, register } = copyOf(testInfo);
    await page.goto("/connect?tab=scan");
    await expect(page.getByRole("searchbox", { name: connect.searchLabel })).toHaveAttribute("placeholder", connect.searchPlaceholder);
    const lookup = page.waitForRequest((request) => request.method() === "GET" && new URL(request.url()).pathname === "/api/users");
    await search(page, "  VALERIA Óchoa ");
    expect(new URL((await lookup).url()).searchParams.get("q")).toBe("VALERIA Óchoa");
    const result = page.getByRole("listitem").filter({ hasText: valeriaPublic.name });
    await expect(result).toContainText(valeriaPublic.name);
    await result.getByRole("link", { name: `${connect.connectButton}: ${valeriaPublic.name}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/connect/${valeriaPublic.handle}$`));
    await expect(page.getByRole("heading", { name: register.title })).toBeVisible();
  });

  test("fewer than two characters sends nothing @mock", async ({ page }, testInfo) => {
    await page.goto("/connect?tab=scan");
    const lookups: string[] = [];
    page.on("request", (request) => new URL(request.url()).pathname === "/api/users" && lookups.push(request.url()));
    await search(page, "v");
    await search(page, " ");
    // The next valid search proves the form is live, so the two above really were skipped.
    const lookup = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/users");
    await search(page, "valeria-ochoa");
    await lookup;
    expect(lookups).toHaveLength(1);
    await expect(page.getByRole("listitem").filter({ hasText: valeriaPublic.name })).toBeVisible();
    const handles: string[] = [];
    page.on("request", (request) => new URL(request.url()).pathname.startsWith("/api/users/") && handles.push(request.url()));
    await page.route(/\/api\/users\?q=/, (route) => route.fulfill({ json: { people: [] } }));
    await search(page, "¿?");
    await expect(page.getByRole("alert").filter({ hasText: copyOf(testInfo).connect.notFound })).toBeVisible();
    expect(handles).toHaveLength(0);
  });

  test("nobody found shows the message, and a later hit clears it @mock", async ({ page, mock }, testInfo) => {
    const { connect } = copyOf(testInfo);
    await page.route(/\/api\/users\?q=/, (route) => route.fulfill({ json: { people: [] } }));
    await mock.mockError("user_not_found", "**/api/users/nadie-aqui");
    await page.goto("/connect?tab=scan");
    await search(page, "Nadie Aquí");
    await expect(page.getByRole("alert").filter({ hasText: connect.notFound })).toBeVisible();
    const fallback = page.waitForRequest((request) => new URL(request.url()).pathname === `/api/users/${valeriaPublic.handle}`);
    await search(page, "  VALERIA Óchoa ");
    await fallback;
    await expect(page.getByText(valeriaPublic.name, { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(connect.notFound)).toHaveCount(0);
  });

  test("a real attendee is found by handle; an unknown one is not @real", async ({ page, realUser, testUsers }, testInfo) => {
    const { connect } = copyOf(testInfo);
    const [target] = await testUsers(1);
    if (!target) throw new Error("test user not created");
    expect(target.id).not.toBe(realUser.user.id);
    await page.goto("/connect?tab=scan");
    await search(page, target.handle);
    await expect(page.getByText(target.name)).toBeVisible();
    await search(page, `zz-${target.handle}-nobody`.slice(0, 32));
    await expect(page.getByText(connect.notFound)).toBeVisible();
  });
});
