// Helpers shared by the home, summaries, connections, profiles and gamification specs: tours off, typed API calls
// as a signed-in browser context, real-mode people with chosen profiles, and the shared error and 404 screens.
import type { APIRequestContext, APIResponse, BrowserContext, Page } from "@playwright/test";
import type { z } from "zod";
import type { TestProfileInput, TestUserT } from "../../lib/api/admin-schemas";
import { Accepted, ConnectionRequest } from "../../lib/api/schemas";
import { screenState } from "../../lib/copy/es";
import { expect, test as base, TEST_EVENT_SLUG } from "../fixtures";
import type { SignedInUser } from "../fixtures/two-users";

const TOUR_IDS = ["home", "me", "ranking", "connect", "register"];

// Each guided tour opens once per browser; mark them seen so the overlay never covers the screen under test.
export async function skipTours(target: Page | BrowserContext): Promise<void> {
  await target.addInitScript((ids) => {
    try {
      for (const id of ids) localStorage.setItem(`compa:tour:${id}`, "done");
    } catch {
      // about:blank has no storage; the next navigation runs this again.
    }
  }, TOUR_IDS);
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

// A typed API call with the cookies of the page's browser context (the signed-in test user in real mode).
export async function call<T extends z.ZodType>(request: APIRequestContext, method: Method, path: string, schema: T, data?: unknown): Promise<z.output<T>> {
  const response = await request.fetch(path, { method, ...(data === undefined ? {} : { data }) });
  if (!response.ok()) throw new Error(`${method} ${path} answered ${response.status()}: ${await response.text()}`);
  return schema.parse(response.status() === 204 ? undefined : await response.json());
}

export async function expectApiError(response: APIResponse, status: number, code: string): Promise<void> {
  expect(response.status()).toBe(status);
  const body: unknown = await response.json();
  expect(body).toMatchObject({ error: { code } });
}

// `from` scans `to` and sends the request; returns the connection id.
export async function sendRequest(from: SignedInUser, to: TestUserT): Promise<string> {
  const sent = await call(from.page.request, "POST", "/api/connections", ConnectionRequest, { toHandle: to.handle, screenConsent: true });
  return sent.connectionId;
}

// A connection `to` has accepted (+50 to both for a first meeting).
export async function acceptedConnection(from: SignedInUser, to: SignedInUser): Promise<string> {
  const id = await sendRequest(from, to.user);
  await call(to.page.request, "POST", `/api/connections/${id}/accept`, Accepted, { knew: false });
  return id;
}

export async function expectErrorScreen(page: Page): Promise<void> {
  await expect(page.getByRole("alert").filter({ hasText: screenState.errorTitle })).toBeVisible();
  await expect(page.getByRole("button", { name: screenState.retry })).toBeVisible();
  await expect(page.getByRole("link", { name: screenState.goHome, exact: true })).toHaveAttribute("href", "/home");
}

// Next.js' built-in 404 screen: the app has no custom not-found page outside /e/<code>.
export async function expectNotFound(page: Page): Promise<void> {
  await expect(page.getByText(/could not be found/i)).toBeVisible();
}

type ProfileInput = z.input<typeof TestProfileInput>;

// Test users with chosen profiles, each signed in in its own browser context (tours off), deleted after the test.
type People = (profiles: ProfileInput[], options?: { checkIn?: boolean }) => Promise<SignedInUser[]>;

export const test = base.extend<{ people: People }>({
  people: async ({ realMode, signIn, browser, baseURL, viewport, locale, timezoneId, extraHTTPHeaders, isMobile, hasTouch, reducedMotion }, use) => {
    const created: TestUserT[] = [];
    const contexts: BrowserContext[] = [];
    const open = async (user: TestUserT): Promise<SignedInUser> => {
      const context = await browser.newContext({ baseURL, viewport, locale, timezoneId, extraHTTPHeaders, isMobile, hasTouch, reducedMotion });
      contexts.push(context);
      await skipTours(context);
      await signIn(context, user);
      return { user, context, page: await context.newPage() };
    };
    await use(async (profiles, { checkIn = true } = {}) => {
      const users = await realMode.createTestUsers({ users: profiles, ...(checkIn ? { checkInTo: TEST_EVENT_SLUG } : {}) });
      created.push(...users);
      return Promise.all(users.map(open));
    });
    for (const context of contexts) await context.close();
    for (const user of created) await realMode.deleteTestUser(user.id);
  },
});

export { expect };
