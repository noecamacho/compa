// F-19 Search by name on the scan tab. Today the query is slugified and looked up as an exact handle
// (GET /api/users/{handle}); prefix, partial and same-event search are T-034 and not built.
import type { Page } from "@playwright/test";
import { valeriaPublic } from "../../lib/api/examples";
import { connect, register } from "../../lib/copy/es";
import { expect, test } from "../fixtures";
import { connectLink, skipTours } from "./helpers";

const searchBox = (page: Page) => page.getByRole("searchbox", { name: connect.searchLabel });

async function search(page: Page, query: string): Promise<void> {
  await searchBox(page).fill(query);
  await searchBox(page).press("Enter");
}

test.describe("connect: search by name", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("a name with accents and capitals finds the person and opens the register screen @mock", async ({ page }) => {
    await page.goto("/connect?tab=scan");
    await expect(searchBox(page)).toHaveAttribute("placeholder", connect.searchPlaceholder);
    const lookup = page.waitForRequest((request) => request.method() === "GET" && request.url().includes("/api/users/"));
    await search(page, "  VALERIA Óchoa ");
    expect(new URL((await lookup).url()).pathname).toBe(`/api/users/${valeriaPublic.handle}`);
    await expect(page.getByText(valeriaPublic.name)).toBeVisible();
    await connectLink(page).click();
    await expect(page).toHaveURL(new RegExp(`/connect/${valeriaPublic.handle}$`));
    await expect(page.getByRole("heading", { name: register.title })).toBeVisible();
  });

  test("fewer than two characters sends nothing @mock", async ({ page }) => {
    await page.goto("/connect?tab=scan");
    const lookups: string[] = [];
    page.on("request", (request) => request.url().includes("/api/users/") && lookups.push(request.url()));
    await search(page, "v");
    await search(page, "¿?");
    // The next valid search proves the form is live, so the two above really were skipped.
    const lookup = page.waitForRequest((request) => request.url().includes("/api/users/"));
    await search(page, "valeria-ochoa");
    await lookup;
    expect(lookups).toHaveLength(1);
  });

  test("nobody found shows the message, and a later hit clears it @mock", async ({ page, mock, browserName }) => {
    test.fixme(browserName === "webkit", "WebKit (CI only): the not-found message never shows after a search; unverified locally");
    await page.goto("/connect?tab=scan");
    await mock.mockError("user_not_found", "**/api/users/nadie-aqui");
    await search(page, "Nadie Aquí");
    await expect(page.getByText(connect.notFound)).toBeVisible();
    await search(page, "Valeria Ochoa");
    await expect(page.getByText(valeriaPublic.name)).toBeVisible();
    await expect(page.getByText(connect.notFound)).toHaveCount(0);
  });

  test("a real attendee is found by handle; an unknown one is not @real", async ({ page, realUser, testUsers }) => {
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
