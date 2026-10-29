// F-11: the personal-QR link /u/<handle>. Signed out it goes through sign-in and keeps the handle; signed in it opens
// 05 Registrar (/connect/<handle>); an unknown handle shows not found; a malformed one goes to the landing.
import { TEST_ADMIN_HANDLE } from "../../db/seed-test-event";
import { valeriaProfile } from "../../lib/api/examples";
import { AUTHORIZE_URL, expect, nextOf, redirectOf, signInPath, skipTours, stubSignIn, test } from "./helpers";

const NOT_FOUND = /could not be found|404/i;

test.describe("personal QR link signed out", () => {
  test("keeps the handle through sign-in @real", async ({ request, baseURL }) => {
    const redirect = await redirectOf(request, `/u/${TEST_ADMIN_HANDLE}`, baseURL);
    expect(redirect.status).toBe(307);
    expect(redirect.path).toBe(signInPath(`/connect/${TEST_ADMIN_HANDLE}`));
  });

  test("a browser lands on sign-in with next=/connect/<handle> @real", async ({ page }) => {
    await stubSignIn(page);
    await page.goto(`/u/${TEST_ADMIN_HANDLE}`);
    await expect(page).toHaveURL(AUTHORIZE_URL);
    expect(nextOf(page)).toBe(`/connect/${TEST_ADMIN_HANDLE}`);
  });

  for (const handle of ["a", "Ana-Lopez", "x".repeat(33)]) {
    test(`a malformed handle (${handle.slice(0, 12)}) goes to the landing @real`, async ({ request, baseURL }) => {
      const redirect = await redirectOf(request, `/u/${handle}`, baseURL);
      expect(redirect.status).toBe(307);
      expect(redirect.path).toBe("/");
    });
  }
});

test.describe("personal QR link signed in", () => {
  test("opens the person's register screen @real", async ({ twoUsers }) => {
    const [scanner, scanned] = twoUsers;
    await skipTours(scanner.page);
    await scanner.page.goto(`/u/${scanned.user.handle}`);
    await expect(scanner.page).toHaveURL(new RegExp(`/connect/${scanned.user.handle}$`));
    await expect(scanner.page.getByText(scanned.user.name).first()).toBeVisible();
  });

  test("an unknown handle shows not found @real", async ({ page, realUser }) => {
    expect(realUser.user.handle).not.toBe("zz-nobody-here");
    await page.goto("/u/zz-nobody-here");
    await expect(page).toHaveURL(/\/connect\/zz-nobody-here$/);
    await expect(page.getByText(NOT_FOUND).first()).toBeVisible();
  });

  test("opens the register screen in mock mode @mock", async ({ page }) => {
    const { handle, name } = valeriaProfile.card;
    await skipTours(page);
    await page.goto(`/u/${handle}`);
    await expect(page).toHaveURL(new RegExp(`/connect/${handle}$`));
    await expect(page.getByText(name).first()).toBeVisible();
  });

  test("an unknown handle shows not found in mock mode @mock", async ({ page, mock }) => {
    await mock.mockServerError("user_not_found");
    await page.goto("/u/zz-nobody-here");
    await expect(page).toHaveURL(/\/connect\/zz-nobody-here$/);
    await expect(page.getByText(NOT_FOUND).first()).toBeVisible();
  });
});
