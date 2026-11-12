// F3: dated activity (P5/P6/P17) and the mutual-only list (P7), in both locales and every attendee viewport.
import { connectionDetail, connectionList, notifications, valeriaProfile } from "../../lib/api/examples";
import { formatDate, formatDateTime, timeAgo } from "../../lib/format";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { expect, test } from "../fixtures/mock";
import { copyOf, skipTours } from "../connect/helpers";

const valeria = valeriaProfile.card;

test.beforeEach(async ({ context }) => skipTours(context));

test("profile uses its actual date and opens only mutual connections @mock", async ({ page }, testInfo) => {
  const copy = copyOf(testInfo);
  const locale = localeFromAcceptLanguage(testInfo.project.use.locale);
  await page.goto(`/people/${valeria.handle}`);
  const latest = valeriaProfile.lastInteraction;
  if (!latest) throw new Error("fixture must include a last interaction");
  const lastTime = page.getByRole("link", { name: new RegExp(copy.person.lastTime) });
  await expect(lastTime.locator("time")).toHaveAttribute("datetime", latest.at);
  await expect(lastTime).toContainText(formatDate(locale, latest.at));
  await page.getByRole("link", { name: new RegExp(copy.person.mutualConnections) }).click();
  await expect(page).toHaveURL(`/connections?mutual=${valeria.handle}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.datesAndPeople.mutualWith(valeria.name));
  const ids = valeriaProfile.relationship?.mutual.map((person) => person.id) ?? [];
  for (const { person } of connectionList.people) {
    await expect(page.locator(`a[href="/people/${person.handle}"]`)).toHaveCount(ids.includes(person.id) ? 1 : 0);
  }
  // Search and type filters must not reintroduce a non-mutual connection.
  await page.getByRole("button", { name: copy.connections.search, exact: true }).click();
  await page.getByRole("searchbox").fill(valeria.name);
  await expect(page.getByText(copy.connections.emptyFiltered, { exact: true })).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await page.getByRole("group", { name: copy.connections.filterLabel }).getByRole("button", { name: copy.connections.filters.reconnection, exact: true }).click();
  await expect(page.getByText(copy.connections.emptyFiltered, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: copy.datesAndPeople.showAll }).click();
  await expect(page).toHaveURL("/connections");
  await expect(page.locator(`a[href="/people/${valeria.handle}"]`)).toBeVisible();
});

test("an empty mutual list stays empty and can be cleared @mock", async ({ page }, testInfo) => {
  const copy = copyOf(testInfo);
  await page.setExtraHTTPHeaders({ "Accept-Language": testInfo.project.use.locale ?? "en-US", "x-compa-mock-example": "stranger" });
  await page.goto(`/connections?mutual=${valeria.handle}`);
  await expect(page.getByText(copy.datesAndPeople.noMutual)).toBeVisible();
  for (const { person } of connectionList.people) await expect(page.locator(`a[href="/people/${person.handle}"]`)).toHaveCount(0);
  await page.getByRole("link", { name: copy.datesAndPeople.showAll }).click();
  await expect(page.getByRole("heading", { name: copy.connections.title, exact: true })).toBeVisible();
});

test("invalid mutual handles do not broaden the list @mock", async ({ page }, testInfo) => {
  await page.goto("/connections?mutual=invalid!");
  await expect(page.getByRole("heading", { name: copyOf(testInfo).notFound.title, exact: true })).toBeVisible();
  await expect(page.locator(`a[href="/people/${valeria.handle}"]`)).toHaveCount(0);
});

test("failed mutual lookup shows the retry screen @mock", async ({ page, mock }, testInfo) => {
  await mock.mockServerError("unauthorized");
  await page.goto(`/connections?mutual=${valeria.handle}`);
  await expect(page.getByRole("button", { name: copyOf(testInfo).screenState.retry })).toBeVisible();
});

test("notifications show dates and the same clock as Home @mock", async ({ page }, testInfo) => {
  const locale = localeFromAcceptLanguage(testInfo.project.use.locale);
  await page.goto("/notifications");
  const times = page.locator("main time");
  await expect(times).toHaveCount(notifications.notifications.length);
  for (const [index, item] of notifications.notifications.entries()) {
    await expect(times.nth(index)).toHaveAttribute("datetime", item.createdAt);
    await expect(times.nth(index)).toHaveText(formatDateTime(locale, item.createdAt));
  }
});

test("old notes use a calendar date instead of hundreds of hours @mock", async ({ page }, testInfo) => {
  const locale = localeFromAcceptLanguage(testInfo.project.use.locale);
  await page.goto(`/connections/${connectionDetail.connectionId}/note`);
  await expect(page.getByRole("main").getByText(copyOf(testInfo).note.reconnectionAgo(copyOf(testInfo).connections.types[connectionDetail.kind === "reconnection" ? "reconnection" : "new"], timeAgo(locale, connectionDetail.at)), { exact: true })).toBeVisible();
});
