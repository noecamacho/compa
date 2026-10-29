// /admin/test-users (TestUsersPanel, API spec A11): create by count and preset, sign in as, delete. Mock mode checks the
// requests and every message; real mode does it for real as the seeded test admin and deletes whatever it created.
import type { Locator, Page, TestInfo } from "@playwright/test";
import { testUser } from "../../lib/api/admin-examples";
import { TestUserList } from "../../lib/api/admin-schemas";
import { me } from "../../lib/api/examples";
import { firstName } from "../../lib/format";
import { TEST_EVENT_SLUG } from "../fixtures";
import { expect, rowOf, test, type AdminCopy } from "./helpers";

// The generator is a closed <details> on a phone once the list has people; from 768 px it is always open.
async function openGenerator(page: Page, copy: AdminCopy, testInfo: TestInfo): Promise<Locator> {
  const count = page.getByLabel(copy.tests.count);
  if ((testInfo.project.use.viewport?.width ?? 1440) < 768 && !(await count.isVisible())) await page.locator("summary").filter({ hasText: copy.tests.generatorTitle }).click();
  await expect(count).toBeVisible();
  return count;
}

// The submit button names what it makes ("Create 2 test users"), or just "Create" while the count is invalid.
const createButton = (page: Page, copy: AdminCopy, count?: number) =>
  page.getByRole("button", { name: count === undefined ? copy.tests.create : copy.tests.createN(count), exact: true });

// Typing before hydration never reaches React, so retype until the button follows the count.
async function setCount(page: Page, copy: AdminCopy, count: Locator, value: string, valid = true): Promise<void> {
  await expect(async () => {
    await count.fill(value);
    await expect(createButton(page, copy, valid ? Number(value) : undefined)).toBeVisible({ timeout: 2_000 });
  }).toPass();
}

