// F-61, F-62 and the session gate: sign out from /me (POST /api/auth/signout), signed-out and expired-session visitors
// sent to sign-in with `next` for every session-only screen, and GET/PATCH /api/me plus /api/me/visibility.
import type { BrowserContext, Page } from "@playwright/test";
import { Me, VisibilitySettings } from "../../lib/api/schemas";
import { me as meCopy } from "../../lib/copy/es";
import { AUTHORIZE_URL, copyOf, expect, expireSession, nextOf, redirectOf, signInPath, skipTours, stubSignIn, test, waitForHydration } from "../onboarding/helpers";

const UUID = "0d9c8b7a-6f5e-4d3c-8b1a-0f9e8d7c6b5a";

// Every session-only screen: the (app) group and onboarding (02, 02b). Queries must survive sign-in too.
const PROTECTED = [
  "/home",
  "/me",
  "/me/badges",
  "/connect",
  "/connect?tab=search",
  "/connect/ana-lopez",
  "/connections",
  `/connections/${UUID}/note`,
  `/connections/${UUID}/done`,
  "/invite",
  "/notifications",
  "/people/ana-lopez",
  "/ranking",
  `/requests/${UUID}`,
  "/onboarding/profile",
  "/onboarding/profile?from=me",
  "/onboarding/monito?next=%2Fhome",
];

async function addGarbageSession(context: BrowserContext, baseURL: string | undefined): Promise<void> {
  const url = baseURL ?? "http://localhost:3000";
  await context.addCookies([{ name: "sb-127-auth-token", value: "base64-eyJhY2Nlc3NfdG9rZW4iOiJnYXJiYWdlIn0", url }]);
}

test.describe("session-only screens signed out", () => {
  for (const path of PROTECTED) {
    test(`${path} sends a visitor to sign-in and back @real`, async ({ request, baseURL }) => {
      const redirect = await redirectOf(request, path, baseURL);
      expect(redirect.status).toBe(307);
      expect(redirect.path).toBe(signInPath(path));
    });
  }

  test("a browser on /connections ends on sign-in with next @real", async ({ page }) => {
    await stubSignIn(page);
    await page.goto("/connections");
    await expect(page).toHaveURL(AUTHORIZE_URL);
    expect(nextOf(page)).toBe("/connections");
  });

  test("a garbage session cookie on /connect/<handle> is sent to sign-in with next @real", async ({ page, context, baseURL }) => {
    await addGarbageSession(context, baseURL);
    await stubSignIn(page);
    await page.goto("/connect/ana-lopez?from=qr");
    await expect(page).toHaveURL(AUTHORIZE_URL);
    expect(nextOf(page)).toBe("/connect/ana-lopez?from=qr");
  });
});

async function signOutFromMe(page: Page): Promise<void> {
  await skipTours(page);
  await page.goto("/me");
  await waitForHydration(page, "main button");
  await page.getByRole("button", { name: meCopy.signOut }).click();
  await expect(page.getByText(meCopy.signOutWarning)).toBeVisible();
  await page.getByRole("button", { name: meCopy.signOutConfirm }).click();
  await expect(page).toHaveURL(/\/$/);
}

test.describe("sign out", () => {
  test("cancel keeps the session @mock", async ({ page }) => {
    await skipTours(page);
    await page.goto("/me");
    await waitForHydration(page, "main button");
    await page.getByRole("button", { name: meCopy.signOut }).click();
    await expect(page.getByRole("group", { name: meCopy.signOut })).toBeVisible();
    await page.getByRole("button", { name: meCopy.signOutCancel }).click();
    await expect(page.getByText(meCopy.signOutWarning)).toHaveCount(0);
    await expect(page.getByRole("button", { name: meCopy.signOut })).toBeVisible();
    await expect(page).toHaveURL(/\/me$/);
  });

  test("confirm posts the sign-out and goes to the landing @mock", async ({ page }) => {
    const posted = page.waitForResponse((response) => response.url().endsWith("/api/auth/signout"));
    await signOutFromMe(page);
    expect((await posted).status()).toBe(204);
  });

  test("an already expired session (401) still ends on the landing @mock", async ({ page, mock }) => {
    await mock.mockError("unauthorized", "**/api/auth/signout");
    const posted = page.waitForResponse((response) => response.url().endsWith("/api/auth/signout"));
    await signOutFromMe(page);
    expect((await posted).status()).toBe(401);
  });

  test("signs out for real: landing as a visitor, then screens need sign-in @real", async ({ page, context, testUsers, signIn }, testInfo) => {
    const [user] = await testUsers(1);
    if (!user) throw new Error("test user not created");
    await signIn(context, user);
    await signOutFromMe(page);
    await expect(page.getByRole("link", { name: copyOf(testInfo).landing.signIn })).toBeVisible();
    expect((await page.request.get("/api/me")).status()).toBe(401);
    await stubSignIn(page);
    await page.goto("/home");
    await expect(page).toHaveURL(AUTHORIZE_URL);
    expect(nextOf(page)).toBe("/home");
  });

  test("an expired session is refreshed silently and the screen opens @real", async ({ page, context, testUsers, signIn, baseURL }) => {
    const [user] = await testUsers(1);
    if (!user) throw new Error("test user not created");
    await signIn(context, user);
    await expireSession(context, baseURL);
    await skipTours(page);
    await page.goto("/connections");
    await expect(page).toHaveURL(/\/connections$/);
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);
  });

  test("an expired session signed out elsewhere is sent to sign-in with next @real", async ({ page, context, browser, testUsers, signIn, baseURL }) => {
    const [user] = await testUsers(1);
    if (!user) throw new Error("test user not created");
    await signIn(context, user);
    // Signing out on another device revokes every refresh token of the person (Supabase global sign-out).
    const other = await browser.newContext();
    try {
      await signIn(other, user);
      expect((await other.request.post("/api/auth/signout")).status()).toBe(204);
    } finally {
      await other.close();
    }
    await expireSession(context, baseURL);
    await stubSignIn(page);
    await page.goto("/connections");
    await expect(page).toHaveURL(AUTHORIZE_URL);
    expect(nextOf(page)).toBe("/connections");
  });

  test("signing out without a session answers 401 @real", async ({ request }) => {
    const response = await request.post("/api/auth/signout");
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorized");
  });
});

