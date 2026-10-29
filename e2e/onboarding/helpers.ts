// Helpers for the onboarding and account specs: the visitor's copy, signed-out redirects, extra test users and
// stubs that keep the browser away from LinkedIn and the Supabase authorize endpoint.
import type { APIRequestContext, BrowserContext, Page, TestInfo } from "@playwright/test";
import type { z } from "zod";
import type { CreateTestUsersBody, TestUserT } from "../../lib/api/admin-schemas";
import { copyFor, type Dictionary } from "../../lib/copy";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { expect, test as base } from "../fixtures";

export { expect, TEST_EVENT_SLUG } from "../fixtures";

export const copyOf = (testInfo: TestInfo): Dictionary => copyFor(localeFromAcceptLanguage(testInfo.project.use.locale));

// The sign-in URL a session-only screen sends a visitor to (lib/server/session.ts signInPath).
export const signInPath = (next: string): string => `/auth/linkedin?next=${encodeURIComponent(next)}`;

type Redirect = { status: number; url: URL | null; path: string };

// A redirect, without following it, so LinkedIn and the Supabase authorize page are never contacted. `path` is the
// target's path and query when it stays on this site.
export async function redirectOf(request: APIRequestContext, path: string, baseURL = "http://localhost:3000"): Promise<Redirect> {
  const response = await request.get(path, { maxRedirects: 0 });
  const location = response.headers()["location"];
  if (!location) return { status: response.status(), url: null, path: "" };
  const url = new URL(location, baseURL);
  const sameSite = url.origin === new URL(baseURL).origin;
  return { status: response.status(), url, path: sameSite ? url.pathname + url.search : "" };
}

// Browser navigations through /auth/linkedin stop at the Supabase authorize URL with a stub page (redirects are not
// routable, so the stub sits on the first request the test can intercept); LinkedIn itself is blocked outright.
export const AUTHORIZE_URL = /\/auth\/v1\/authorize\?provider=linkedin_oidc&/;

export async function stubSignIn(page: Page): Promise<void> {
  await page.route(/linkedin\.com/, (route) => route.abort());
  await page.route("**/auth/v1/authorize**", (route) => route.fulfill({ status: 200, contentType: "text/plain", body: "authorize stub" }));
}

// A click before hydration submits forms natively or does nothing; React tags the DOM nodes it hydrated.
export async function waitForHydration(page: Page, selector = "button"): Promise<void> {
  await page.waitForFunction((css) => {
    const node = document.querySelector(css);
    return node !== null && Object.keys(node).some((key) => key.startsWith("__react"));
  }, selector);
}

const AUTH_COOKIE = /^sb-[a-z0-9]+-auth-token(\.\d+)?$/;
const CHUNK = 3180;

const chunkIndex = (name: string): number => Number(name.split(".")[1] ?? 0);

// Makes the context's Supabase session look expired (its access token past `expires_at`), as after an hour away:
// the server must then refresh it, or send the person to sign-in when the refresh token is gone.
export async function expireSession(context: BrowserContext, baseURL: string | undefined): Promise<void> {
  const parts = (await context.cookies()).filter((cookie) => AUTH_COOKIE.test(cookie.name)).sort((a, b) => chunkIndex(a.name) - chunkIndex(b.name));
  const [first] = parts;
  if (!first) throw new Error("no Supabase session cookie in this context");
  const encoded = parts.map((part) => part.value).join("").replace(/^base64-/, "");
  const session = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Record<string, unknown>;
  const value = `base64-${Buffer.from(JSON.stringify({ ...session, expires_at: 1 })).toString("base64url")}`;
  const base = first.name.replace(/\.\d+$/, "");
  const chunks = value.match(new RegExp(`.{1,${CHUNK}}`, "g")) ?? [];
  await context.clearCookies({ name: AUTH_COOKIE });
  const url = baseURL ?? "http://localhost:3000";
  await context.addCookies(chunks.map((chunk, index) => ({ name: chunks.length > 1 ? `${base}.${index}` : base, value: chunk, url })));
}