test.describe("admin test users (mock)", () => {
  test("lists test users with their event and actions @mock", async ({ page, copy }) => {
    await page.goto("/admin/test-users");
    await expect(page.getByRole("heading", { level: 1, name: copy.tests.title })).toBeVisible();
    const row = rowOf(page, `@${testUser.handle}`);
    // The table has a "Current event" column; the phone card reads "at Codex Conf 2026".
    await expect(row).toContainText(testUser.currentEvent?.name ?? "");
    // Repeated buttons name their person ("Sign in as Ana Garza").
    await expect(row.getByRole("button", { name: `${copy.tests.signIn} ${testUser.name}` })).toBeVisible();
    await expect(row.getByRole("button", { name: `${copy.tests.delete} ${testUser.name}` })).toBeVisible();
  });

  test("an out-of-range count is flagged and nothing is sent @mock", async ({ page, copy }, testInfo) => {
    const posts: string[] = [];
    page.on("request", (request) => request.method() === "POST" && request.url().endsWith("/api/admin/test-users") && posts.push(request.url()));
    await page.goto("/admin/test-users");
    const count = await openGenerator(page, copy, testInfo);
    for (const value of ["0", "51", "1.5"]) {
      await setCount(page, copy, count, value, false);
      await createButton(page, copy).click();
      await expect(count).toHaveAccessibleDescription(copy.ui.tests.countInvalid);
    }
    expect(posts).toHaveLength(0);
  });

  test("create sends count, preset and the test event, then confirms @mock", async ({ page, copy }, testInfo) => {
    await page.goto("/admin/test-users");
    const count = await openGenerator(page, copy, testInfo);
    await setCount(page, copy, count, "2");
    await page.getByLabel(copy.tests.preset).selectOption("engineer");
    await page.getByLabel(copy.tests.checkInTo).selectOption("");
    const [request] = await Promise.all([page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/api/admin/test-users")), createButton(page, copy, 2).click()]);
    expect(request.postDataJSON()).toEqual({ count: 2, preset: "engineer" });
    await expect(page.getByRole("status").filter({ hasText: copy.ui.done.testCreated(2) })).toBeVisible();

    await page.getByLabel(copy.tests.checkInTo).selectOption(TEST_EVENT_SLUG);
    const [withEvent] = await Promise.all([page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/api/admin/test-users")), createButton(page, copy, 2).click()]);
    expect(withEvent.postDataJSON()).toMatchObject({ checkInTo: TEST_EVENT_SLUG });
  });

  test("a failed create shows the error @mock", async ({ page, mock, copy }, testInfo) => {
    await page.goto("/admin/test-users");
    const count = await openGenerator(page, copy, testInfo);
    await setCount(page, copy, count, "1");
    await mock.mockError("not_test_event", "**/api/admin/test-users");
    await createButton(page, copy, 1).click();
    await expect(page.getByRole("alert").filter({ hasText: copy.tests.failed })).toBeVisible();
  });

  test("sign in as: cancel stays, confirm opens home as that person @mock", async ({ page, copy }) => {
    await page.goto("/admin/test-users");
    const dialog = page.getByRole("dialog", { name: copy.ui.dialogs.signIn.title(testUser.name) });
    await rowOf(page, `@${testUser.handle}`).getByRole("button", { name: copy.tests.signIn }).click();
    // It names the admin session being replaced (the mock's super admin) and how to get it back.
    await expect(dialog).toHaveAccessibleDescription(copy.tests.signInWarning(me.handle));
    await dialog.getByRole("button", { name: copy.ui.cancel }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/admin\/test-users$/);

    await rowOf(page, `@${testUser.handle}`).getByRole("button", { name: copy.tests.signIn }).click();
    const [request] = await Promise.all([
      page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith(`/api/admin/test-users/${testUser.id}/session`)),
      dialog.getByRole("button", { name: copy.ui.dialogs.signIn.confirm }).click(),
    ]);
    expect(request.method()).toBe("POST");
    // The dev server may compile /home on this first visit.
    await expect(page).toHaveURL(/\/home$/, { timeout: 30_000 });
  });

  test("delete asks first, then calls the API and confirms; a failure shows the error @mock", async ({ page, mock, copy }) => {
    await page.goto("/admin/test-users");
    const dialog = page.getByRole("dialog", { name: copy.ui.dialogs.deleteTest.title(testUser.name) });
    await rowOf(page, `@${testUser.handle}`).getByRole("button", { name: copy.tests.delete }).click();
    await expect(dialog).toHaveAccessibleDescription(copy.tests.deleteConfirm);
    const [request] = await Promise.all([
      page.waitForRequest((r) => r.method() === "DELETE" && r.url().endsWith(`/api/admin/test-users/${testUser.id}`)),
      dialog.getByRole("button", { name: copy.ui.dialogs.deleteTest.confirm }).click(),
    ]);
    expect(request.method()).toBe("DELETE");
    await expect(page.getByRole("status").filter({ hasText: copy.ui.dialogs.deleteTest.done })).toBeVisible();

    await mock.mockError("test_user_not_found", `**/api/admin/test-users/${testUser.id}`);
    await rowOf(page, `@${testUser.handle}`).getByRole("button", { name: copy.tests.delete }).click();
    await dialog.getByRole("button", { name: copy.ui.dialogs.deleteTest.confirm }).click();
    await expect(page.getByRole("alert").filter({ hasText: copy.tests.failed })).toBeVisible();
  });
});

test.describe("admin test users (real)", () => {
  test.beforeEach(async ({ asAdmin }) => asAdmin);

  test("create one engineer from the panel; it shows in the list @real", async ({ page, copy, realMode }, testInfo) => {
    await page.goto("/admin/test-users");
    const count = await openGenerator(page, copy, testInfo);
    await setCount(page, copy, count, "1");
    await page.getByLabel(copy.tests.preset).selectOption("engineer");
    await page.getByLabel(copy.tests.checkInTo).selectOption(TEST_EVENT_SLUG);
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/api/admin/test-users")),
      createButton(page, copy, 1).click(),
    ]);
    const created = TestUserList.parse(await response.json()).users;
    try {
      expect(response.status()).toBe(201);
      expect(created).toHaveLength(1);
      await expect(page.getByRole("status").filter({ hasText: copy.ui.done.testCreated(1) })).toBeVisible();
      const [person] = created;
      if (!person) throw new Error("no user created");
      await expect(rowOf(page, `@${person.handle}`)).toContainText("Codex Conf 2026");
    } finally {
      for (const person of created) await realMode.deleteTestUser(person.id).catch(() => undefined);
    }
  });

  test("sign in as a test user replaces the session and opens their home @real", async ({ page, copy, realMode }) => {
    const [person] = await realMode.createTestUsers({ count: 1 });
    if (!person) throw new Error("test user not created");
    try {
      await page.goto("/admin/test-users");
      await rowOf(page, `@${person.handle}`).getByRole("button", { name: copy.tests.signIn }).click();
      await page.getByRole("dialog", { name: copy.ui.dialogs.signIn.title(person.name) }).getByRole("button", { name: copy.ui.dialogs.signIn.confirm }).click();
      // /home renders server-side for the new session; under a loaded shared server it can take longer than 10 s.
      await expect(page).toHaveURL(/\/home$/, { timeout: 30_000 });
      await expect(page.getByText(firstName(person.name), { exact: false }).first()).toBeVisible({ timeout: 30_000 });
      // The admin session is gone: the console is now hidden from this browser.
      expect((await page.goto("/admin"))?.status()).toBe(404);
    } finally {
      await realMode.deleteTestUser(person.id).catch(() => undefined);
    }
  });

  test("delete removes a test user from the list @real", async ({ page, copy, realMode }) => {
    const [person] = await realMode.createTestUsers({ count: 1 });
    if (!person) throw new Error("test user not created");
    try {
      await page.goto("/admin/test-users");
      const row = rowOf(page, `@${person.handle}`);
      await row.getByRole("button", { name: copy.tests.delete }).click();
      await page.getByRole("dialog", { name: copy.ui.dialogs.deleteTest.title(person.name) }).getByRole("button", { name: copy.ui.dialogs.deleteTest.confirm }).click();
      await expect(page.getByRole("status").filter({ hasText: copy.ui.dialogs.deleteTest.done })).toBeVisible();
      await expect(row).toBeHidden();
      expect(await realMode.listTestUsers(person.handle)).toEqual([]);
    } finally {
      await realMode.deleteTestUser(person.id).catch(() => undefined);
    }
  });
});