test.describe("GET and PATCH /api/me", () => {
  test("need a session @real", async ({ request }) => {
    for (const response of [
      await request.get("/api/me"),
      await request.patch("/api/me", { data: { city: "Zapopan" } }),
      await request.patch("/api/me/visibility", { data: { company: "hidden" } }),
    ]) {
      expect(response.status()).toBe(401);
      expect((await response.json()).error.code).toBe("unauthorized");
    }
  });

  test("GET answers the signed-in person @real", async ({ page, realUser }) => {
    const response = await page.request.get("/api/me");
    expect(response.status()).toBe(200);
    const me = Me.parse(await response.json());
    expect(me.handle).toBe(realUser.user.handle);
    expect(me.isTest).toBe(true);
  });

  for (const [label, data, field] of [
    ["an empty name", { name: "  " }, "name"],
    ["a 121-character job title", { headline: "x".repeat(121) }, "headline"],
    ["an 81-character company", { company: "x".repeat(81) }, "company"],
    ["an unknown avatar mode", { avatarMode: "selfie" }, "avatarMode"],
    ["a photo URL that is not a URL", { photoUrl: "not a url" }, "photoUrl"],
  ] as const) {
    test(`PATCH rejects ${label} @real`, async ({ page, realUser }) => {
      const response = await page.request.patch("/api/me", { data });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("invalid_input");
      expect(body.error.fields).toHaveProperty(field);
      expect(Me.parse(await (await page.request.get("/api/me")).json()).name).toBe(realUser.user.name);
    });
  }

  test("PATCH rejects an invalid link, an unknown interest and a non-JSON body @real", async ({ page, realUser }) => {
    expect(realUser.user.id).toBeTruthy();
    const link = await page.request.patch("/api/me", { data: { links: { instagram: "no válido!!" } } });
    expect(link.status()).toBe(400);
    expect((await link.json()).error.message).toMatch(/instagram/);
    const interest = await page.request.patch("/api/me", { data: { interestIds: [987654] } });
    expect(interest.status()).toBe(400);
    const raw = await page.request.patch("/api/me", { data: "{not json", headers: { "content-type": "application/json" } });
    expect(raw.status()).toBe(400);
    expect((await raw.json()).error.code).toBe("invalid_input");
  });

  test("PATCH visibility rejects an unknown level and saves a valid one @real", async ({ page, context, testUsers, signIn }) => {
    const [user] = await testUsers(1);
    if (!user) throw new Error("test user not created");
    await signIn(context, user);
    const bad = await page.request.patch("/api/me/visibility", { data: { headline: "everyone" } });
    expect(bad.status()).toBe(400);
    expect((await bad.json()).error.fields).toHaveProperty("headline");
    const good = await page.request.patch("/api/me/visibility", { data: { company: "hidden", links: { github: "public" } } });
    expect(good.status()).toBe(200);
    const settings = VisibilitySettings.parse(await good.json());
    expect(settings.company).toBe("hidden");
    expect(settings.links.github).toBe("public");
  });

  test("mock mode answers the example and documented errors @mock", async ({ request }) => {
    expect(Me.safeParse(await (await request.get("/api/me")).json()).success).toBe(true);
    const unauthorized = await request.get("/api/me", { headers: { "x-compa-mock-error": "unauthorized" } });
    expect(unauthorized.status()).toBe(401);
    const invalid = await request.patch("/api/me", { data: { name: "" }, headers: { "x-compa-mock-error": "invalid_input" } });
    expect(invalid.status()).toBe(400);
    expect((await invalid.json()).error.fields).toHaveProperty("name");
  });
});