// Each guided tour opens once per browser and its overlay covers the screen: mark them all seen.
export async function skipTours(page: Page): Promise<void> {
  await page.addInitScript(() => {
    for (const id of ["home", "me", "ranking", "connect", "register"]) localStorage.setItem(`compa:tour:${id}`, "done");
  });
}

// The `next` the sign-in the page ended on returns to (the callback URL inside the authorize URL).
export function nextOf(page: Page): string | null {
  const callback = new URL(page.url()).searchParams.get("redirect_to");
  return callback ? new URL(callback).searchParams.get("next") : null;
}

// Local Supabase sends mail to its Mailpit, never to real inboxes.
// shortcut: derives the Supabase CLI port layout (API port + 3); set E2E_MAILPIT_URL for any other layout.
export function mailpitUrl(): string | null {
  if (process.env.E2E_MAILPIT_URL) return process.env.E2E_MAILPIT_URL;
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabase) return null;
  const url = new URL(supabase);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.port) return null;
  return `http://${url.hostname}:${Number(url.port) + 3}`;
}

type MailList = { messages: { ID: string; Created: string }[] };

// The newest sign-in link Mailpit holds for `email` that is not in `seen`.
async function newestLink(request: APIRequestContext, mailpit: string, email: string, seen: Set<string>): Promise<string | null> {
  const list = (await (await request.get(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()) as MailList;
  const fresh = list.messages.find((message) => !seen.has(message.ID));
  if (!fresh) return null;
  const message = (await (await request.get(`${mailpit}/api/v1/message/${fresh.ID}`)).json()) as { Text: string };
  return message.Text.match(/https?:\/\/\S+\/auth\/v1\/verify\?\S+/)?.[0] ?? null;
}

// Signs `page` in through the email magic link: POST /api/auth/email (the PKCE verifier cookie lands in the page's
// context), open the link from Mailpit, then finish at /auth/callback with the code and `next`. The local Supabase
// does not allow this app as a redirect target, so the code is taken from its fallback redirect instead.
export async function signInByEmail(page: Page, request: APIRequestContext, email: string, next: string): Promise<void> {
  const mailpit = mailpitUrl();
  if (!mailpit) throw new Error("no local Mailpit");
  const before = (await (await request.get(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()) as MailList;
  const seen = new Set(before.messages.map((message) => message.ID));
  // Supabase refuses a second link for one address within a second, so a quick retry is expected.
  await expect(async () => expect((await page.request.post("/api/auth/email", { data: { email, next } })).status()).toBe(204)).toPass({ timeout: 10_000 });
  let link: string | null = null;
  await expectPoll(async () => (link = await newestLink(request, mailpit, email, seen)));
  if (!link) throw new Error("no sign-in mail arrived");
  const verified = await request.get(link, { maxRedirects: 0 });
  const code = new URL(verified.headers()["location"] ?? "http://x.invalid").searchParams.get("code");
  if (!code) throw new Error("the magic link gave no code");
  await page.goto(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
}

const expectPoll = (probe: () => Promise<string | null>) => expect.poll(probe, { timeout: 10_000 }).not.toBeNull();

type CreateUsers =(body: z.input<typeof CreateTestUsersBody>) => Promise<TestUserT[]>;

export const test = base.extend<{ createUsers: CreateUsers; outsider: TestUserT }>({
  // Test users with chosen fields (or not checked in); deleted after the test.
  createUsers: async ({ realMode }, use) => {
    const created: TestUserT[] = [];
    await use(async (body) => {
      const users = await realMode.createTestUsers(body);
      created.push(...users);
      return users;
    });
    for (const user of created) await realMode.deleteTestUser(user.id);
  },
  // A fresh test user who is not checked in to any event.
  outsider: async ({ createUsers }, use) => {
    const [user] = await createUsers({ count: 1 });
    if (!user) throw new Error("the outsider test user was not created");
    await use(user);
  },
});
