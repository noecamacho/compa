// POST /api/e/{code}/check-in against the real database (F-12, F-71): consent, repeat safety, auth, unknown codes,
// what the big screen and the door counters show afterwards, and which event becomes current when two overlap.
import { CheckIn, EventDoor, LiveSnapshot, Me } from "../../lib/api/schemas";
import { copyOf, expect, test } from "./helpers";

const checkInPath = (code: string) => `/api/e/${code}/check-in`;

test.describe("check-in API @real", () => {
  test("first check-in is 201, a repeat is 200 with the same time, and the person shows on the screen", async ({ page, context, signIn, freshUsers, throwawayEvent }) => {
    const event = await throwawayEvent();
    const [person] = await freshUsers({ count: 1 });
    if (!person) throw new Error("test user not created");
    await signIn(context, person);

    const first = await page.request.post(checkInPath(event.code), { data: { screenConsent: true } });
    expect(first.status()).toBe(201);
    const created = CheckIn.parse(await first.json());
    expect(created).toMatchObject({ event: { code: event.code, name: event.name }, alreadyCheckedIn: false });

    const again = await page.request.post(checkInPath(event.code.toUpperCase()), { data: { screenConsent: true } });
    expect(again.status()).toBe(200);
    expect(CheckIn.parse(await again.json())).toEqual({ ...created, alreadyCheckedIn: true });

    const live = LiveSnapshot.parse(await (await page.request.get(`/api/e/${event.code}/live`)).json());
    expect(live.people.map((entry) => entry.id)).toEqual([person.id]);
    expect(EventDoor.parse(await (await page.request.get(`/api/e/${event.code}`)).json()).counters.checkedIn).toBe(1);
    expect(Me.parse(await (await page.request.get("/api/me")).json()).currentEvent).toEqual({ code: event.code, name: event.name });
  });

  test("without consent the body is refused and nobody is checked in", async ({ page, context, signIn, freshUsers, throwawayEvent }) => {
    const event = await throwawayEvent();
    const [person] = await freshUsers({ count: 1 });
    if (!person) throw new Error("test user not created");
    await signIn(context, person);
    // CheckInBody takes only `screenConsent: true`, so a refusal is invalid_input before consent_required is reachable.
    for (const data of [{ screenConsent: false }, {}]) {
      const response = await page.request.post(checkInPath(event.code), { data });
      expect(response.status()).toBe(400);
      expect((await response.json()).error.code).toBe("invalid_input");
    }
    const live = LiveSnapshot.parse(await (await page.request.get(`/api/e/${event.code}/live`)).json());
    expect(live.people).toEqual([]);
  });

  test("a visitor gets 401 and an unknown code 404", async ({ page, context, signIn, freshUsers, throwawayEvent }) => {
    const event = await throwawayEvent();
    const anonymous = await page.request.post(checkInPath(event.code), { data: { screenConsent: true } });
    expect(anonymous.status()).toBe(401);
    expect((await anonymous.json()).error.code).toBe("unauthorized");

    const [person] = await freshUsers({ count: 1 });
    if (!person) throw new Error("test user not created");
    await signIn(context, person);
    for (const code of ["zzzzzzzzzz", "bad!code"]) {
      const response = await page.request.post(checkInPath(encodeURIComponent(code)), { data: { screenConsent: true } });
      expect(response.status()).toBe(404);
      expect((await response.json()).error.code).toBe("event_not_found");
    }
  });

  test("declining at /join leaves the person out of the event", async ({ page, context, signIn, freshUsers, throwawayEvent }, testInfo) => {
    const copy = copyOf(testInfo);
    const event = await throwawayEvent();
    const [person] = await freshUsers({ count: 1 });
    if (!person) throw new Error("test user not created");
    await signIn(context, person);
    await page.goto(`/e/${event.code}/join`);
    await page.getByRole("link", { name: copy.join.cancel }).click();
    await expect(page).toHaveURL(new RegExp(`/e/${event.code}$`));
    await expect(page.getByRole("link", { name: copy.door.ctaSignedIn })).toBeVisible();
    const live = LiveSnapshot.parse(await (await page.request.get(`/api/e/${event.code}/live`)).json());
    expect(live.people).toEqual([]);
    expect(Me.parse(await (await page.request.get("/api/me")).json()).currentEvent).toBeNull();
  });

  test("overlapping events: the newest check-in becomes the current event", async ({ page, context, signIn, testUsers, testEvent, throwawayEvent }, testInfo) => {
    const copy = copyOf(testInfo);
    const event = await throwawayEvent();
    // testUsers are already checked in to the shared test event.
    const [person] = await testUsers(1);
    if (!person) throw new Error("test user not created");
    await signIn(context, person);
    const me = async () => Me.parse(await (await page.request.get("/api/me")).json()).currentEvent;
    expect(await me()).toEqual({ code: testEvent.accessCode, name: testEvent.name });

    expect((await page.request.post(checkInPath(event.code), { data: { screenConsent: true } })).status()).toBe(201);
    expect(await me()).toEqual({ code: event.code, name: event.name });
    await page.goto(`/e/${event.code}`);
    await expect(page).toHaveURL(/\/home$/);
    // The earlier event's door opens again instead of skipping to home; the person stays on its screen.
    await page.goto(`/e/${testEvent.accessCode}`);
    await expect(page.getByRole("link", { name: copy.door.ctaSignedIn })).toBeVisible();
    const live = LiveSnapshot.parse(await (await page.request.get(`/api/e/${testEvent.accessCode}/live`)).json());
    expect(live.people.map((entry) => entry.id)).toContain(person.id);
  });
});
