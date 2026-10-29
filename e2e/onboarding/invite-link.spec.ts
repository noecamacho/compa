// F-09: the invite link /i/<code>. Signed out it signs in and keeps the invite; 02 Perfil (?invite=<code>) claims it
// once (POST /api/invites/{code}/claim) and the inviter sees the friend; unknown and own codes stay silent.
import type { APIRequestContext, Page } from "@playwright/test";
import { ClaimedInvite, Invites, type CardT } from "../../lib/api/schemas";
import { invites as mockInvites } from "../../lib/api/examples";
import { profile } from "../../lib/copy/es";
import { expect, redirectOf, signInPath, test } from "./helpers";

async function invitesOf(request: APIRequestContext) {
  const response = await request.get("/api/invites/me");
  expect(response.status()).toBe(200);
  return Invites.parse(await response.json());
}

const inviteeHandles = async (request: APIRequestContext): Promise<string[]> =>
  (await invitesOf(request)).invitees.map(({ person }: { person: CardT }) => person.handle);

const openProfileWithInvite = async (page: Page, code: string) => {
  await page.goto(`/onboarding/profile?invite=${code}`);
  await expect(page.getByRole("heading", { level: 1, name: profile.title })).toBeVisible();
};

test.describe("invite link", () => {
  test("signed out, it signs in and keeps the invite @real", async ({ request, baseURL }) => {
    const redirect = await redirectOf(request, "/i/ana-lopez", baseURL);
    expect(redirect.status).toBe(307);
    expect(redirect.path).toBe(signInPath("/onboarding/profile?invite=ana-lopez"));
  });

  test("the claim needs a session @real", async ({ request }) => {
    const response = await request.post("/api/invites/ana-lopez/claim", { data: {} });
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorized");
  });

  test("a malformed code is rejected @real", async ({ page, realUser }) => {
    expect(realUser.user.handle).toBeTruthy();
    const response = await page.request.post("/api/invites/NOT_A_CODE!/claim", { data: {} });
    expect(response.status()).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_input");
  });

  test("02 claims the invite once and the inviter sees the friend @real", async ({ twoUsers }) => {
    const [inviter, friend] = twoUsers;
    const { code } = await invitesOf(inviter.page.request);
    expect(await inviteeHandles(inviter.page.request)).not.toContain(friend.user.handle);

    await openProfileWithInvite(friend.page, code);
    await expect.poll(() => inviteeHandles(inviter.page.request), { timeout: 5_000 }).toContain(friend.user.handle);

    await friend.page.reload();
    await expect(friend.page.getByRole("heading", { level: 1, name: profile.title })).toBeVisible();
    const handles = await inviteeHandles(inviter.page.request);
    expect(handles.filter((handle) => handle === friend.user.handle)).toHaveLength(1);

    const again = await friend.page.request.post(`/api/invites/${code}/claim`, { data: {} });
    expect(again.status()).toBe(200);
    expect(ClaimedInvite.parse(await again.json()).inviter.handle).toBe(inviter.user.handle);
  });

  test("two friends who open the same link both count for the inviter @real", async ({ twoUsers, testUsers, signIn, browser }) => {
    const [inviter, first] = twoUsers;
    const { code } = await invitesOf(inviter.page.request);
    await openProfileWithInvite(first.page, code);
    await expect.poll(() => inviteeHandles(inviter.page.request), { timeout: 5_000 }).toContain(first.user.handle);

    const [second] = await testUsers(1);
    if (!second) throw new Error("test user not created");
    const context = await browser.newContext();
    try {
      await signIn(context, second);
      const page = await context.newPage();
      await openProfileWithInvite(page, code);
      await expect.poll(() => inviteeHandles(inviter.page.request), { timeout: 5_000 }).toContain(second.handle);
      expect(await inviteeHandles(inviter.page.request)).toContain(first.user.handle);
    } finally {
      await context.close();
    }
  });

  test("my own code and an unknown code are silent @real", async ({ page, realUser }) => {
    const { code } = await invitesOf(page.request);
    const alerts = page.getByRole("alert").filter({ hasText: /\S/ });
    await openProfileWithInvite(page, code);
    await expect(alerts).toHaveCount(0);
    const own = await page.request.post(`/api/invites/${code}/claim`, { data: {} });
    expect(own.status()).toBe(404);
    expect(await inviteeHandles(page.request)).not.toContain(realUser.user.handle);

    await openProfileWithInvite(page, "zz-no-such-invite");
    await expect(alerts).toHaveCount(0);
    const unknown = await page.request.post("/api/invites/zz-no-such-invite/claim", { data: {} });
    expect(unknown.status()).toBe(404);
    expect((await unknown.json()).error.code).toBe("not_found");
  });
});

test.describe("invite link (mock)", () => {
  test("goes straight to 02 without LinkedIn @mock", async ({ page }) => {
    await page.goto(`/i/${mockInvites.code}`);
    await expect(page).toHaveURL(/\/onboarding\/profile$/);
    await expect(page.getByRole("heading", { level: 1, name: profile.title })).toBeVisible();
  });

  test("the claim answers the inviter, or 404 @mock", async ({ page }) => {
    await page.goto("/onboarding/profile?invite=diego-r");
    const claimed = await page.request.post(`/api/invites/${mockInvites.code}/claim`, { data: {} });
    expect(claimed.status()).toBe(200);
    expect(ClaimedInvite.parse(await claimed.json()).code).toBe(mockInvites.code);
    const missing = await page.request.post("/api/invites/zz-none/claim", { data: {}, headers: { "x-compa-mock-error": "not_found" } });
    expect(missing.status()).toBe(404);
  });
});
