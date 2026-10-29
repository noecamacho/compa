// Shared fixtures: a disposable world (running event + organizer), test people, and two signed-in browser
// contexts (A and B) for the two-step connection. Import `test` and `expect` from here in every spec.
import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { World, type PersonSpec, type TestUser } from "../helpers/db";

export const PERSON_A: PersonSpec = { name: "Ana López", headline: "CTO", company: "Tlali", city: "Monterrey, Nuevo León", email: "ana@tlali.mx" };
export const PERSON_B: PersonSpec = { name: "Bruno Díaz", headline: "Cofounder", company: "Kuali", city: "Guadalajara, Jalisco", email: "bruno@kuali.mx" };

type Fixtures = {
  world: World;
  userA: TestUser;
  userB: TestUser;
  // Page signed in as A (the default `page` of a spec is also A).
  pageA: Page;
  contextB: BrowserContext;
  pageB: Page;
  signIn: (context: BrowserContext, user: TestUser) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  world: async ({}, use) => {
    const world = await World.create();
    await use(world);
    await world.dispose();
  },
  userA: async ({ world }, use) => {
    await use(await world.addPerson(PERSON_A));
  },
  userB: async ({ world }, use) => {
    await use(await world.addPerson(PERSON_B));
  },
  signIn: async ({ baseURL }, use) => {
    await use((context, user) => loginAs(context, user, baseURL ?? "http://localhost:3902"));
  },
  pageA: async ({ page, context, userA, signIn }, use) => {
    await signIn(context, userA);
    await use(page);
  },
  contextB: async ({ browser, userB, signIn }, use) => {
    const context = await browser.newContext();
    await signIn(context, userB);
    await use(context);
    await context.close();
  },
  pageB: async ({ contextB }, use) => {
    const page = await contextB.newPage();
    await use(page);
    await page.close();
  },
});

export { expect };
