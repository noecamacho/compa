// F-03..F-06: sign-in. /auth/linkedin is only asserted as a redirect (LinkedIn is never contacted); /auth/callback
// failures land on the landing error; the email form at the event door posts /api/auth/email (local mail only).
import type { APIRequestContext, Page } from "@playwright/test";
import { Me } from "../../lib/api/schemas";
import { AUTHORIZE_URL, copyOf, expect, mailpitUrl, nextOf, redirectOf, signInByEmail, stubSignIn, test, waitForHydration } from "./helpers";

// Where /auth/linkedin sends the browser: the Supabase authorize URL for linkedin_oidc, and the `next` it returns to.
async function authorizeTarget(request: APIRequestContext, next: string, baseURL?: string) {
  const redirect = await redirectOf(request, `/auth/linkedin?next=${encodeURIComponent(next)}`, baseURL);
  expect(redirect.status).toBe(302);
  if (!redirect.url) throw new Error("/auth/linkedin did not redirect");
  expect(redirect.url.pathname).toBe("/auth/v1/authorize");
  expect(redirect.url.searchParams.get("provider")).toBe("linkedin_oidc");
  const callback = new URL(redirect.url.searchParams.get("redirect_to") ?? "");
  expect(callback.pathname).toBe("/auth/callback");
  return callback.searchParams.get("next");
}

test.describe("LinkedIn sign-in start", () => {
  test("redirects to the provider and keeps a same-site next @real", async ({ request, baseURL }) => {
    expect(await authorizeTarget(request, "/u/ana-lopez", baseURL)).toBe("/u/ana-lopez");
    expect(await authorizeTarget(request, "/e/abc123/join?x=1", baseURL)).toBe("/e/abc123/join?x=1");
  });

  for (const unsafe of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", ""]) {
    test(`replaces an unsafe next (${unsafe || "empty"}) with /me @real`, async ({ request, baseURL }) => {
      expect(await authorizeTarget(request, unsafe, baseURL)).toBe("/me");
    });
  }

  test("the landing button opens sign-in with next=/home @real", async ({ page }, testInfo) => {
    await stubSignIn(page);
    await page.goto("/");
    await waitForHydration(page, "a[href^='/auth/linkedin']");
    await page.getByRole("link", { name: copyOf(testInfo).landing.signIn }).click();
    await expect(page).toHaveURL(AUTHORIZE_URL);
    expect(nextOf(page)).toBe("/home");
  });

  test("mock mode skips LinkedIn and lands on /me @mock", async ({ page }) => {
    await page.goto("/auth/linkedin?next=/home");
    await expect(page).toHaveURL(/\/me$/);
  });
});

async function expectSignInError(page: Page, copy: ReturnType<typeof copyOf>["landing"]): Promise<void> {
  await expect(page).toHaveURL(/\/\?error=signin$/);
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(copy.signInError);
  await expect(page.getByRole("link", { name: copy.signIn })).toBeVisible();
}

test.describe("sign-in callback failures", () => {
  for (const query of [
    "error=user_cancelled_login",
    "error=access_denied&next=%2Fu%2Fana-lopez",
    "error=invalid_scope",
    "error=server_error&code=abc",
    "code=not-a-real-code",
    "",
  ]) {
    test(`/auth/callback?${query} shows the sign-in error @real`, async ({ page, request, baseURL }, testInfo) => {
      const redirect = await redirectOf(request, `/auth/callback?${query}`, baseURL);
      expect(redirect.status).toBe(302);
      expect(redirect.path).toBe("/?error=signin");
      await page.goto(`/auth/callback?${query}`);
      await expectSignInError(page, copyOf(testInfo).landing);
    });
  }
});

