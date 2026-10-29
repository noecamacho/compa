// Playwright fixtures for real-mode specs (docs/testing/real-mode.md). Typechecked once T-000 adds
// @playwright/test; until then tsconfig.json excludes e2e/. The logic lives in lib/testing/real-mode.ts.
import { test as base, type BrowserContext } from "@playwright/test";
import type { TestUserT } from "../../lib/api/admin-schemas";
import { realModeClient, type RealModeClient, type TestSessionCookies } from "../../lib/testing/real-mode";

export const TEST_EVENT_SLUG = "codex-conf-2026";

type Fixtures = {
  realMode: RealModeClient;
  // Test users created for this test only, checked in to the shared test event and deleted afterwards.
  testUsers: (count: number) => Promise<TestUserT[]>;
  // Puts a test user's session cookies into a browser context.
  signIn: (context: BrowserContext, user: TestUserT) => Promise<TestSessionCookies>;
};

export const test = base.extend<Fixtures>({
  realMode: async ({ baseURL }, use, testInfo) => {
    const secret = process.env.TEST_AUTOMATION_SECRET;
    testInfo.skip(!secret, "real mode needs TEST_AUTOMATION_SECRET");
    await use(realModeClient({ baseUrl: baseURL ?? "http://localhost:3000", secret: secret ?? "" }));
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
      const url = baseURL ?? "http://localhost:3000";
      await context.addCookies(session.cookies.map(({ name, value, path, httpOnly, secure, sameSite, expires }) => ({ name, value, url: new URL(path, url).toString(), httpOnly, secure, sameSite, ...(expires ? { expires } : {}) })));
      return session;
    });
  },
});

export { expect } from "@playwright/test";
