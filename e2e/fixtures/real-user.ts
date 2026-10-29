// `realUser`: a test user created once per worker (reused by its tests, deleted at the end) whose session is already
// in the test's browser context. LinkedIn is never called: sessions come from the sign-in-as route (API spec A11).
import type { TestUserT } from "../../lib/api/admin-schemas";
import type { TestSessionCookies } from "../../lib/testing/real-mode";
import { addSessionCookies, LOCAL_URL, TEST_EVENT_SLUG, test as base } from "./real-mode";

type RealUser = { user: TestUserT; session: TestSessionCookies };

export const test = base.extend<{ realUser: RealUser }, { workerUser: TestUserT | null }>({
  workerUser: [
    async ({ harness }, use) => {
      if (!harness) return use(null);
      const [user] = await harness.createTestUsers({ count: 1, checkInTo: TEST_EVENT_SLUG });
      await use(user ?? null);
      if (user) await harness.deleteTestUser(user.id);
    },
    { scope: "worker" },
  ],
  realUser: async ({ realMode, workerUser, context, baseURL }, use) => {
    if (!workerUser) throw new Error("the worker test user was not created");
    const session = await realMode.signInAs(workerUser);
    await addSessionCookies(context, session, baseURL ?? LOCAL_URL);
    await use({ user: workerUser, session });
  },
});

export { expect } from "@playwright/test";
