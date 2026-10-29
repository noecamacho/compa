// `twoUsers`: two fresh test users, each signed in in its own browser context, for request and accept, mutual scans
// and live updates. Assert across them with expect.poll (5 s cap), never fixed sleeps.
import type { BrowserContext, Page } from "@playwright/test";
import type { TestUserT } from "../../lib/api/admin-schemas";
import { test as base } from "./test-event";

export type SignedInUser = { user: TestUserT; context: BrowserContext; page: Page };

export const test = base.extend<{ twoUsers: [SignedInUser, SignedInUser] }>({
  twoUsers: async ({ browser, testUsers, signIn, baseURL, viewport, locale, timezoneId, extraHTTPHeaders, isMobile, hasTouch, reducedMotion }, use) => {
    const users = await testUsers(2);
    const contexts: BrowserContext[] = [];
    const signedIn = async (user: TestUserT | undefined): Promise<SignedInUser> => {
      if (!user) throw new Error("test user not created");
      const context = await browser.newContext({ baseURL, viewport, locale, timezoneId, extraHTTPHeaders, isMobile, hasTouch, reducedMotion });
      contexts.push(context);
      await signIn(context, user);
      return { user, context, page: await context.newPage() };
    };
    await use([await signedIn(users[0]), await signedIn(users[1])]);
    for (const context of contexts) await context.close();
  },
});

export { expect } from "@playwright/test";
