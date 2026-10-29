// Warms the dev server before the suite: `next dev` compiles each route on its first request, and that first
// request can take seconds under three parallel workers, which turns a 10 s expectation into a flake.
// A throwaway person signs in through the test callback and visits every screen once.
import type { FullConfig } from "@playwright/test";
import { closeDb, World } from "./helpers/db";

const PAGES = ["/", "/home", "/onboarding/profile", "/onboarding/monito", "/connect", "/connect?tab=scan", "/connections", "/me", "/me/badges", "/ranking", "/invite", "/nada"];
const APIS = ["/api/me", "/api/connections", "/api/invites/me", "/api/badges", "/api/users?q=ana"];

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3902";
  const world = await World.create();
  try {
    const person = await world.addPerson({ name: "Calentamiento E2E" });
    const headers = { cookie: `compa_test_session=${person.authUserId}` };
    const visit = (path: string) => fetch(`${baseURL}${path}`, { headers, redirect: "manual" }).then((response) => response.arrayBuffer()).catch(() => undefined);
    await Promise.all([...PAGES, ...APIS].map(visit));
    await Promise.all([
      visit(`/e/${world.event.accessCode}`),
      visit(`/e/${world.event.accessCode}/join`),
      visit(`/connect/${person.handle}`),
      visit(`/people/${person.handle}`),
      visit(`/u/${person.handle}`),
      visit("/auth/linkedin?next=/home"),
      fetch(`${baseURL}/api/e/${world.event.accessCode}/check-in`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ screenConsent: true }) }).catch(() => undefined),
    ]);
  } finally {
    await world.dispose();
    await closeDb();
  }
}
