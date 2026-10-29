// `testEvent`: the seeded test event Codex Conf 2026 (SEED_TEST_EVENT=1 bun run db:seed) with its access code, read
// as the seeded test admin. Before each worker its window is reset to running when it has ended or not started.
import { AdminEventBody, type AdminEventT } from "../../lib/api/admin-schemas";
import { TEST_ADMIN_HANDLE } from "../../db/seed-test-event";
import { asUser, type RealModeClient } from "../../lib/testing/real-mode";
import { LOCAL_URL, TEST_EVENT_SLUG } from "./real-mode";
import { test as base } from "./real-user";

const DAY_MS = 24 * 60 * 60 * 1000;

export type TestEvent = Pick<AdminEventT, "slug" | "name" | "accessCode" | "joinUrl">;

async function runningTestEvent(harness: RealModeClient, baseUrl: string): Promise<TestEvent> {
  const admin = (await harness.listTestUsers(TEST_ADMIN_HANDLE)).find((user) => user.handle === TEST_ADMIN_HANDLE);
  if (!admin) throw new Error(`@${TEST_ADMIN_HANDLE} is missing: run SEED_TEST_EVENT=1 bun run db:seed on the test project`);
  const session = await harness.signInAs(admin);
  const path = `/api/admin/events/${TEST_EVENT_SLUG}`;
  const { event } = await asUser(session, { baseUrl, method: "GET", path, schema: AdminEventBody });
  if (event.isRunning) return event;
  const now = Date.now();
  const body = { startsAt: new Date(now - DAY_MS).toISOString(), endsAt: new Date(now + 365 * DAY_MS).toISOString() };
  return (await asUser(session, { baseUrl, method: "PATCH", path, body, schema: AdminEventBody })).event;
}

export const test = base.extend<{ testEvent: TestEvent }, { workerEvent: TestEvent | null }>({
  workerEvent: [
    async ({ harness }, use, workerInfo) => {
      await use(harness ? await runningTestEvent(harness, workerInfo.project.use.baseURL ?? LOCAL_URL) : null);
    },
    { scope: "worker" },
  ],
  testEvent: async ({ realMode, workerEvent }, use) => {
    if (!realMode || !workerEvent) throw new Error("the test event was not loaded");
    await use(workerEvent);
  },
});

export { expect } from "@playwright/test";
