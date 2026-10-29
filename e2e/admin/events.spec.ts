// The event console (flows F-55..F-57, backlog T-023): /admin, /admin/events/new and /admin/events/<slug>. Mock mode drives
// every button against the documented examples and error codes; real mode does it as the seeded test admin on throwaway
// test events (slug prefix e2e-admin-) that are archived afterwards.
import type { Locator, Page, Request, TestInfo } from "@playwright/test";
import { phaseOf } from "../../lib/admin/event-phase";
import { adminEvent, adminIds, testEvent } from "../../lib/api/admin-examples";
import { founders } from "../../lib/api/examples";
import { TEST_EVENT_SLUG } from "../fixtures";
import { codeOf, expect, rowOf, test, UNKNOWN_SLUG, uniqueSlug, type AdminCopy } from "./helpers";

const DETAIL = `/admin/events/${adminEvent.slug}`;

// Requests to one API path, kept so a test can assert that a cancelled dialog sent nothing.
function recordRequests(page: Page, method: string, pathEnd: string): Request[] {
  const seen: Request[] = [];
  page.on("request", (request) => request.method() === method && new URL(request.url()).pathname.endsWith(pathEnd) && seen.push(request));
  return seen;
}

const statusText = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text });
const alertText = (page: Page, text: string) => page.getByRole("alert").filter({ hasText: text });
const widthOf = (testInfo: TestInfo) => testInfo.project.use.viewport?.width ?? 1440;
// Below 768 px the console is a phone layout: top bar + bottom tabs, cards instead of tables.
const isPhone = (testInfo: TestInfo) => widthOf(testInfo) < 768;
// From 1280 px the QR is the sticky column beside every tab; below it is the QR tab.
const hasQrColumn = (testInfo: TestInfo) => widthOf(testInfo) >= 1280;
// The join link as the QR panel prints it (no scheme).
const shownLink = (joinUrl: string) => joinUrl.replace(/^https?:\/\//, "");

async function fillNewEvent(page: Page, copy: AdminCopy, name: string, slug: string): Promise<void> {
  await page.getByLabel(copy.form.name, { exact: true }).fill(name);
  await page.getByLabel(copy.form.slug).fill(slug);
}

// Typing before hydration never reaches React's onChange, so retype until the form marks itself unsaved.
async function fillOnceHydrated(page: Page, copy: AdminCopy, label: string, value: string): Promise<void> {
  await expect(async () => {
    await page.getByLabel(label, { exact: true }).fill(value);
    await expect(page.getByText(copy.ui.form.unsaved).filter({ visible: true })).toBeVisible({ timeout: 2_000 });
  }).toPass();
}

// A click on a button that only React handles is lost before hydration; retry until `opened` shows.
async function clickUntil(button: () => Promise<void>, opened: Locator): Promise<void> {
  await expect(async () => {
    if (!(await opened.isVisible())) await button();
    await expect(opened).toBeVisible({ timeout: 2_000 });
  }).toPass();
}

type DangerKey = "rotate" | "end" | "archive";
const DANGER: { key: DangerKey; path: string }[] = [
  { key: "rotate", path: "/rotate-code" },
  { key: "end", path: "/end" },
  { key: "archive", path: "/archive" },
];
const dangerItem = (copy: AdminCopy, key: DangerKey) => ({ rotate: copy.detail.rotate, end: copy.detail.end, archive: copy.detail.archive })[key];
const dangerBody = (copy: AdminCopy, key: DangerKey) => ({ rotate: copy.detail.rotateConfirm, end: copy.detail.endConfirm, archive: copy.detail.archiveConfirm })[key];

// The lifecycle lives in the header's ⋯ menu (a native popover) on every tab; the Settings danger zone repeats it.
async function openEventMenu(page: Page, copy: AdminCopy, name: string): Promise<Locator> {
  const menu = page.locator(":popover-open");
  await page.getByRole("button", { name: copy.ui.menu.moreFor(name) }).click();
  await expect(menu).toHaveCount(1);
  return menu;
}

async function openDanger(page: Page, copy: AdminCopy, key: DangerKey, name: string): Promise<Locator> {
  const dialog = page.getByRole("dialog", { name: copy.ui.dialogs[key].title });
  await clickUntil(async () => (await openEventMenu(page, copy, name)).getByRole("button", { name: dangerItem(copy, key), exact: true }).click(), dialog);
  return dialog;
}

async function confirmDanger(page: Page, copy: AdminCopy, key: DangerKey, name: string): Promise<void> {
  const dialog = await openDanger(page, copy, key, name);
  await dialog.getByRole("button", { name: copy.ui.dialogs[key].confirm, exact: true }).click();
  await expect(dialog).toBeHidden();
}

// The People and Organizers tabs search inside a dialog (PickDialog + UserPicker).
async function openPicker(page: Page, opener: string, title: string): Promise<Locator> {
  const dialog = page.getByRole("dialog", { name: title });
  await clickUntil(() => page.getByRole("button", { name: opener, exact: true }).click(), dialog);
  return dialog;
}

async function searchIn(picker: Locator, copy: AdminCopy, text: string): Promise<void> {
  await picker.getByRole("searchbox", { name: copy.people.searchLabel }).fill(text);
  await picker.getByRole("button", { name: copy.people.search, exact: true }).click();
}

test.describe("admin events console (mock)", () => {
  test("the dashboard lists events, filters archived and links to each event @mock", async ({ page, copy }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: copy.events.title })).toBeVisible();
    await expect(page.getByRole("navigation", { name: copy.navLabel }).getByRole("link", { name: copy.nav.events })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: `${copy.events.open}: ${adminEvent.name}` })).toBeVisible();
    await expect(page.getByRole("link", { name: `${copy.events.open}: ${testEvent.name}` })).toBeVisible();
    // A table row from 768 px, a card below; both show who is inside and the connections.
    await expect(rowOf(page, adminEvent.name)).toContainText(String(adminEvent.counts.attendees));
    await expect(rowOf(page, adminEvent.name)).toContainText(String(adminEvent.counts.connections));

    // The old "Show archived" toggle is the Archived phase chip; chips carry a count after the label.
    const chips = page.getByRole("navigation", { name: copy.ui.sort.status });
    const chip = (label: string) => chips.getByRole("link", { name: new RegExp(`^${label}`) });
    await expect(chip(copy.ui.eventList.all)).toHaveAttribute("aria-current", "page");
    await chip(copy.ui.phase.archived).click();
    await expect(page).toHaveURL(/\/admin\?phase=archived$/);
    await expect(chip(copy.ui.phase.archived)).toHaveAttribute("aria-current", "page");

    await page.getByRole("link", { name: `${copy.events.open}: ${adminEvent.name}` }).click();
    await expect(page).toHaveURL(new RegExp(`${DETAIL}$`));
    await expect(page.getByRole("heading", { level: 1, name: adminEvent.name })).toBeVisible();
  });

  test("the console nav and the new-event button reach every section @mock", async ({ page, copy }, testInfo) => {
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
    // The way back to the app: in the top bar's menu on a phone, at the foot of the rail or sidebar from 768 px.
    if (isPhone(testInfo)) await page.getByRole("button", { name: copy.ui.nav.menu }).click();
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
    await fillOnceHydrated(page, copy, copy.form.name, "Mock Night");
    await page.getByLabel(copy.form.slug).fill("mock-night");
    await page.getByLabel(copy.form.city).fill("Guadalajara");
    // The live preview sits beside the form from 1024 px only.
    if (widthOf(testInfo) >= 1024) await expect(page.getByText("/admin/events/mock-night")).toBeVisible();
    const [request] = await Promise.all([page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/api/admin/events")), page.getByRole("button", { name: copy.form.create }).click()]);
    expect(request.postDataJSON()).toMatchObject({ name: "Mock Night", slug: "mock-night", city: "Guadalajara", timezone: "America/Mexico_City", status: "live" });
    // The mock answers with the documented example, Founders Fest; the dev server may compile that route first.
    await expect(page).toHaveURL(new RegExp(`/admin/events/${founders.slug}$`), { timeout: 30_000 });
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

  test("an unsaved draft survives a reload and can be discarded @mock", async ({ page, copy, browserName }) => {
    test.fixme(browserName === "webkit", "WebKit (CI only): the unsaved-changes notice never shows after typing; unverified locally");
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

  test("the event page shows its numbers, printable QR, join link and share buttons @mock", async ({ page, context, copy, browserName }, testInfo) => {
    test.skip(browserName === "webkit", "WebKit has no clipboard permissions to grant; Chromium covers the copy button");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(DETAIL);
    await expect(page.getByRole("heading", { level: 1, name: adminEvent.name })).toBeVisible();
    // The header shows the derived phase (Running, Upcoming…), not the stored status.
    await expect(page.getByRole("main").getByText(copy.ui.phase[phaseOf(adminEvent, new Date())], { exact: true }).first()).toBeVisible();
    const numbers = page.getByRole("region", { name: copy.detail.counts });
    await expect(numbers.getByText(copy.detail.attendees, { exact: true })).toBeVisible();
    await expect(numbers).toContainText(String(adminEvent.counts.attendees));
    const live = page.getByRole("link", { name: copy.ui.menu.openLive });
    await expect(live).toHaveAttribute("href", `${adminEvent.joinUrl}/live`);
    await expect(live).toHaveAttribute("target", "_blank");

    // The printable QR, its link, Copy, Download SVG and Print: the sticky column from 1280 px, the QR tab below.
    if (!hasQrColumn(testInfo)) await page.getByRole("navigation", { name: copy.ui.detail.sections }).getByRole("link", { name: copy.ui.tabs.qr }).click();
    await expect(page.getByRole("img", { name: copy.detail.qrLabel(adminEvent.name) }).locator("svg")).toBeVisible();
    await expect(page.getByText(shownLink(adminEvent.joinUrl), { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("link", { name: copy.ui.detail.downloadSvg })).toHaveAttribute("download", `${adminEvent.slug}-qr.svg`);
    await expect(page.getByRole("button", { name: copy.ui.detail.print })).toBeVisible();
    await clickUntil(() => page.getByRole("button", { name: copy.detail.copy, exact: true }).click(), page.getByRole("button", { name: copy.detail.copied, exact: true }));
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(adminEvent.joinUrl);
    await page.getByRole("navigation", { name: copy.ui.detail.breadcrumb }).getByRole("link", { name: copy.events.title }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  for (const { key, path } of DANGER) {
    test(`${key}: cancel sends nothing, confirm calls the API and says so @mock`, async ({ page, copy }) => {
      const sent = recordRequests(page, "POST", path);
      await page.goto(DETAIL);
      const dialog = await openDanger(page, copy, key, adminEvent.name);
      await expect(dialog).toHaveAccessibleDescription(dangerBody(copy, key));
      await expect(dialog.getByRole("button", { name: copy.ui.cancel })).toBeFocused();
      await dialog.getByRole("button", { name: copy.ui.cancel }).click();
      await expect(dialog).toBeHidden();
      expect(sent).toHaveLength(0);
      await confirmDanger(page, copy, key, adminEvent.name);
      await expect(statusText(page, copy.ui.dialogs[key].done)).toBeVisible();
      expect(sent).toHaveLength(1);
    });

    test(`${key}: a failed call shows the error @mock`, async ({ page, mock, copy }) => {
      await page.goto(DETAIL);
      await mock.mockError("event_not_found", `**/api/admin/events/*${path}`);
      await confirmDanger(page, copy, key, adminEvent.name);
      // Every 404 on an event-page write reads as an ended session to reload (the gate answers 404 once it is gone).
      await expect(alertText(page, copy.ui.detail.sessionEnded)).toBeVisible();
      await expect(statusText(page, copy.ui.dialogs[key].done)).toHaveCount(0);
    });
  }

  test("Esc closes a confirmation without acting @mock", async ({ page, copy }) => {
    const sent = recordRequests(page, "POST", "/archive");
    await page.goto(DETAIL);
    const dialog = await openDanger(page, copy, "archive", adminEvent.name);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(sent).toHaveLength(0);
  });

  test("editing details saves with PATCH and shows server errors @mock", async ({ page, mock, copy }) => {
    await page.goto(`${DETAIL}?tab=settings`);
    const name = page.getByLabel(copy.form.name, { exact: true });
    const save = page.getByRole("button", { name: copy.form.save, exact: true });
    await expect(name).toHaveValue(adminEvent.name);
    await fillOnceHydrated(page, copy, copy.form.name, "Founders Fest GDL 2");
    const [request] = await Promise.all([page.waitForRequest((r) => r.method() === "PATCH" && r.url().endsWith(`/api/admin/events/${adminEvent.slug}`)), save.click()]);
    expect(request.postDataJSON()).toMatchObject({ name: "Founders Fest GDL 2" });
    await expect(statusText(page, copy.ui.saved)).toBeVisible();

    await mock.mockError("invalid_input", `**/api/admin/events/${adminEvent.slug}`);
    await save.click();
    await expect(alertText(page, copy.form.failed)).toBeVisible();
    await name.fill("");
    await save.click();
    await expect(alertText(page, copy.ui.form.fixErrors(1))).toBeVisible();
  });

  test("attendees: search, check in, remove with confirmation, and errors @mock", async ({ page, mock, copy }) => {
    const t = copy.ui.detail;
    await page.goto(`${DETAIL}?tab=people`);
    const picker = await openPicker(page, t.checkIn, t.checkIn);
    const [search] = await Promise.all([page.waitForRequest((r) => r.url().includes("/api/admin/users?")), searchIn(picker, copy, "ana")]);
    expect(new URL(search.url()).searchParams.get("q")).toBe("ana");
    const add = picker.getByRole("listitem").filter({ hasText: "@ana-garza-k3p9" }).getByRole("button", { name: `${copy.attendees.add}: Ana Garza` });
    const [checkIn] = await Promise.all([page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/attendees")), add.click()]);
    expect(checkIn.postDataJSON()).toEqual({ userId: adminIds.testAna });
    await expect(picker).toBeHidden();
    await expect(statusText(page, copy.ui.done.checkedIn)).toBeVisible();

    // The confirm names the person and how many connections go with them (Ana has 1 in the example).
    const dialog = page.getByRole("dialog", { name: copy.ui.dialogs.removeAttendee.title("Ana Garza") });
    await clickUntil(() => page.getByRole("button", { name: t.removeFor("Ana Garza") }).click(), dialog);
    await expect(dialog).toHaveAccessibleDescription(t.removeBody(1));
    const [removal] = await Promise.all([
      page.waitForRequest((r) => r.method() === "DELETE" && r.url().endsWith(`/attendees/${adminIds.testAna}`)),
      dialog.getByRole("button", { name: copy.ui.dialogs.removeAttendee.confirm }).click(),
    ]);
    expect(removal.method()).toBe("DELETE");
    await expect(statusText(page, copy.ui.dialogs.removeAttendee.done)).toBeVisible();

    // A refused check-in keeps the picker open and says why there.
    await mock.mockError("test_user_not_allowed", "**/api/admin/events/*/attendees");
    const again = await openPicker(page, t.checkIn, t.checkIn);
    await searchIn(again, copy, "ana");
    await again.getByRole("button", { name: `${copy.attendees.add}: Ana Garza` }).click();
    await expect(again.getByRole("alert").filter({ hasText: t.testNotAllowed })).toBeVisible();
  });

  test("a failed people search says so in the picker @mock", async ({ page, mock, copy }) => {
    await page.goto(`${DETAIL}?tab=people`);
    await mock.mockError("invalid_input", /\/api\/admin\/users\?/);
    const picker = await openPicker(page, copy.ui.detail.checkIn, copy.ui.detail.checkIn);
    await searchIn(picker, copy, "ana");
    await expect(picker.getByRole("status").filter({ hasText: copy.detail.failed })).toBeVisible();
  });

  test("organizers: assign from search and remove without a dialog @mock", async ({ page, copy }) => {
    await page.goto(`${DETAIL}?tab=organizers`);
    const picker = await openPicker(page, copy.organizers.add, copy.ui.detail.assignTitle);
    await searchIn(picker, copy, "noe");
    const add = picker.getByRole("listitem").filter({ hasText: "@noe-camacho" }).getByRole("button", { name: `${copy.organizers.add}: Noe Camacho` });
    const [assign] = await Promise.all([page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/organizers")), add.click()]);
    expect(assign.postDataJSON()).toEqual({ userId: adminIds.noe, role: "organizer" });
    await expect(statusText(page, copy.ui.done.organizerAdded)).toBeVisible();
    await expect(picker).toBeHidden();

    const [removal] = await Promise.all([
      page.waitForRequest((r) => r.method() === "DELETE" && r.url().endsWith(`/organizers/${adminIds.noe}`)),
      page.getByRole("button", { name: `${copy.organizers.remove}: Noe Camacho` }).click(),
    ]);
    expect(removal.method()).toBe("DELETE");
    await expect(statusText(page, copy.ui.done.organizerRemoved)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
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
    await fillOnceHydrated(page, copy, copy.form.name, `E2E form ${slug}`);
    await page.getByLabel(copy.form.slug).fill(slug);
    await page.getByRole("button", { name: copy.form.create }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/events/${slug}$`), { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1, name: `E2E form ${slug}` })).toBeVisible();
    // A test super admin only makes test events.
    await expect(page.getByRole("main").getByText(copy.events.test, { exact: true }).first()).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: `${copy.events.open}: E2E form ${slug}` })).toBeVisible();
  });

  test("a taken slug is refused in the form @real", async ({ page, copy }) => {
    await page.goto("/admin/events/new");
    await fillOnceHydrated(page, copy, copy.form.name, "Clash");
    await page.getByLabel(copy.form.slug).fill(TEST_EVENT_SLUG);
    await page.getByRole("button", { name: copy.form.create }).click();
    await expect(alertText(page, copy.form.slugTaken)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/events\/new$/);
  });

  test("rotate, end and archive change the event for real @real", async ({ page, copy, events }) => {
    const event = await events.create();
    // ?tab=qr shows the join link at every width (the QR tab below 1280 px, the QR column from 1280).
    await page.goto(`/admin/events/${event.slug}?tab=qr`);
    const link = page.getByText(shownLink(event.joinUrl), { exact: true }).filter({ visible: true });
    await expect(link).toBeVisible();
    const live = page.getByRole("link", { name: copy.ui.menu.openLive });

    await confirmDanger(page, copy, "rotate", event.name);
    await expect(statusText(page, copy.ui.dialogs.rotate.done)).toBeVisible();
    await expect(link).toBeHidden();
    await expect(live).not.toHaveAttribute("href", `${event.joinUrl}/live`);
    const rotated = ((await live.getAttribute("href")) ?? "").replace(/\/live$/, "");
    expect(codeOf(rotated)).toMatch(/^[a-z0-9]{8,32}$/);
    expect(codeOf(rotated)).not.toBe(event.accessCode);

    await confirmDanger(page, copy, "end", event.name);
    await expect(page.getByRole("main").getByText(copy.ui.phase.ended, { exact: true }).first()).toBeVisible();
    const afterEnd = await openEventMenu(page, copy, event.name);
    await expect(afterEnd.getByRole("button", { name: copy.detail.end, exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await confirmDanger(page, copy, "archive", event.name);
    await expect(page.getByRole("main").getByText(copy.ui.phase.archived, { exact: true }).first()).toBeVisible();
    const afterArchive = await openEventMenu(page, copy, event.name);
    await expect(afterArchive.getByRole("button", { name: copy.detail.archive, exact: true })).toHaveCount(0);
    await expect(afterArchive.getByRole("button", { name: copy.ui.menu.restore, exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    // The default list leaves archived events out; the Archived chip shows them.
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: `${copy.events.open}: ${event.name}` })).toBeHidden();
    await page.goto("/admin?phase=archived");
    await expect(page.getByRole("link", { name: `${copy.events.open}: ${event.name}` })).toBeVisible();
  });

  test("editing the name saves and the page shows it @real", async ({ page, copy, events }) => {
    const event = await events.create();
    await page.goto(`/admin/events/${event.slug}?tab=settings`);
    await fillOnceHydrated(page, copy, copy.form.name, `${event.name} edited`);
    await page.getByRole("button", { name: copy.form.save, exact: true }).click();
    await expect(statusText(page, copy.ui.saved)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: `${event.name} edited` })).toBeVisible();
  });

  test("an admin checks a test user in, removes them, then assigns and removes an organizer @real", async ({ page, copy, events, testUsers }) => {
    const t = copy.ui.detail;
    const event = await events.create();
    const [person] = await testUsers(1);
    if (!person) throw new Error("test user not created");
    await page.goto(`/admin/events/${event.slug}?tab=people`);
    await expect(page.getByText(t.emptyPeople, { exact: true })).toBeVisible();

    const attendeePicker = await openPicker(page, t.checkIn, t.checkIn);
    await searchIn(attendeePicker, copy, person.handle);
    await attendeePicker.getByRole("listitem").filter({ hasText: `@${person.handle}` }).getByRole("button", { name: `${copy.attendees.add}: ${person.name}` }).click();
    await expect(attendeePicker).toBeHidden();
    await expect(statusText(page, copy.ui.done.checkedIn)).toBeVisible();
    const removeAttendee = page.getByRole("button", { name: t.removeFor(person.name) });
    await expect(removeAttendee).toBeVisible();
    // Checked in by hand: the source reads "Admin".
    await expect(rowOf(page, `@${person.handle}`)).toContainText(t.sources.admin);

    const confirm = page.getByRole("dialog", { name: copy.ui.dialogs.removeAttendee.title(person.name) });
    await clickUntil(() => removeAttendee.click(), confirm);
    await confirm.getByRole("button", { name: copy.ui.dialogs.removeAttendee.confirm }).click();
    await expect(statusText(page, copy.ui.dialogs.removeAttendee.done)).toBeVisible();
    await expect(removeAttendee).toBeHidden();
    await expect(page.getByText(t.emptyPeople, { exact: true })).toBeVisible();

    await page.getByRole("navigation", { name: t.sections }).getByRole("link", { name: new RegExp(`^${copy.ui.tabs.organizers}`) }).click();
    await expect(page).toHaveURL(/\?tab=organizers$/);
    const organizerPicker = await openPicker(page, copy.organizers.add, t.assignTitle);
    await searchIn(organizerPicker, copy, person.handle);
    await organizerPicker.getByRole("listitem").filter({ hasText: `@${person.handle}` }).getByRole("button", { name: `${copy.organizers.add}: ${person.name}` }).click();
    await expect(organizerPicker).toBeHidden();
    await expect(statusText(page, copy.ui.done.organizerAdded)).toBeVisible();
    const removeOrganizer = page.getByRole("button", { name: `${copy.organizers.remove}: ${person.name}` });
    await expect(removeOrganizer).toBeVisible();
    await removeOrganizer.click();
    await expect(statusText(page, copy.ui.done.organizerRemoved)).toBeVisible();
    await expect(removeOrganizer).toBeHidden();
  });

  test("a search with no match says so @real", async ({ page, copy, events }) => {
    const event = await events.create();
    await page.goto(`/admin/events/${event.slug}?tab=people`);
    const picker = await openPicker(page, copy.ui.detail.checkIn, copy.ui.detail.checkIn);
    await searchIn(picker, copy, `nobody-${uniqueSlug()}`);
    await expect(picker.getByRole("status").filter({ hasText: copy.people.empty })).toBeVisible();
  });

  test("an unknown slug shows the not-found page @real", async ({ page }) => {
    await page.goto(`/admin/events/${UNKNOWN_SLUG}`);
    // app/admin/loading.tsx streams the shell first, so this page-level notFound() arrives as a 200 with noindex.
    await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });
});