test.describe("email sign-in at the event door", () => {
  const emailField = (page: Page, label: string) => page.getByRole("textbox", { name: label });

  async function openDoor(page: Page, accessCode: string): Promise<void> {
    await page.goto(`/e/${accessCode}`);
    await waitForHydration(page, "form button[type=submit]");
  }

  test("sends a link and confirms it @real", async ({ page, testEvent, createUsers }, testInfo) => {
    const copy = copyOf(testInfo).door;
    const [user] = await createUsers({ count: 1 });
    if (!user?.email) throw new Error("test user has no email");
    await openDoor(page, testEvent.accessCode);
    await expect(page.getByRole("link", { name: copy.cta })).toHaveAttribute("href", `/auth/linkedin?next=${encodeURIComponent(`/e/${testEvent.accessCode}/join`)}`);
    await emailField(page, copy.emailLabel).fill(user.email);
    const posted = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith("/api/auth/email"));
    await page.getByRole("button", { name: copy.emailCta }).click();
    expect((await posted).postDataJSON()).toEqual({ email: user.email, next: `/e/${testEvent.accessCode}/join` });
    await expect(page.getByRole("status")).toHaveText(copy.emailSent(user.email));
  });

  test("an invalid address is stopped in the browser @real", async ({ page, testEvent }, testInfo) => {
    const copy = copyOf(testInfo).door;
    await openDoor(page, testEvent.accessCode);
    const posts: string[] = [];
    page.on("request", (request) => request.url().endsWith("/api/auth/email") && posts.push(request.url()));
    const field = emailField(page, copy.emailLabel);
    await field.fill("not-an-email");
    await page.getByRole("button", { name: copy.emailCta }).click();
    expect(await field.evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false);
    await expect(page.getByRole("status")).toHaveCount(0);
    expect(posts).toHaveLength(0);
  });

  test("a failed send shows the error and keeps the form @real", async ({ page, testEvent }, testInfo) => {
    const copy = copyOf(testInfo).door;
    await openDoor(page, testEvent.accessCode);
    await page.route("**/api/auth/email", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "internal", message: "boom" } }) }),
    );
    await emailField(page, copy.emailLabel).fill("ana@example.com");
    await page.getByRole("button", { name: copy.emailCta }).click();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(copy.emailFailed);
    await expect(emailField(page, copy.emailLabel)).toHaveValue("ana@example.com");
    await expect(page.getByRole("button", { name: copy.emailCta })).toBeEnabled();
  });
});

test.describe("POST /api/auth/email", () => {
  for (const [label, data] of [
    ["an invalid email", { email: "not-an-email" }],
    ["a missing email", {}],
    ["a too long email", { email: `${"a".repeat(250)}@x.co` }],
  ] as const) {
    test(`rejects ${label} with 400 invalid_input @real`, async ({ request }) => {
      const response = await request.post("/api/auth/email", { data });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("invalid_input");
      expect(body.error.fields).toHaveProperty("email");
    });
  }

  test("rejects a body that is not JSON @real", async ({ request }) => {
    const response = await request.post("/api/auth/email", { data: "email=ana@example.com", headers: { "content-type": "application/x-www-form-urlencoded" } });
    expect(response.status()).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_input");
  });

  test("answers 204 in mock mode without sending mail @mock", async ({ request }) => {
    const response = await request.post("/api/auth/email", { data: { email: "luis@example.com", next: "/onboarding/profile" } });
    expect(response.status()).toBe(204);
  });
});

// F-03, F-06 end to end without LinkedIn: a test user signs in through the email link and the callback syncs them.
// Test users are created with an edited name, so the "unedited name is refreshed" half of M14 stays a unit-level check.
test.describe("email link sign-in completes", () => {
  test.skip(!mailpitUrl(), "needs the local Supabase Mailpit");

  test("lands on a same-site next and keeps an edited name @real", async ({ page, request, createUsers }) => {
    const [user] = await createUsers({ count: 1 });
    if (!user?.email) throw new Error("test user has no email");
    await signInByEmail(page, request, user.email, "/connections?tab=all");
    await expect(page).toHaveURL(/\/connections\?tab=all$/);
    const me = Me.parse(await (await page.request.get("/api/me")).json());
    expect(me.handle).toBe(user.handle);
    expect(me.name).toBe(user.name);
    expect(me.nameEdited).toBe(true);
  });

  test("replaces an unsafe next with /me @real", async ({ page, request, createUsers }) => {
    const [user] = await createUsers({ count: 1 });
    if (!user?.email) throw new Error("test user has no email");
    await signInByEmail(page, request, user.email, "//evil.com");
    await expect(page).toHaveURL(/\/me$/);
  });
});
