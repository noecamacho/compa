// /admin/people (GET /api/admin/users): the search form, the test-user filter tabs and the result list, in mock mode with
// the documented examples and in real mode as the seeded test admin, who only ever sees test people.
import { adminUsers, noe, testAna } from "../../lib/api/admin-examples";
import { expect, rowOf, test } from "./helpers";

test.describe("admin people (mock)", () => {
  test("lists people with their badges and a result count @mock", async ({ page, copy }) => {
    await page.goto("/admin/people");
    await expect(page.getByRole("heading", { level: 1, name: copy.people.title })).toBeVisible();
    // The mock serves every example person on one page: "1–6 of 6".
    await expect(page.getByRole("status").filter({ hasText: copy.ui.list.range(1, adminUsers.length, adminUsers.length) })).toBeVisible();
    await expect(rowOf(page, `@${noe.handle}`)).toContainText(copy.people.superAdmin);
    await expect(rowOf(page, `@${testAna.handle}`)).toContainText(copy.events.test);
    await expect(rowOf(page, `@${testAna.handle}`)).toContainText(testAna.email ?? "");
  });

  test("the search form sends q and keeps the filter; the tabs keep q @mock", async ({ page, copy }) => {
    await page.goto("/admin/people?test=only");
    await page.getByRole("searchbox", { name: copy.people.searchLabel }).fill("ana");
    await page.getByRole("search").getByRole("button", { name: copy.people.search }).click();
    // A plain GET form: the role and sort selects ride along at their defaults.
    await expect(page).toHaveURL(/\/admin\/people\?.*\bq=ana\b/);
    await expect(page).toHaveURL(/[?&]test=only(&|$)/);
    await expect(page.getByRole("searchbox", { name: copy.people.searchLabel })).toHaveValue("ana");
    const tabs = page.getByRole("navigation", { name: copy.people.title });
    await expect(tabs.getByRole("link", { name: copy.people.filter.only, exact: true })).toHaveAttribute("aria-current", "page");
    await tabs.getByRole("link", { name: copy.people.filter.exclude, exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/people\?(test=exclude&q=ana|q=ana&test=exclude)$/);
    await expect(tabs.getByRole("link", { name: copy.people.filter.exclude, exact: true })).toHaveAttribute("aria-current", "page");
  });
});

test.describe("admin people (real)", () => {
  test.beforeEach(async ({ asAdmin }) => asAdmin);

  test("finds a fresh test user by handle @real", async ({ page, copy, testUsers }) => {
    const [person] = await testUsers(1);
    if (!person) throw new Error("test user not created");
    await page.goto("/admin/people");
    await page.getByRole("searchbox", { name: copy.people.searchLabel }).fill(person.handle);
    await page.getByRole("search").getByRole("button", { name: copy.people.search }).click();
    await expect(page.getByRole("status").filter({ hasText: copy.ui.list.range(1, 1, 1) })).toBeVisible();
    await expect(rowOf(page, `@${person.handle}`)).toContainText(person.name);
    await expect(rowOf(page, `@${person.handle}`)).toContainText(copy.events.test);
  });

  test("no match shows the empty state with a way back to everyone @real", async ({ page, copy }) => {
    await page.goto("/admin/people?test=exclude");
    // A test admin manages test people only, so excluding them leaves nobody.
    await expect(page.getByText(copy.ui.list.noMatch(""), { exact: true })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: copy.ui.resultCount(0) })).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: copy.ui.list.clearFilters }).click();
    await expect(page).toHaveURL(/\/admin\/people$/);
  });

  test("a query longer than the API allows shows the console error frame @real", async ({ page, copy }) => {
    await page.goto(`/admin/people?q=${"a".repeat(81)}`);
    await expect(page.getByRole("alert").filter({ hasText: copy.ui.pageError.title })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.ui.retry })).toBeVisible();
  });
});
