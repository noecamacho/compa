// The event console (flows F-55..F-57, backlog T-023): /admin, /admin/events/new and /admin/events/<slug>. Mock mode drives
// every button against the documented examples and error codes; real mode does it as the seeded test admin on throwaway
// test events (slug prefix e2e-admin-) that are archived afterwards.
import type { Page, Request } from "@playwright/test";
import { adminEvent, adminIds, testEvent } from "../../lib/api/admin-examples";
import { founders } from "../../lib/api/examples";
import { TEST_EVENT_SLUG } from "../fixtures";
import { codeOf, expect, test, UNKNOWN_SLUG, uniqueSlug, type AdminCopy } from "./helpers";

const DETAIL = `/admin/events/${adminEvent.slug}`;

// Requests to one API path, kept so a test can assert that a cancelled dialog sent nothing.
function recordRequests(page: Page, method: string, pathEnd: string): Request[] {
  const seen: Request[] = [];
  page.on("request", (request) => request.method() === method && new URL(request.url()).pathname.endsWith(pathEnd) && seen.push(request));
  return seen;
}

const statusText = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text });
const alertText = (page: Page, text: string) => page.getByRole("alert").filter({ hasText: text });

async function fillNewEvent(page: Page, copy: AdminCopy, name: string, slug: string): Promise<void> {
  await page.getByLabel(copy.form.name, { exact: true }).fill(name);
  await page.getByLabel(copy.form.slug).fill(slug);
}

type DangerKey = "rotate" | "end" | "archive";
const DANGER: { key: DangerKey; path: string }[] = [
  { key: "rotate", path: "/rotate-code" },
  { key: "end", path: "/end" },
  { key: "archive", path: "/archive" },
];
const dangerButton = (copy: AdminCopy, key: DangerKey) => ({ rotate: copy.detail.rotate, end: copy.detail.end, archive: copy.detail.archive })[key];
const dangerBody = (copy: AdminCopy, key: DangerKey) => ({ rotate: copy.detail.rotateConfirm, end: copy.detail.endConfirm, archive: copy.detail.archiveConfirm })[key];

async function confirmDanger(page: Page, copy: AdminCopy, key: DangerKey): Promise<void> {
  const { title, confirm } = copy.ui.dialogs[key];
  await page.getByRole("button", { name: dangerButton(copy, key), exact: true }).click();
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: confirm, exact: true }).click();
  await expect(dialog).toBeHidden();
}

