// 07 Conexiones (F-39): grouped people, the kind filters, the event chip, the empty state, a row to the profile and
// the error screen. The list copy is Spanish-only (lib/copy/index.ts), so both locales assert lib/copy/es.
import { connectionList, foundersDoor, valeriaConnected } from "../../lib/api/examples";
import { connections as copy } from "../../lib/copy/es";
import { expect, expectErrorScreen, acceptedConnection, skipTours, test } from "../profiles/helpers";

type Filter = keyof typeof copy.filters;

// Who each filter keeps in the mock list (`type` of each PersonHistory in lib/api/examples.ts).
const namesFor = (filter: Filter): string[] =>
  connectionList.people.filter((entry) => filter === "all" || entry.type === filter).map((entry) => entry.person.name);

test.describe("connections list in mock mode", () => {
  test.beforeEach(async ({ page }) => skipTours(page));

  test("lists every person with their topics, kind and event chip @mock", async ({ page }) => {
    await page.goto("/connections");
    await expect(page.getByRole("heading", { name: copy.title })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.search })).toBeVisible();
    await expect(page.getByRole("button", { name: foundersDoor.name })).toBeVisible();
    for (const entry of connectionList.people) {
      const row = page.getByRole("link", { name: new RegExp(entry.person.name) });
      await expect(row).toHaveAttribute("href", `/people/${entry.person.handle}`);
      await expect(row).toContainText((entry.topics ?? []).join(" · "));
      await expect(row.getByRole("img", { name: copy.types[entry.type ?? "new"] })).toBeVisible();
    }
  });

  test("each kind filter keeps only its people @mock", async ({ page }) => {
    await page.goto("/connections");
    const group = page.getByRole("group", { name: copy.filterLabel });
    for (const filter of ["new", "reconnection", "friend", "all"] as const) {
      await group.getByRole("button", { name: copy.filters[filter] }).click();
      await expect(group.getByRole("button", { name: copy.filters[filter] })).toHaveAttribute("aria-pressed", "true");
      for (const entry of connectionList.people) {
        const shown = namesFor(filter).includes(entry.person.name);
        await expect(page.getByRole("link", { name: new RegExp(entry.person.name) })).toHaveCount(shown ? 1 : 0);
      }
    }
  });

  test("a row opens the person's profile @mock", async ({ page }) => {
    await page.goto("/connections");
    await page.getByRole("link", { name: new RegExp(valeriaConnected.name) }).click();
    await expect(page).toHaveURL(new RegExp(`/people/${valeriaConnected.handle}$`));
    await expect(page.getByRole("heading", { name: valeriaConnected.name })).toBeVisible();
  });

  test("no connections yet shows the empty state and its call to action @mock", async ({ page }) => {
    await page.goto("/connections?demo=empty");
    await expect(page.getByText(copy.emptyTitle)).toBeVisible();
    await expect(page.getByText(copy.empty)).toBeVisible();
    await expect(page.getByRole("group", { name: copy.filterLabel })).toHaveCount(0);
    await page.getByRole("link", { name: copy.emptyCta }).click();
    await expect(page).toHaveURL(/\/connect$/);
  });

  test("a failed list shows the error screen @mock", async ({ page, mock }) => {
    await mock.mockServerError("unauthorized");
    await page.goto("/connections");
    await expectErrorScreen(page);
  });
});

test.describe("connections list in real mode", () => {
  test("a newcomer has the empty state and the event chip @real", async ({ people, testEvent }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    await ana.page.goto("/connections");
    await expect(ana.page.getByText(copy.emptyTitle)).toBeVisible();
    await expect(ana.page.getByRole("button", { name: testEvent.name })).toBeVisible();
  });

  test("an accepted connection appears on both lists as new @real", async ({ people }) => {
    const [ana, bruno] = await people([{}, {}]);
    if (!ana || !bruno) throw new Error("test users not created");
    await acceptedConnection(ana, bruno);
    for (const [viewer, other] of [[ana, bruno], [bruno, ana]] as const) {
      await viewer.page.goto("/connections");
      // Generated names can repeat, so match the profile link of that handle.
      const row = viewer.page.locator(`a[href="/people/${other.user.handle}"]`);
      await expect(row.getByRole("img", { name: copy.types.new })).toBeVisible();
      await viewer.page.getByRole("button", { name: copy.filters.reconnection }).click();
      await expect(viewer.page.getByText(copy.emptyFiltered)).toBeVisible();
    }
  });

  test("an unanswered request is not listed as a connection @real", async ({ people }) => {
    test.fixme(true, "OPEN QUESTION 61 (wiki/open-questions.md): GET /api/connections groups pending meetings too, so an unanswered requester shows as \"Nueva\"");
    const [ana, carla] = await people([{}, {}]);
    if (!ana || !carla) throw new Error("test users not created");
    await carla.page.request.post("/api/connections", { data: { toHandle: ana.user.handle, screenConsent: true } });
    await ana.page.goto("/connections");
    await expect(ana.page.locator(`a[href="/people/${carla.user.handle}"]`)).toHaveCount(0);
  });
});
