// Playwright fixtures for real-mode specs (docs/testing/real-mode.md). The logic lives in lib/testing/real-mode.ts.
// They skip themselves without TEST_AUTOMATION_SECRET, so mock-only runs (CI without the test project) stay green.
import { test as base, type BrowserContext } from "@playwright/test";
import type { TestUserT } from "../../lib/api/admin-schemas";
import { realModeClient, type RealModeClient, type TestSessionCookies } from "../../lib/testing/real-mode";
import { isProductionUrl } from "../targets";

export const TEST_EVENT_SLUG = "codex-conf-2026";
export const LOCAL_URL = "http://localhost:3000";

type WorkerFixtures = {
  // One client per worker, or null when automation is off.
  harness: RealModeClient | null;
};

type Fixtures = {
  realMode: RealModeClient;
  // Test users created for this test only, checked in to the shared test event and deleted afterwards.
  testUsers: (count: number) => Promise<TestUserT[]>;
  // Puts a test user's session cookies into a browser context.
  signIn: (context: BrowserContext, user: TestUserT) => Promise<TestSessionCookies>;
};

export async function addSessionCookies(context: BrowserContext, session: TestSessionCookies, baseURL: string): Promise<void> {
  await context.addCookies(
    session.cookies.map(({ name, value, path, httpOnly, secure, sameSite, expires }) => ({ name, value, url: new URL(path, baseURL).toString(), httpOnly, secure, sameSite, ...(expires ? { expires } : {}) })),
  );
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  harness: [
    async ({}, use, workerInfo) => {
      const secret = process.env.TEST_AUTOMATION_SECRET;
      const baseUrl = workerInfo.project.use.baseURL ?? LOCAL_URL;
      // Real-mode specs write data: never against production, whatever --grep asks for.
      const allowed = Boolean(secret) && !isProductionUrl(baseUrl);
      await use(allowed ? realModeClient({ baseUrl, secret: secret ?? "" }) : null);
    },
    { scope: "worker" },
  ],
  realMode: async ({ harness }, use, testInfo) => {
    testInfo.skip(!harness, "real mode needs TEST_AUTOMATION_SECRET and a non-production base URL");
    if (harness) await use(harness);
  },
  testUsers: async ({ realMode }, use) => {
    const created: TestUserT[] = [];
    await use(async (count) => {
      const users = await realMode.createTestUsers({ count, checkInTo: TEST_EVENT_SLUG });
      created.push(...users);
      return users;
    });
    for (const user of created) await realMode.deleteTestUser(user.id);
  },
  signIn: async ({ realMode, baseURL }, use) => {
    await use(async (context, user) => {
      const session = await realMode.signInAs(user);
      await addSessionCookies(context, session, baseURL ?? LOCAL_URL);
      return session;
    });
  },
});

export { expect } from "@playwright/test";