test.describe("admin events console (mock)", () => {
  test("the dashboard lists events, filters archived and links to each event @mock", async ({ page, copy }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: copy.events.title })).toBeVisible();
    await expect(page.getByRole("navigation", { name: copy.navLabel }).getByRole("link", { name: copy.nav.events })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: `${copy.events.open}: ${adminEvent.name}` })).toBeVisible();
    await expect(page.getByRole("link", { name: `${copy.events.open}: ${testEvent.name}` })).toBeVisible();
    await expect(page.getByText(copy.events.counts(adminEvent.counts.attendees, adminEvent.counts.connections)).filter({ visible: true })).toBeVisible();

    const tabs = page.getByRole("navigation", { name: copy.events.title });
    await expect(tabs.getByRole("link", { name: copy.events.hideArchived })).toHaveAttribute("aria-current", "page");
    await tabs.getByRole("link", { name: copy.events.showArchived }).click();
    await expect(page).toHaveURL(/\/admin\?archived=1$/);
    await expect(tabs.getByRole("link", { name: copy.events.showArchived })).toHaveAttribute("aria-current", "page");

    await page.getByRole("link", { name: `${copy.events.open}: ${adminEvent.name}` }).click();
    await expect(page).toHaveURL(new RegExp(`${DETAIL}$`));
    await expect(page.getByRole("heading", { level: 1, name: adminEvent.name })).toBeVisible();
  });

  test("the console nav and the new-event button reach every section @mock", async ({ page, copy }) => {
    await page.goto("/admin");
    await page.getByRole("link", { name: copy.events.create }).click();
    await expect(page).toHaveURL(/\/admin\/events\/new$/);
    await expect(page.getByRole("heading", { level: 1, name: copy.form.createTitle })).toBeVisible();
    const nav = page.getByRole("navigation", { name: copy.navLabel });
    await nav.getByRole("link", { name: copy.nav.people }).click();
    await expect(page).toHaveURL(/\/admin\/people$/);
    await nav.getByRole("link", { name: copy.nav.testUsers }).click();
    await expect(page).toHaveURL(/\/admin\/test-users$/);
    await nav.getByRole("link", { name: copy.nav.events }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("link", { name: copy.nav.app })).toHaveAttribute("href", "/me");
  });

  test("the new-event form flags every invalid field before sending anything @mock", async ({ page, copy }) => {
    const posts = recordRequests(page, "POST", "/api/admin/events");
    const u = copy.ui.form;
    await page.goto("/admin/events/new");
    await page.getByRole("button", { name: copy.form.create }).click();
    await expect(alertText(page, u.fixErrors(2))).toBeVisible();
    await expect(page.getByLabel(copy.form.name, { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel(copy.form.name, { exact: true })).toBeFocused();
    await expect(page.getByLabel(copy.form.slug)).toHaveAccessibleDescription(u.required);

    await fillNewEvent(page, copy, "Bad slug night", "Bad Slug");
    await expect(page.getByLabel(copy.form.slug)).toHaveValue("bad slug");
    await expect(page.getByLabel(copy.form.slug)).toHaveAccessibleDescription(u.slugFormat);
    await page.getByLabel(copy.form.slug).fill("ok-slug");
    await page.getByLabel(copy.form.websiteUrl).fill("not a link");
    await page.getByLabel(copy.form.startsAt).fill("2026-11-02T20:00");
    await page.getByLabel(copy.form.endsAt).fill("2026-11-02T18:00");
    await page.getByRole("button", { name: copy.form.create }).click();
    await expect(alertText(page, u.fixErrors(2))).toBeVisible();
    await expect(page.getByLabel(copy.form.websiteUrl)).toHaveAccessibleDescription(u.urlInvalid);
    await expect(page.getByLabel(copy.form.endsAt)).toHaveAccessibleDescription(u.endBeforeStart);
    expect(posts).toHaveLength(0);
  });

  test("an unknown or half-typed time zone is flagged, not a crash @mock", async ({ page, copy }) => {
    await page.goto("/admin/events/new");
    const zone = page.getByLabel(copy.form.timezone);
    // Typed key by key, like a person: every prefix such as "A" or "America/Mex" is an unknown zone for a moment.
    await zone.clear();
    await zone.pressSequentially("Mars/Olympus");
    await page.getByRole("button", { name: copy.form.create }).click();
    await expect(zone).toHaveAccessibleDescription(copy.ui.form.zoneInvalid);
    await zone.fill("Europe/Madrid");
    await expect(zone).toHaveAccessibleDescription("");
    await expect(page.getByRole("alert").filter({ hasText: copy.ui.pageError.title })).toHaveCount(0);
  });

  test("schedule blocks can be added, checked and removed @mock", async ({ page, copy }) => {
    await page.goto("/admin/events/new");
    await expect(page.getByText(copy.ui.form.scheduleEmpty)).toBeVisible();
    await page.getByRole("button", { name: copy.form.addEntry }).click();
    const block = page.getByRole("group", { name: `${copy.form.schedule} 1` });
    await expect(block).toBeVisible();
    await block.getByLabel(copy.form.entryStart).fill("18:00");
    await block.getByLabel(copy.form.entryEnd).fill("17:00");
    await page.getByRole("button", { name: copy.form.create }).click();
    await expect(block.getByLabel(copy.form.entryEnd)).toHaveAccessibleDescription(copy.ui.form.entryBeforeStart);
    await block.getByRole("button", { name: `${copy.form.removeEntry} 1` }).click();
    await expect(block).toBeHidden();
    await expect(page.getByText(copy.ui.form.scheduleEmpty)).toBeVisible();
  });

  test("creating sends the event and opens its page @mock", async ({ page, copy }, testInfo) => {
    await page.goto("/admin/events/new");
    await fillNewEvent(page, copy, "Mock Night", "mock-night");
    await page.getByLabel(copy.form.city).fill("Guadalajara");
    // The live preview sits beside the form from 1024 px only.
    const wide = (testInfo.project.use.viewport?.width ?? 0) >= 1024;
    if (wide) await expect(page.getByText("/admin/events/mock-night")).toBeVisible();
    const [request] = await Promise.all([page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/api/admin/events")), page.getByRole("button", { name: copy.form.create }).click()]);
    expect(request.postDataJSON()).toMatchObject({ name: "Mock Night", slug: "mock-night", city: "Guadalajara", timezone: "America/Mexico_City", status: "live" });
    // The mock answers with the documented example, Founders Fest.
    await expect(page).toHaveURL(new RegExp(`/admin/events/${founders.slug}$`));
  });

  test("a taken slug and a server-side invalid field show inline and keep the form @mock", async ({ page, mock, copy }) => {
    await page.goto("/admin/events/new");
    await fillNewEvent(page, copy, "Mock Night", "mock-night");
    await mock.mockError("slug_taken", "**/api/admin/events");
    await page.getByRole("button", { name: copy.form.create }).click();
    await expect(alertText(page, copy.form.slugTaken)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/events\/new$/);
    await mock.mockError("invalid_input", "**/api/admin/events");
    await page.getByRole("button", { name: copy.form.create }).click();
    await expect(alertText(page, `${copy.form.failed} name:`)).toBeVisible();
  });

  test("an unsaved draft survives a reload and can be discarded @mock", async ({ page, copy }) => {
    await page.goto("/admin/events/new");
    await page.getByLabel(copy.form.name, { exact: true }).fill("Draft night");
    await expect(page.getByText(copy.ui.form.unsaved).filter({ visible: true })).toBeVisible();
    await page.reload();
    await expect(statusText(page, copy.ui.form.draftRestored)).toBeVisible();
    await expect(page.getByLabel(copy.form.name, { exact: true })).toHaveValue("Draft night");
    await page.getByRole("button", { name: copy.ui.form.discardDraft }).click();
    await expect(page.getByLabel(copy.form.name, { exact: true })).toHaveValue("");
    await expect(statusText(page, copy.ui.form.draftRestored)).toBeHidden();
  });

  test("the event page shows its numbers, printable QR, join link and share buttons @mock", async ({ page, context, copy }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(DETAIL);
    await expect(page.getByRole("heading", { level: 1, name: adminEvent.name })).toBeVisible();
    await expect(page.getByText(copy.status.live, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("img", { name: copy.detail.qrLabel(adminEvent.name) }).locator("svg")).toBeVisible();
    await expect(page.getByText(adminEvent.joinUrl, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.detail.attendees, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: copy.detail.live })).toHaveAttribute("href", `${adminEvent.joinUrl}/live`);
    await expect(page.getByRole("link", { name: copy.detail.live })).toHaveAttribute("target", "_blank");
    await page.getByRole("button", { name: copy.detail.copy, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.detail.copied, exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(adminEvent.joinUrl);
    await page.getByRole("link", { name: copy.events.title }).first().click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  for (const { key, path } of DANGER) {
    test(`${key}: cancel sends nothing, confirm calls the API and says so @mock`, async ({ page, copy }) => {
      const sent = recordRequests(page, "POST", path);
      await page.goto(DETAIL);
      const { title, done } = copy.ui.dialogs[key];
      await page.getByRole("button", { name: dangerButton(copy, key), exact: true }).click();
      const dialog = page.getByRole("dialog", { name: title });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAccessibleDescription(dangerBody(copy, key));
      await dialog.getByRole("button", { name: copy.ui.cancel }).click();
      await expect(dialog).toBeHidden();
      expect(sent).toHaveLength(0);
      await confirmDanger(page, copy, key);
      await expect(statusText(page, done)).toBeVisible();
      expect(sent).toHaveLength(1);
    });

    test(`${key}: a failed call shows the error @mock`, async ({ page, mock, copy }) => {
      await page.goto(DETAIL);
      await mock.mockError("event_not_found", `**/api/admin/events/*${path}`);
      await confirmDanger(page, copy, key);
      await expect(alertText(page, copy.detail.failed)).toBeVisible();
    });
  }

  test("Esc closes a confirmation without acting @mock", async ({ page, copy }) => {
    const sent = recordRequests(page, "POST", "/archive");
    await page.goto(DETAIL);
    await page.getByRole("button", { name: copy.detail.archive, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: copy.ui.dialogs.archive.title });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(sent).toHaveLength(0);
  });

  test("editing details saves with PATCH and shows server errors @mock", async ({ page, mock, copy }) => {
    await page.goto(DETAIL);
    const name = page.getByLabel(copy.form.name, { exact: true });
    await expect(name).toHaveValue(adminEvent.name);
    await name.fill("Founders Fest GDL 2");
    await expect(page.getByText(copy.ui.form.unsaved).filter({ visible: true })).toBeVisible();
    const [request] = await Promise.all([
      page.waitForRequest((r) => r.method() === "PATCH" && r.url().endsWith(`/api/admin/events/${adminEvent.slug}`)),
      page.getByRole("button", { name: copy.form.save, exact: true }).click(),
    ]);
    expect(request.postDataJSON()).toMatchObject({ name: "Founders Fest GDL 2" });
    await expect(statusText(page, copy.ui.saved)).toBeVisible();

    await mock.mockError("invalid_input", `**/api/admin/events/${adminEvent.slug}`);
    await page.getByRole("button", { name: copy.form.save, exact: true }).click();
    await expect(alertText(page, copy.form.failed)).toBeVisible();
    await name.fill("");
    await page.getByRole("button", { name: copy.form.save, exact: true }).click();
    await expect(alertText(page, copy.ui.form.fixErrors(1))).toBeVisible();
  });

  test("attendees: search, check in, remove with confirmation, and errors @mock", async ({ page, mock, copy }) => {
    await page.goto(DETAIL);
    const picker = page.getByRole("search").first();
    await picker.getByRole("searchbox").fill("ana");
    const [search] = await Promise.all([page.waitForRequest((r) => r.url().includes("/api/admin/users?")), picker.getByRole("button", { name: copy.people.search }).click()]);
    expect(new URL(search.url()).searchParams.get("q")).toBe("ana");
    const result = page.getByRole("listitem").filter({ hasText: "@ana-garza-k3p9" }).filter({ has: page.getByRole("button", { name: copy.attendees.add, exact: true }) });
    const [checkIn] = await Promise.all([
      page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/attendees")),
      result.getByRole("button", { name: copy.attendees.add, exact: true }).click(),
    ]);
    expect(checkIn.postDataJSON()).toEqual({ userId: adminIds.testAna });
    await expect(statusText(page, copy.ui.done.checkedIn)).toBeVisible();

    await page.getByRole("button", { name: `${copy.attendees.remove}: Ana Garza` }).click();
    const dialog = page.getByRole("dialog", { name: copy.ui.dialogs.removeAttendee.title("Ana Garza") });
    await expect(dialog).toHaveAccessibleDescription(copy.attendees.removeConfirm);
    const [removal] = await Promise.all([
      page.waitForRequest((r) => r.method() === "DELETE" && r.url().endsWith(`/attendees/${adminIds.testAna}`)),
      dialog.getByRole("button", { name: copy.ui.dialogs.removeAttendee.confirm }).click(),
    ]);
    expect(removal.method()).toBe("DELETE");
    await expect(statusText(page, copy.ui.dialogs.removeAttendee.done)).toBeVisible();

    await mock.mockError("test_user_not_allowed", "**/api/admin/events/*/attendees");
    await picker.getByRole("button", { name: copy.people.search }).click();
    await result.getByRole("button", { name: copy.attendees.add, exact: true }).click();
    await expect(alertText(page, copy.detail.failed)).toBeVisible();
  });

  test("a failed people search says so in the picker @mock", async ({ page, mock, copy }) => {
    await page.goto(DETAIL);
    await mock.mockError("invalid_input", /\/api\/admin\/users\?/);
    const picker = page.getByRole("search").first();
    await picker.getByRole("searchbox").fill("ana");
    await picker.getByRole("button", { name: copy.people.search }).click();
    await expect(statusText(page, copy.detail.failed)).toBeVisible();
  });

  test("organizers: assign from search and remove without a dialog @mock", async ({ page, copy }) => {
    await page.goto(DETAIL);
    const picker = page.getByRole("search").nth(1);
    await picker.getByRole("searchbox").fill("noe");
    await picker.getByRole("button", { name: copy.people.search }).click();
    const result = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: copy.organizers.add, exact: true }) }).filter({ hasText: "@noe-camacho" });
    const [assign] = await Promise.all([
      page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/organizers")),
      result.getByRole("button", { name: copy.organizers.add, exact: true }).click(),
    ]);
    expect(assign.postDataJSON()).toEqual({ userId: adminIds.noe, role: "organizer" });
    await expect(statusText(page, copy.ui.done.organizerAdded)).toBeVisible();
    await expect(result).toBeHidden();

    const [removal] = await Promise.all([
      page.waitForRequest((r) => r.method() === "DELETE" && r.url().endsWith(`/organizers/${adminIds.noe}`)),
      page.getByRole("button", { name: `${copy.organizers.remove}: Noe Camacho` }).click(),
    ]);
    expect(removal.method()).toBe("DELETE");
    await expect(statusText(page, copy.ui.done.organizerRemoved)).toBeVisible();
  });
});

test.describe("admin events console (real)", () => {
  test.beforeEach(async ({ asAdmin }) => asAdmin);

  test("the test admin's dashboard lists the shared test event @real", async ({ page, copy }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: copy.events.title })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(`${copy.events.open}: Codex Conf 2026`) })).toBeVisible();
  });

  test("creating through the form opens the new test event @real", async ({ page, copy, events }) => {
    const slug = uniqueSlug();
    events.track(slug);
    await page.goto("/admin/events/new");
    await fillNewEvent(page, copy, `E2E form ${slug}`, slug);
    await page.getByRole("button", { name: copy.form.create }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/events/${slug}$`), { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1, name: `E2E form ${slug}` })).toBeVisible();
    // A test super admin only makes test events.
    await expect(page.getByText(copy.events.test, { exact: true }).first()).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: `${copy.events.open}: E2E form ${slug}` })).toBeVisible();
  });

  test("a taken slug is refused in the form @real", async ({ page, copy }) => {
    await page.goto("/admin/events/new");
    await fillNewEvent(page, copy, "Clash", TEST_EVENT_SLUG);
    await page.getByRole("button", { name: copy.form.create }).click();
    await expect(alertText(page, copy.form.slugTaken)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/events\/new$/);
  });

  test("rotate, end and archive change the event for real @real", async ({ page, copy, events }) => {
    const event = await events.create();
    await page.goto(`/admin/events/${event.slug}`);
    await expect(page.getByText(event.joinUrl, { exact: true })).toBeVisible();

    await confirmDanger(page, copy, "rotate");
    await expect(statusText(page, copy.ui.dialogs.rotate.done)).toBeVisible();
    await expect(page.getByText(event.joinUrl, { exact: true })).toBeHidden();
    const rotated = (await page.getByText(/\/e\/[a-z0-9]{8,32}$/).first().textContent()) ?? "";
    expect(codeOf(rotated)).not.toBe(event.accessCode);

    await confirmDanger(page, copy, "end");
    await expect(page.getByRole("button", { name: copy.detail.end, exact: true })).toBeHidden();
    await expect(page.getByText(copy.status.ended, { exact: true }).first()).toBeVisible();

    await confirmDanger(page, copy, "archive");
    await expect(page.getByRole("button", { name: copy.detail.archive, exact: true })).toBeHidden();
    await expect(page.getByText(copy.status.archived, { exact: true }).first()).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: `${copy.events.open}: ${event.name}` })).toBeHidden();
    await page.goto("/admin?archived=1");
    await expect(page.getByRole("link", { name: `${copy.events.open}: ${event.name}` })).toBeVisible();
  });

  test("editing the name saves and the page shows it @real", async ({ page, copy, events }) => {
    const event = await events.create();
    await page.goto(`/admin/events/${event.slug}`);
    await page.getByLabel(copy.form.name, { exact: true }).fill(`${event.name} edited`);
    await page.getByRole("button", { name: copy.form.save, exact: true }).click();
    await expect(statusText(page, copy.ui.saved)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: `${event.name} edited` })).toBeVisible();
  });

  test("an admin checks a test user in, removes them, then assigns and removes an organizer @real", async ({ page, copy, events, testUsers }) => {
    const event = await events.create();
    const [person] = await testUsers(1);
    if (!person) throw new Error("test user not created");
    await page.goto(`/admin/events/${event.slug}`);
    await expect(page.getByText(copy.attendees.empty)).toBeVisible();

    const attendeePicker = page.getByRole("search").first();
    await attendeePicker.getByRole("searchbox").fill(person.handle);
    await attendeePicker.getByRole("button", { name: copy.people.search }).click();
    await page.getByRole("listitem").filter({ hasText: `@${person.handle}` }).getByRole("button", { name: copy.attendees.add, exact: true }).click();
    await expect(statusText(page, copy.ui.done.checkedIn)).toBeVisible();
    const removeAttendee = page.getByRole("button", { name: `${copy.attendees.remove}: ${person.name}` });
    await expect(removeAttendee).toBeVisible();
    await expect(page.getByText(copy.attendees.byAdmin, { exact: false }).first()).toBeVisible();

    await removeAttendee.click();
    await page.getByRole("dialog", { name: copy.ui.dialogs.removeAttendee.title(person.name) }).getByRole("button", { name: copy.ui.dialogs.removeAttendee.confirm }).click();
    await expect(statusText(page, copy.ui.dialogs.removeAttendee.done)).toBeVisible();
    await expect(removeAttendee).toBeHidden();
    await expect(page.getByText(copy.attendees.empty)).toBeVisible();

    const organizerPicker = page.getByRole("search").nth(1);
    await organizerPicker.getByRole("searchbox").fill(person.handle);
    await organizerPicker.getByRole("button", { name: copy.people.search }).click();
    await page.getByRole("listitem").filter({ hasText: `@${person.handle}` }).getByRole("button", { name: copy.organizers.add, exact: true }).click();
    await expect(statusText(page, copy.ui.done.organizerAdded)).toBeVisible();
    const removeOrganizer = page.getByRole("button", { name: `${copy.organizers.remove}: ${person.name}` });
    await expect(removeOrganizer).toBeVisible();
    await removeOrganizer.click();
    await expect(statusText(page, copy.ui.done.organizerRemoved)).toBeVisible();
    await expect(removeOrganizer).toBeHidden();
  });

  test("a search with no match says so @real", async ({ page, copy, events }) => {
    const event = await events.create();
    await page.goto(`/admin/events/${event.slug}`);
    const picker = page.getByRole("search").first();
    await picker.getByRole("searchbox").fill(`nobody-${uniqueSlug()}`);
    await picker.getByRole("button", { name: copy.people.search }).click();
    await expect(statusText(page, copy.people.empty)).toBeVisible();
  });

  test("an unknown slug shows the not-found page @real", async ({ page }) => {
    await page.goto(`/admin/events/${UNKNOWN_SLUG}`);
    // app/admin/loading.tsx streams the shell first, so this page-level notFound() arrives as a 200 with noindex.
    await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });
});
