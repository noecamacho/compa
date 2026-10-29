// F-09: the referral link /i/<code>, where the code is the inviter's handle. While the inviter is at an event the link
// lands the friend at that event's door (/e/<event code>?invite=<code>) and the join step claims it; outside an event it
// goes through sign-in to onboarding, which claims it. The claim happens once and the inviter sees the friend; unknown
// and own codes stay silent. Signing in first keeps the code on the way.
import type { APIRequestContext } from "@playwright/test";
import { ClaimedInvite, Invites, type CardT } from "../../lib/api/schemas";
import { accessCode, invites as mockInvites } from "../../lib/api/examples";
import { redirectOf, signInPath } from "./helpers";
import { expect, expectApiError, test } from "../profiles/helpers";
import type { SignedInUser } from "../fixtures/two-users";

async function invitesOf(request: APIRequestContext) {
  const response = await request.get("/api/invites/me");
  expect(response.status()).toBe(200);
  return Invites.parse(await response.json());
}

const codeOf = async (request: APIRequestContext): Promise<string> => (await invitesOf(request)).link.code;

const inviteeHandles = async (request: APIRequestContext): Promise<string[]> =>
  (await invitesOf(request)).invitees.map(({ person }: { person: CardT }) => person.handle);

const joinWithInvite = (friend: SignedInUser, eventCode: string, code: string) => friend.page.goto(`/e/${eventCode}/join?invite=${code}`);

test.describe("invite link", () => {
  test("it lands at the door of the inviter's event and keeps the invite @real", async ({ people, request, baseURL, testEvent }) => {
    const [inviter] = await people([{}]);
    if (!inviter) throw new Error("test user not created");
    const code = await codeOf(inviter.page.request);
    const redirect = await redirectOf(request, `/i/${code}`, baseURL);
    expect(redirect.status).toBe(307);
    expect(redirect.path).toBe(`/e/${testEvent.accessCode}?invite=${code}`);
  });

  test("outside an event it goes through sign-in to onboarding, which claims it once @real", async ({ people, request, baseURL }) => {
    const [inviter] = await people([{}], { checkIn: false });
    const [friend] = await people([{}], { checkIn: false });
    if (!inviter || !friend) throw new Error("test users not created");
    const code = await codeOf(inviter.page.request);
    expect(code).toBe(inviter.user.handle);
    const onboarding = `/onboarding/profile?invite=${code}`;
    expect((await redirectOf(request, `/i/${code}`, baseURL)).path).toBe(signInPath(onboarding));

    await friend.page.goto(onboarding);
    await expect.poll(() => inviteeHandles(inviter.page.request), { timeout: 5_000 }).toEqual([friend.user.handle]);
    await friend.page.reload();
    expect(await inviteeHandles(inviter.page.request)).toEqual([friend.user.handle]);
    expect((await invitesOf(inviter.page.request)).invitees[0]?.points).toBe(0);
  });

  test("the join step keeps the invite through sign-in @real", async ({ request, baseURL, testEvent, people }) => {
    const [inviter] = await people([{}]);
    if (!inviter) throw new Error("test user not created");
    const code = await codeOf(inviter.page.request);
    const join = `/e/${testEvent.accessCode}/join?invite=${code}`;
    expect((await redirectOf(request, join, baseURL)).path).toBe(signInPath(join));
  });

  test("an unknown invite code is a not-found page @real", async ({ request }) => {
    const response = await request.get("/i/zz-no-such-invite", { maxRedirects: 0 });
    expect(response.status()).toBe(404);
  });

  test("the claim needs a session @real", async ({ request }) => {
    const response = await request.post("/api/invites/ana-lopez/claim", { data: {} });
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorized");
  });

  test("a malformed code is rejected @real", async ({ people }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    await expectApiError(await ana.page.request.post("/api/invites/NOT_A_CODE!/claim", { data: {} }), 400, "invalid_input");
  });

  test("the join step claims the invite once and the inviter sees the friend @real", async ({ people, testEvent }) => {
    const [inviter] = await people([{}]);
    const [friend] = await people([{}], { checkIn: false });
    if (!inviter || !friend) throw new Error("test users not created");
    const code = await codeOf(inviter.page.request);
    expect(await inviteeHandles(inviter.page.request)).not.toContain(friend.user.handle);

    await joinWithInvite(friend, testEvent.accessCode, code);
    await expect.poll(() => inviteeHandles(inviter.page.request), { timeout: 5_000 }).toContain(friend.user.handle);

    await friend.page.reload();
    const handles = await inviteeHandles(inviter.page.request);
    expect(handles.filter((handle) => handle === friend.user.handle)).toHaveLength(1);

    const again = await friend.page.request.post(`/api/invites/${code}/claim`, { data: {} });
    expect(again.status()).toBe(200);
    const claimed = ClaimedInvite.parse(await again.json());
    expect(claimed.inviter.handle).toBe(inviter.user.handle);
    expect(claimed.event).toEqual({ code: testEvent.accessCode, name: testEvent.name });
  });

  test("my own code and an unknown code are silent @real", async ({ people, testEvent }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    const code = await codeOf(ana.page.request);
    const alerts = ana.page.getByRole("alert").filter({ hasText: /\S/ });
    await joinWithInvite(ana, testEvent.accessCode, code);
    await expect(alerts).toHaveCount(0);
    await expectApiError(await ana.page.request.post(`/api/invites/${code}/claim`, { data: {} }), 404, "not_found");
    expect(await inviteeHandles(ana.page.request)).not.toContain(ana.user.handle);

    await joinWithInvite(ana, testEvent.accessCode, "zz-no-such-invite");
    await expect(alerts).toHaveCount(0);
    await expectApiError(await ana.page.request.post("/api/invites/zz-no-such-invite/claim", { data: {} }), 404, "not_found");
  });
});

test.describe("invite link (mock)", () => {
  test("goes to the event door without LinkedIn, keeping the invite @mock", async ({ page }) => {
    await page.goto(`/i/${mockInvites.link.code}`);
    await expect(page).toHaveURL(`/e/${accessCode}?invite=${mockInvites.link.code}`);
  });

  test("the claim answers the inviter and the event, or 404 @mock", async ({ page }) => {
    const claimed = await page.request.post(`/api/invites/${mockInvites.link.code}/claim`, { data: {} });
    expect(claimed.status()).toBe(200);
    expect(ClaimedInvite.parse(await claimed.json()).event?.code).toBe(accessCode);
    const missing = await page.request.post("/api/invites/zz-none/claim", { data: {}, headers: { "x-compa-mock-error": "not_found" } });
    expect(missing.status()).toBe(404);
  });

  test("someone who has already been at an event is refused @mock", async ({ page }) => {
    const refused = await page.request.post(`/api/invites/${mockInvites.link.code}/claim`, { data: {}, headers: { "x-compa-mock-error": "referral_not_new" } });
    await expectApiError(refused, 409, "referral_not_new");
  });
});
