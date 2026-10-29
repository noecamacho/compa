// The event window at the door (F-14, F-70): before the start and after the end there is no way in, the door says
// when it opens in event-local time whatever the viewer's time zone, and check-in answers event_not_running.
import { EventDoor } from "../../lib/api/schemas";
import { formatTime } from "../../lib/copy";
import { copyOf, endedWindow, expect, localeOf, test, upcomingWindow } from "./helpers";

const DOOR_ZONES = ["America/Mexico_City", "Europe/Madrid"];

test.describe("event window @real", () => {
  test("before the start: the opening time, no way in, and check-in refused", async ({ browser, baseURL, locale, extraHTTPHeaders, page, context, signIn, freshUsers, throwawayEvent }, testInfo) => {
    const copy = copyOf(testInfo);
    const window = upcomingWindow();
    const event = await throwawayEvent(window);
    const door = EventDoor.parse(await (await page.request.get(`/api/e/${event.code}`)).json());
    expect(door).toMatchObject({ isRunning: false, phase: "upcoming", startsAt: window.startsAt });
    const opening = copy.door.notStarted(formatTime(localeOf(testInfo), window.startsAt));

    // The door is rendered on the server, so a viewer in another time zone reads the same event-local hour.
    for (const timezoneId of DOOR_ZONES) {
      const viewer = await browser.newContext({ baseURL, locale, extraHTTPHeaders, timezoneId });
      const viewerPage = await viewer.newPage();
      await viewerPage.goto(`/e/${event.code}`);
      await expect(viewerPage.getByRole("status")).toHaveText(opening);
      await viewer.close();
    }

    await page.goto(`/e/${event.code}`);
    await expect(page.getByRole("heading", { level: 1, name: event.name })).toBeVisible();
    await expect(page.getByText(copy.door.live, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: copy.door.cta })).toHaveCount(0);
    await expect(page.getByLabel(copy.door.emailLabel)).toHaveCount(0);
    await expect(page.getByRole("link", { name: copy.door.watchLive })).toBeVisible();

    const [person] = await freshUsers({ count: 1 });
    if (!person) throw new Error("test user not created");
    await signIn(context, person);
    await page.goto(`/e/${event.code}/join`);
    await expect(page).toHaveURL(new RegExp(`/e/${event.code}$`));
    await expect(page.getByRole("link", { name: copy.door.ctaSignedIn })).toHaveCount(0);
    const refused = await page.request.post(`/api/e/${event.code}/check-in`, { data: { screenConsent: true } });
    expect(refused.status()).toBe(409);
    expect((await refused.json()).error.code).toBe("event_not_running");
  });

  test("after the end: the ended notice, no way in, and check-in refused", async ({ page, context, signIn, freshUsers, throwawayEvent }, testInfo) => {
    const copy = copyOf(testInfo);
    const event = await throwawayEvent(endedWindow());
    const door = EventDoor.parse(await (await page.request.get(`/api/e/${event.code}`)).json());
    expect(door).toMatchObject({ isRunning: false, phase: "ended" });
    await page.goto(`/e/${event.code}`);
    await expect(page.getByRole("status")).toHaveText(copy.door.ended);
    await expect(page.getByRole("link", { name: copy.door.cta })).toHaveCount(0);

    const [person] = await freshUsers({ count: 1 });
    if (!person) throw new Error("test user not created");
    await signIn(context, person);
    await page.goto(`/e/${event.code}/join`);
    await expect(page).toHaveURL(new RegExp(`/e/${event.code}$`));
    await expect(page.getByRole("status")).toHaveText(copy.door.ended);
    const refused = await page.request.post(`/api/e/${event.code}/check-in`, { data: { screenConsent: true } });
    expect(refused.status()).toBe(409);
    expect((await refused.json()).error.code).toBe("event_not_running");
  });

  test("the opening time follows the event's own time zone", async ({ page, throwawayEvent }, testInfo) => {
    const window = { ...upcomingWindow(), timezone: "Europe/Madrid" };
    const event = await throwawayEvent(window);
    await page.goto(`/e/${event.code}`);
    const opening = copyOf(testInfo).door.notStarted(formatTime(localeOf(testInfo), window.startsAt, window.timezone));
    await expect(page.getByRole("status")).toHaveText(opening);
  });
});
