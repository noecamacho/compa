import { afterEach, describe, expect, mock, test } from "bun:test";
import type { UserRow } from "../../db/schema";
import { AUTOMATION_HEADER } from "./automation";
import { MOCK_HEADERS } from "./mock-headers";

// The gate reads the signed-in person through lib/server/auth; each test picks who that is.
let signedIn: UserRow | null = null;
mock.module("../server/auth", () => ({
  currentUserOrNull: async () => signedIn,
  requireUser: async () => signedIn,
}));

const { defineRoute } = await import("./define-route");
const { isAdminAuth } = await import("./route-spec");
const { ROUTES } = await import("./routes");

const SECRET = "s".repeat(48);
const person = (overrides: Partial<UserRow>): UserRow => ({ id: "u1", role: "user", isTest: false, isAdmin: false, ...overrides }) as UserRow;
const ADMIN_ROUTES = ROUTES.filter((route) => route.path.startsWith("/api/admin/"));
const PARAMS = { slug: "founders-fest", userId: "6a0f6c1e-1b2d-4c3e-8f4a-5b6c7d8e9f01", id: "6a0f6c1e-1b2d-4c3e-8f4a-5b6c7d8e9f01" };

function call(spec: (typeof ROUTES)[number], headers: Record<string, string> = {}) {
  const handler = mock(async (input: { user: UserRow | null }) => ({ status: 299, input }));
  const url = `http://localhost${spec.path.replace(/\{(\w+)\}/g, (_, key: keyof typeof PARAMS) => PARAMS[key])}`;
  const body = spec.bodyExample === undefined ? undefined : JSON.stringify(spec.bodyExample);
  const req = new Request(url, { method: spec.method.toUpperCase(), headers, body });
  const run = defineRoute(spec, handler);
  return { handler, response: run(req, { params: Promise.resolve(PARAMS) }) };
}

afterEach(() => {
  signedIn = null;
  delete process.env.TEST_AUTOMATION_SECRET;
});

describe("super-admin gate (A11)", () => {
  test("every /api/admin route is admin-only", () => {
    expect(ADMIN_ROUTES.length).toBeGreaterThanOrEqual(17);
    for (const route of ADMIN_ROUTES) expect(isAdminAuth(route.auth)).toBe(true);
  });

  const strangers: [string, UserRow | null][] = [
    ["signed out", null],
    ["a regular user", person({})],
    ["a legacy is_admin flag without the role", person({ isAdmin: true })],
    ["a test user", person({ isTest: true })],
  ];

  for (const [who, user] of strangers) {
    test(`${who} gets 404 not_found on every admin route, and the handler never runs`, async () => {
      signedIn = user;
      for (const route of ADMIN_ROUTES) {
        const { handler, response } = call(route);
        const res = await response;
        expect(`${route.id} ${res.status}`).toBe(`${route.id} 404`);
        expect(await res.json()).toEqual({ error: { code: "not_found", message: "Not found." } });
        expect(handler).not.toHaveBeenCalled();
      }
    });
  }

  test("a super admin reaches every admin handler", async () => {
    signedIn = person({ role: "super_admin" });
    for (const route of ADMIN_ROUTES) {
      const { handler, response } = call(route);
      expect(`${route.id} ${(await response).status}`).toBe(`${route.id} 299`);
      expect(handler).toHaveBeenCalledTimes(1);
    }
  });

  test("the per-request mock header does not open admin routes in real mode", async () => {
    signedIn = person({});
    for (const route of ADMIN_ROUTES) expect((await call(route, { [MOCK_HEADERS.mock]: "1" }).response).status).toBe(404);
  });
});

describe("automation header (A11)", () => {
  const automationRoutes = () => ADMIN_ROUTES.filter((route) => route.auth === "automation");

  test("only the test-user and session routes accept it", () => {
    expect(automationRoutes().map((route) => route.id).sort()).toEqual(["createTestSession", "createTestUsers", "deleteTestUser", "listTestUsers"]);
  });

  test("missing or wrong header: 404", async () => {
    process.env.TEST_AUTOMATION_SECRET = SECRET;
    for (const route of automationRoutes()) {
      expect((await call(route).response).status).toBe(404);
      expect((await call(route, { [AUTOMATION_HEADER]: `${SECRET}x` }).response).status).toBe(404);
    }
  });

  test("correct header: the handler runs with no user", async () => {
    process.env.TEST_AUTOMATION_SECRET = SECRET;
    for (const route of automationRoutes()) {
      const { handler, response } = call(route, { [AUTOMATION_HEADER]: SECRET });
      expect((await response).status).toBe(299);
      expect(handler.mock.calls[0]?.[0]).toMatchObject({ user: null });
    }
  });

  test("correct header with the variable unset: 404", async () => {
    for (const route of automationRoutes()) expect((await call(route, { [AUTOMATION_HEADER]: SECRET }).response).status).toBe(404);
  });

  test("the header never opens the event console", async () => {
    process.env.TEST_AUTOMATION_SECRET = SECRET;
    for (const route of ADMIN_ROUTES.filter((spec) => spec.auth === "admin")) {
      expect((await call(route, { [AUTOMATION_HEADER]: SECRET }).response).status).toBe(404);
    }
  });
});
