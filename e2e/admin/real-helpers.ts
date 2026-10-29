// Helpers for the admin API real-mode spec: an HTTP client signed in as a test admin, and an optional SQL handle
// that only ever opens on a local database (docs/testing/real-mode.md).
import postgres from "postgres";
import { z } from "zod";
import { realModeClient, type RealModeClient, type TestSessionCookies } from "../../lib/testing/real-mode";

export const TEST_ADMIN_HANDLE = "codex-test-admin";

const ErrorBody = z.object({ error: z.object({ code: z.string() }) });

export type RawResponse = { status: number; body: unknown };

// A super-admin session sent as a Cookie header only: no automation header, so the admin gate sees this user.
export function adminApi(baseUrl: string, session: TestSessionCookies) {
  async function raw(method: string, path: string, body?: unknown): Promise<RawResponse> {
    const response = await fetch(new URL(path, baseUrl), {
      method,
      headers: { cookie: session.cookieHeader, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    const text = await response.text();
    return { status: response.status, body: text ? (JSON.parse(text) as unknown) : null };
  }

  async function ok<T extends z.ZodType>(method: string, path: string, schema: T, body?: unknown): Promise<z.output<T>> {
    const response = await raw(method, path, body);
    if (response.status >= 300) throw new Error(`${method} ${path} answered ${response.status}: ${JSON.stringify(response.body)}`);
    return schema.parse(response.body);
  }

  return {
    raw,
    get: <T extends z.ZodType>(path: string, schema: T) => ok("GET", path, schema),
    post: <T extends z.ZodType>(path: string, body: unknown, schema: T) => ok("POST", path, schema, body),
    // The error code of a refused request, checked against the expected status.
    async errorCode(method: string, path: string, status: number): Promise<string> {
      const response = await raw(method, path);
      if (response.status !== status) throw new Error(`${method} ${path}: expected ${status}, got ${response.status}: ${JSON.stringify(response.body)}`);
      return ErrorBody.parse(response.body).error.code;
    },
  };
}

export type AdminApi = ReturnType<typeof adminApi>;

export function harnessFor(baseUrl: string): RealModeClient {
  const secret = process.env.TEST_AUTOMATION_SECRET;
  if (!secret) throw new Error("TEST_AUTOMATION_SECRET is not set");
  return realModeClient({ baseUrl, secret });
}

export async function signInAsTestAdmin(harness: RealModeClient): Promise<TestSessionCookies> {
  const admin = (await harness.listTestUsers(TEST_ADMIN_HANDLE)).find((user) => user.handle === TEST_ADMIN_HANDLE);
  if (!admin) throw new Error(`@${TEST_ADMIN_HANDLE} is missing; run SEED_TEST_EVENT=1 bun run db:seed`);
  return harness.signInAs(admin);
}

// Lowercase, so it is valid in slugs and handles and survives the case-insensitive search.
export const runPrefix = (): string => `e2eadm-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;

export type Sql = postgres.Sql;

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

// Direct SQL is for seeding and cleaning up on a local database only. Unset → null (callers skip);
// set to anything else → throw, so a run never writes to a shared database behind the API's back.
export function localSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host)) throw new Error(`DATABASE_URL points at ${host}, not a local database; refusing direct SQL`);
  return postgres(url, { prepare: false, max: 1 });
}

export const ids = (rows: { id: string }[]): string[] => rows.map((row) => row.id);

export const sortedIds = (rows: { id: string }[]): string[] => ids(rows).sort();
