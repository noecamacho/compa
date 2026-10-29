// Shared pieces of the API contract suite: the route registry (lib/api/routes.ts) turned into requests.
import { expect, type APIRequestContext, type APIResponse, type TestInfo } from "@playwright/test";
import { z } from "zod";
import { AUTOMATION_HEADER } from "../../lib/api/automation";
import * as X from "../../lib/api/examples";
import { MOCK_HEADERS } from "../../lib/api/mock-headers";
import { isAdminAuth, NoBody, type AnyRouteSpec } from "../../lib/api/route-spec";
import { ROUTES } from "../../lib/api/routes";
import type { RealModeClient, TestSessionCookies } from "../../lib/testing/real-mode";
import { TEST_ADMIN_HANDLE } from "../../db/seed-test-event";

export { ROUTES };

// The API answers the same at every viewport and locale: run the contract in one project only.
export const API_PROJECT = "desktop-1440-en";
export const runsOnce = (testInfo: TestInfo): boolean => testInfo.project.name === API_PROJECT;
export const ONCE_REASON = `API contract tests run only in ${API_PROJECT}`;

export const label = (spec: AnyRouteSpec): string => `${spec.method.toUpperCase()} ${spec.path} (${spec.id})`;

export const isAdminRoute = (spec: AnyRouteSpec): boolean => isAdminAuth(spec.auth);

// Well-formed values for every path parameter name the registry uses (the mock ignores them, real mode needs the format).
export const SAMPLE_PARAMS: Readonly<Record<string, string>> = {
  handle: X.valeriaPublic.handle,
  id: X.ids.connection,
  userId: X.ids.valeria,
  slug: X.founders.slug,
  code: X.accessCode,
};

// Values each param schema rejects; `code` is checked against the route's own schema (A10 lets any event code through).
export const MALFORMED_PARAMS: Readonly<Record<string, string>> = {
  handle: "Not_A_Handle",
  id: "not-a-uuid",
  userId: "not-a-uuid",
  slug: "Not_A_Slug",
  code: "BAD_CODE",
};

export const paramNames = (spec: AnyRouteSpec): string[] => [...spec.path.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? "");

export function pathFor(spec: AnyRouteSpec, values: Readonly<Record<string, string>> = {}): string {
  const all = { ...SAMPLE_PARAMS, ...values };
  return spec.path.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = all[name];
    if (value === undefined) throw new Error(`${spec.id}: no sample value for path param {${name}}`);
    return encodeURIComponent(value);
  });
}

// Params the route's schema rejects when that one param is malformed.
export const rejectedParams = (spec: AnyRouteSpec): string[] =>
  paramNames(spec).filter((name) => !spec.params.safeParse(paramsWith(spec, { [name]: MALFORMED_PARAMS[name] ?? "" })).success);

export const paramsWith = (spec: AnyRouteSpec, values: Readonly<Record<string, string>>): Record<string, string> =>
  Object.fromEntries(paramNames(spec).map((name) => [name, values[name] ?? SAMPLE_PARAMS[name] ?? ""]));

type CallOptions = { path?: string; headers?: Record<string, string>; data?: unknown; multipart?: Record<string, string> };

// One call to a route, never following redirects (sign-in routes must not reach LinkedIn).
export function call(request: APIRequestContext, spec: AnyRouteSpec, { path, headers = {}, data, multipart }: CallOptions = {}): Promise<APIResponse> {
  return request.fetch(path ?? pathFor(spec), { method: spec.method.toUpperCase(), headers, data, multipart, maxRedirects: 0, failOnStatusCode: false });
}

export const mockHeaders = (extra: Record<string, string> = {}): Record<string, string> => ({ [MOCK_HEADERS.mock]: "1", ...extra });

export const sessionHeaders = (cookieHeader: string): Record<string, string> => ({ cookie: cookieHeader });

// Only the presented header matters; the value is never logged by the app (lib/api/automation.ts).
export function automationHeaders(): Record<string, string> {
  const secret = process.env.TEST_AUTOMATION_SECRET;
  if (!secret) throw new Error("TEST_AUTOMATION_SECRET is not set");
  return { [AUTOMATION_HEADER]: secret };
}

// The error body of every route (API spec §3, lib/api/errors.ts).
export const ErrorEnvelope = z.strictObject({
  error: z.strictObject({ code: z.string().regex(/^[a-z_]+$/), message: z.string().min(1), fields: z.record(z.string(), z.array(z.string())).optional() }),
});
export type ErrorEnvelopeT = z.infer<typeof ErrorEnvelope>;

export async function expectError(response: APIResponse, status: number, code: string): Promise<ErrorEnvelopeT> {
  const text = await response.text();
  expect(response.status(), `${response.url()} → ${text}`).toBe(status);
  expect(response.headers()["content-type"]).toContain("application/json");
  const body = ErrorEnvelope.parse(JSON.parse(text));
  expect(body.error.code).toBe(code);
  return body;
}

// Parses a success body with the route's response schema and reports every zod issue on failure.
export async function expectSuccessBody(spec: AnyRouteSpec, response: APIResponse): Promise<unknown> {
  const text = await response.text();
  const schema = spec.success.schema;
  if (!schema || schema === NoBody) {
    expect(text, `${spec.id} documents no body`).toBe("");
    return undefined;
  }
  expect(response.headers()["content-type"]).toContain("application/json");
  const raw: unknown = JSON.parse(text);
  const parsed = schema.safeParse(raw);
  expect(parsed.error?.issues ?? [], `${spec.id} body matches its schema`).toEqual([]);
  // zod strips unknown keys: a difference here is a field the response sends but the contract does not document.
  expect(parsed.data, `${spec.id} sends only documented fields`).toEqual(raw);
  return raw;
}

export const successStatuses = (spec: AnyRouteSpec): number[] => [spec.success.status, ...(spec.success.alsoStatus ? [spec.success.alsoStatus.status] : [])];

export const randomUuid = (): string => crypto.randomUUID();

// Sends one request after another until the first 429. Windows are aligned to the clock, so a burst that crosses
// a window edge restarts the count: allow up to two windows before giving up.
export async function burstUntilLimited(send: () => Promise<APIResponse>, limit: number): Promise<{ before: number[]; limited: APIResponse | null }> {
  const before: number[] = [];
  for (let attempt = 0; attempt <= 2 * limit + 1; attempt += 1) {
    const response = await send();
    if (response.status() === 429) return { before, limited: response };
    before.push(response.status());
  }
  return { before, limited: null };
}

// The test admin is shared by every area's specs, and a sign-out anywhere revokes all of its sessions: sign in
// until the console answers, so a 404 below always comes from the handler, never from a revoked session.
export async function adminSession(realMode: RealModeClient, request: APIRequestContext): Promise<TestSessionCookies> {
  const admin = (await realMode.listTestUsers(TEST_ADMIN_HANDLE)).find((user) => user.handle === TEST_ADMIN_HANDLE);
  if (!admin) throw new Error(`@${TEST_ADMIN_HANDLE} is missing: run SEED_TEST_EVENT=1 bun run db:seed`);
  let session: TestSessionCookies | null = null;
  await expect(async () => {
    session = await realMode.signInAs(admin);
    expect((await request.get("/api/admin/events", { headers: sessionHeaders(session.cookieHeader) })).status()).toBe(200);
  }).toPass({ timeout: 20_000 });
  if (!session) throw new Error("the test admin could not sign in");
  return session;
}
