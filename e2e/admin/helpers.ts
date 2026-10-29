// Shared pieces of the admin specs (flows F-55..F-57): admin copy in the project's locale, API contexts for the seeded
// test super admin, a plain test user and a stranger, and throwaway test events (slug prefix `e2e-admin-`) that are
// archived after each test. The shared codex-conf-2026 is only ever read here: other specs rely on its window and code.
import type { APIRequestContext, APIResponse, Locator, Page } from "@playwright/test";
import type { z } from "zod";
import { TEST_ADMIN_HANDLE } from "../../db/seed-test-event";
import type { TestUserT } from "../../lib/api/admin-schemas";
import { CreatedEvent } from "../../lib/api/schemas";
import { copyFor, type Dictionary } from "../../lib/copy";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import type { RealModeClient, TestSessionCookies } from "../../lib/testing/real-mode";
import { expect, test as base } from "../fixtures";
import { addSessionCookies, LOCAL_URL } from "../fixtures/real-mode";

export type AdminCopy = Dictionary["admin"];
export type CreatedEventT = z.output<typeof CreatedEvent>["event"];

const HOUR_MS = 3_600_000;
export const SLUG_PREFIX = "e2e-admin-";
// Well-formed ids nobody has: the routes answer 404, not 400.
export const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";
export const UNKNOWN_SLUG = `${SLUG_PREFIX}does-not-exist`;

export const uniqueSlug = (): string => `${SLUG_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const eventBody = (slug: string) => ({
  name: `E2E admin ${slug.slice(SLUG_PREFIX.length)}`,
  slug,
  startsAt: new Date(Date.now() - HOUR_MS).toISOString(),
  endsAt: new Date(Date.now() + 24 * HOUR_MS).toISOString(),
  timezone: "America/Mexico_City",
});

// The access code is the last segment of the join URL (`/e/<code>`).
export const codeOf = (joinUrl: string): string => new URL(joinUrl).pathname.split("/").pop() ?? "";

type Throwaway = {
  create: () => Promise<CreatedEventT>;
  // A slug created through the UI, archived after the test like the others.
  track: (slug: string) => void;
};

type AdminFixtures = {
  copy: AdminCopy;
  admin: AdminSession;
  // Puts the test admin's session into the test's browser context.
  asAdmin: void;
  adminApi: APIRequestContext;
  userApi: APIRequestContext;
  anonApi: APIRequestContext;
  events: Throwaway;
};

function storageFor(session: TestSessionCookies | null, baseURL: string) {
  const domain = new URL(baseURL).hostname;
  const cookies = (session?.cookies ?? []).map(({ name, value, path, httpOnly, secure, sameSite, expires }) => ({ name, value, domain, path, httpOnly, secure, sameSite, expires: expires ?? -1 }));
  return { cookies, origins: [] };
}

type AdminSession = { user: TestUserT; session: TestSessionCookies };

const isLive = async (session: TestSessionCookies, baseURL: string): Promise<boolean> =>
  (await fetch(new URL("/api/admin/events?status=draft", baseURL), { headers: { cookie: session.cookieHeader } })).status === 200;

// Signing in as the same test user from two places at once can revoke that user's other sessions (see the admin report:
// the sign-in-as fallback resets the password). One session per worker, re-checked before each test, keeps sign-ins rare.
async function liveAdminSession(realMode: RealModeClient, known: AdminSession | null, baseURL: string): Promise<AdminSession> {
  if (known && (await isLive(known.session, baseURL))) return known;
  const user = known?.user ?? (await realMode.listTestUsers(TEST_ADMIN_HANDLE)).find((candidate) => candidate.handle === TEST_ADMIN_HANDLE);
  if (!user) throw new Error(`@${TEST_ADMIN_HANDLE} is missing: run SEED_TEST_EVENT=1 bun run db:seed on the test project`);
  for (let attempt = 1; attempt <= 4; attempt++) {
    const session = await realMode.signInAs(user).catch(() => null);
    if (session && (await isLive(session, baseURL))) return { user, session };
    // shortcut: jittered retry while another runner signs in as the same admin; drop once sign-in-as stops revoking sessions.
    await new Promise((resolve) => setTimeout(resolve, 300 * attempt + Math.random() * 500));
  }
  throw new Error(`could not get a live session for @${TEST_ADMIN_HANDLE}`);
}

export const test = base.extend<AdminFixtures, { adminHolder: { current: AdminSession | null } }>({
  copy: async ({}, use, testInfo) => {
    await use(copyFor(localeFromAcceptLanguage(testInfo.project.use.locale)).admin);
  },
  adminHolder: [
    async ({}, use) => {
      await use({ current: null });
    },
    { scope: "worker" },
  ],
  admin: async ({ realMode, adminHolder, baseURL }, use) => {
    adminHolder.current = await liveAdminSession(realMode, adminHolder.current, baseURL ?? LOCAL_URL);
    await use(adminHolder.current);
  },
  asAdmin: async ({ admin, context, baseURL }, use) => {
    await addSessionCookies(context, admin.session, baseURL ?? LOCAL_URL);
    await use();
  },
  adminApi: async ({ playwright, admin, baseURL }, use) => {
    const api = await playwright.request.newContext({ baseURL, storageState: storageFor(admin.session, baseURL ?? LOCAL_URL) });
    await use(api);
    await api.dispose();
  },
  userApi: async ({ playwright, realUser, baseURL }, use) => {
    const api = await playwright.request.newContext({ baseURL, storageState: storageFor(realUser.session, baseURL ?? LOCAL_URL) });
    await use(api);
    await api.dispose();
  },
  anonApi: async ({ playwright, baseURL }, use) => {
    const api = await playwright.request.newContext({ baseURL });
    await use(api);
    await api.dispose();
  },
  events: async ({ adminApi }, use) => {
    const slugs: string[] = [];
    await use({
      create: async () => {
        const slug = uniqueSlug();
        slugs.push(slug);
        const response = await adminApi.post("/api/admin/events", { data: eventBody(slug) });
        expect(response.status(), await response.text()).toBe(201);
        return CreatedEvent.parse(await response.json()).event;
      },
      track: (slug) => slugs.push(slug),
    });
    // Archived, never deleted: a hard delete would cascade. Already archived or never created answers fine to ignore.
    for (const slug of slugs) await adminApi.post(`/api/admin/events/${slug}/archive`);
  },
});

export { expect };

// The error body every route sends (lib/api/errors.ts).
export async function expectError(response: APIResponse, status: number, code: string): Promise<void> {
  expect(response.status(), await response.text()).toBe(status);
  const body = (await response.json()) as { error?: { code?: string } };
  expect(body.error?.code).toBe(code);
}

// Every admin route hides from anyone who is not a super admin with the 404 an unknown path gets (API spec A11).
export const expectHidden = (response: APIResponse) => expectError(response, 404, "not_found");

// A table row from 768 px, a stacked card on a phone; only the visible one is in the accessibility tree.
export const rowOf = (page: Page, text: string): Locator =>
  page.getByRole("row").filter({ hasText: text }).or(page.getByRole("listitem").filter({ hasText: text }));
