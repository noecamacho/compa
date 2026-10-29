// Shared by the events and live specs. Real mode gets throwaway test events made, rotated and archived as the seeded
// test admin (never codex-conf-2026, which every other spec shares) and fresh test users deleted after each test.
import { expect, type Page, type TestInfo } from "@playwright/test";
import type { z } from "zod";
import { TEST_ADMIN_HANDLE } from "../../db/seed-test-event";
import { AdminEventBody, type CreateTestUsersBody, type TestUserT } from "../../lib/api/admin-schemas";
import { Accepted, ConnectionRequest, CreatedEvent, RotatedCode } from "../../lib/api/schemas";
import { copyFor, type Dictionary } from "../../lib/copy";
import { localeFromAcceptLanguage, type Locale } from "../../lib/i18n";
import { asUser, RealModeError, type RealModeClient, type TestSessionCookies } from "../../lib/testing/real-mode";
import { LOCAL_URL } from "../fixtures/real-mode";
import { test as base } from "../fixtures";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type EventWindow = { startsAt: string; endsAt: string; timezone?: string };
export type ThrowawayEvent = { slug: string; name: string; code: string };

// Admin calls as @codex-test-admin. Every worker and spec signs in as that one person, and a newer sign-in can end an
// older session (the admin gate then answers 404), so a refused call signs in again and retries.
type Admin = { call: <T extends z.ZodType>(method: string, path: string, schema: T, body?: unknown) => Promise<z.output<T>> };
const ADMIN_ATTEMPTS = 3;

export const runningWindow = (): EventWindow => ({ startsAt: new Date(Date.now() - HOUR_MS).toISOString(), endsAt: new Date(Date.now() + DAY_MS).toISOString() });

// Two days ahead on the hour, so the door shows a round start time.
export function upcomingWindow(): EventWindow {
  const start = Math.ceil((Date.now() + 2 * DAY_MS) / HOUR_MS) * HOUR_MS;
  return { startsAt: new Date(start).toISOString(), endsAt: new Date(start + 8 * HOUR_MS).toISOString() };
}

export const endedWindow = (): EventWindow => ({ startsAt: new Date(Date.now() - 2 * DAY_MS).toISOString(), endsAt: new Date(Date.now() - DAY_MS).toISOString() });

export const localeOf = (testInfo: TestInfo): Locale => localeFromAcceptLanguage(testInfo.project.use.locale);
export const copyOf = (testInfo: TestInfo): Dictionary => copyFor(localeOf(testInfo));

// The not-found door is the same for unknown, malformed and rotated codes (A10).
export async function expectEventNotFound(page: Page, copy: Dictionary): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: copy.eventNotFound.title })).toBeVisible();
  await expect(page.getByRole("link", { name: copy.eventNotFound.home })).toHaveAttribute("href", "/");
}

const randomSuffix = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function adminOf(harness: RealModeClient, baseUrl: string): Admin {
  let session: TestSessionCookies | null = null;
  const signIn = async (): Promise<TestSessionCookies> => {
    const admin = (await harness.listTestUsers(TEST_ADMIN_HANDLE)).find((user) => user.handle === TEST_ADMIN_HANDLE);
    if (!admin) throw new Error(`@${TEST_ADMIN_HANDLE} is missing: run SEED_TEST_EVENT=1 bun run db:seed on the test project`);
    return harness.signInAs(admin);
  };
  const call: Admin["call"] = async (method, path, schema, body) => {
    for (let attempt = 1; ; attempt++) {
      try {
        session ??= await signIn();
        return await asUser(session, { baseUrl, method, path, body, schema });
      } catch (error) {
        session = null;
        if (!(error instanceof RealModeError) || attempt >= ADMIN_ATTEMPTS) throw error;
      }
    }
  };
  return { call };
}

type EventFixtures = {
  // A test event of its own for this test (running unless a window is given), archived afterwards.
  throwawayEvent: (window?: EventWindow) => Promise<ThrowawayEvent>;
  // Issues a new access code for a throwaway event; the old one stops working at once.
  rotateCode: (event: ThrowawayEvent) => Promise<string>;
  // Test users created for this test only (checked in nowhere unless `checkInTo` says so), deleted afterwards.
  freshUsers: (body: z.input<typeof CreateTestUsersBody>) => Promise<TestUserT[]>;
};

export const test = base.extend<EventFixtures, { eventAdmin: Admin | null }>({
  eventAdmin: [
    async ({ harness }, use, workerInfo) => {
      await use(harness ? adminOf(harness, workerInfo.project.use.baseURL ?? LOCAL_URL) : null);
    },
    { scope: "worker" },
  ],
  throwawayEvent: async ({ realMode, eventAdmin }, use) => {
    if (!realMode || !eventAdmin) throw new Error("the test admin was not signed in");
    const slugs: string[] = [];
    await use(async (window = runningWindow()) => {
      const suffix = randomSuffix();
      const body = { name: `E2E event ${suffix}`, slug: `e2e-${suffix}`, ...window };
      const { event } = await eventAdmin.call("POST", "/api/admin/events", CreatedEvent, body);
      slugs.push(event.slug);
      return { slug: event.slug, name: event.name, code: event.accessCode };
    });
    for (const slug of slugs) await eventAdmin.call("POST", `/api/admin/events/${slug}/archive`, AdminEventBody);
  },
  rotateCode: async ({ eventAdmin }, use) => {
    if (!eventAdmin) throw new Error("the test admin was not signed in");
    await use(async (event) => {
      return (await eventAdmin.call("POST", `/api/admin/events/${event.slug}/rotate-code`, RotatedCode)).accessCode;
    });
  },
  freshUsers: async ({ realMode }, use) => {
    const created: TestUserT[] = [];
    await use(async (body) => {
      const users = await realMode.createTestUsers(body);
      created.push(...users);
      return users;
    });
    for (const user of created) await realMode.deleteTestUser(user.id);
  },
});

// `from` asks `to` to connect at their shared event and `to` accepts: one accepted "new" edge on the big screen.
export async function connectAndAccept(baseUrl: string, from: TestSessionCookies, to: TestSessionCookies): Promise<string> {
  const body = { toHandle: to.user.handle, screenConsent: true };
  const sent = await asUser(from, { baseUrl, method: "POST", path: "/api/connections", body, schema: ConnectionRequest });
  await asUser(to, { baseUrl, method: "POST", path: `/api/connections/${sent.connectionId}/accept`, body: {}, schema: Accepted });
  return sent.connectionId;
}

export { expect } from "@playwright/test";
