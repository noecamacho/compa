// Who may open the console (API spec A11): anyone who is not a super admin, signed in or not, gets the same 404 an
// unknown path gets, so /admin cannot be discovered by probing. The seeded test admin gets every page.
import { TEST_EVENT_SLUG } from "../fixtures";
import { expect, test } from "./helpers";

const PAGES = ["/admin", "/admin?archived=1", "/admin/events/new", `/admin/events/${TEST_EVENT_SLUG}`, "/admin/people", "/admin/test-users"];

test.describe("admin access", () => {
  test("a signed-in plain test user gets 404 on every admin page @real", async ({ page, realUser }) => {
    expect(realUser.user.role).toBe("user");
    for (const path of PAGES) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(page.getByRole("navigation", { name: /admin/i })).toHaveCount(0);
    }
  });

  test("a signed-out visitor gets 404 on every admin page, never a sign-in redirect @real", async ({ page }) => {
    for (const path of PAGES) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      expect(new URL(page.url()).pathname).toBe(new URL(path, "http://x").pathname);
    }
  });

  test.describe("as the test admin", () => {
    test.beforeEach(async ({ asAdmin }) => asAdmin);

    test("the seeded test admin opens every admin page @real", async ({ page, copy }) => {
      for (const path of PAGES) {
        const response = await page.goto(path);
        expect(response?.status(), path).toBe(200);
        await expect(page.getByRole("navigation", { name: copy.navLabel })).toBeVisible();
      }
    });
  });

  test("a mock deployment treats the visitor as a super admin @mock", async ({ page, copy }) => {
    for (const path of ["/admin", "/admin/events/new", "/admin/events/founders-fest", "/admin/people", "/admin/test-users"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole("navigation", { name: copy.navLabel })).toBeVisible();
    }
  });
});
