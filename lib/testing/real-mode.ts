// Real-mode test client (docs/testing/real-mode.md): create test users and sign in as them over HTTP with the
// automation header, no browser and no LinkedIn. Framework-agnostic so Playwright fixtures, bun scripts and agents
// share it. The secret only ever travels in the request header; it is never logged or put in an error.
import type { z } from "zod";
import { CreateTestUsersBody, TestSession, TestUserList, type TestUserT } from "../api/admin-schemas";
import { AUTOMATION_HEADER } from "../api/automation";

export type Cookie = { name: string; value: string; path: string; httpOnly: boolean; secure: boolean; sameSite: "Lax" | "Strict" | "None"; expires?: number };

export type TestSessionCookies = { user: TestUserT; cookies: Cookie[]; cookieHeader: string };

type Options = { baseUrl: string; secret: string; fetch?: typeof fetch };

export class RealModeError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly code: string,
  ) {
    super(`${path} answered ${status} ${code}`);
    this.name = "RealModeError";
  }
}

const SAME_SITE = { lax: "Lax", strict: "Strict", none: "None" } as const;

// One `Set-Cookie` header → a cookie a browser context (or a Cookie header) can carry.
export function parseSetCookie(header: string): Cookie {
  const [pair = "", ...attributes] = header.split(";").map((part) => part.trim());
  const split = pair.indexOf("=");
  const cookie: Cookie = { name: pair.slice(0, split), value: pair.slice(split + 1), path: "/", httpOnly: false, secure: false, sameSite: "Lax" };
  for (const attribute of attributes) {
    const [key = "", value = ""] = attribute.split("=");
    const name = key.toLowerCase();
    if (name === "path") cookie.path = value;
    if (name === "httponly") cookie.httpOnly = true;
    if (name === "secure") cookie.secure = true;
    if (name === "samesite") cookie.sameSite = SAME_SITE[value.toLowerCase() as keyof typeof SAME_SITE] ?? "Lax";
    if (name === "max-age") cookie.expires = Math.floor(Date.now() / 1000) + Number(value);
  }
  return cookie;
}

// Supabase clears old chunks with empty values; only cookies that still carry a session matter.
const liveCookies = (headers: Headers): Cookie[] => headers.getSetCookie().map(parseSetCookie).filter((cookie) => cookie.value !== "");

export const cookieHeaderOf = (cookies: Cookie[]): string => cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

export function realModeClient({ baseUrl, secret, fetch: doFetch = fetch }: Options) {
  const url = (path: string) => new URL(path, baseUrl).toString();
  const headers = (extra: Record<string, string> = {}) => ({ [AUTOMATION_HEADER]: secret, "Content-Type": "application/json", ...extra });

  async function send(method: string, path: string, body?: unknown): Promise<Response> {
    const response = await doFetch(url(path), { method, headers: headers(), body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
    if (response.ok) return response;
    const error = (await response.json().catch(() => null)) as { error?: { code?: string } } | null;
    throw new RealModeError(response.status, path, error?.error?.code ?? "unknown");
  }

  const parsed = async <T extends z.ZodType>(response: Response, schema: T): Promise<z.output<T>> => schema.parse(await response.json());

  return {
    async createTestUsers(body: z.input<typeof CreateTestUsersBody> = {}): Promise<TestUserT[]> {
      return (await parsed(await send("POST", "/api/admin/test-users", CreateTestUsersBody.parse(body)), TestUserList)).users;
    },
    async listTestUsers(handlePrefix?: string): Promise<TestUserT[]> {
      const query = handlePrefix ? `?handlePrefix=${encodeURIComponent(handlePrefix)}` : "";
      return (await parsed(await send("GET", `/api/admin/test-users${query}`), TestUserList)).users;
    },
    async deleteTestUser(id: string): Promise<void> {
      await send("DELETE", `/api/admin/test-users/${id}`);
    },
    // The session lives only in the response cookies; hand them to a browser context or send them as `Cookie`.
    async signInAs(user: TestUserT): Promise<TestSessionCookies> {
      const response = await send("POST", `/api/admin/test-users/${user.id}/session`);
      await parsed(response, TestSession);
      const cookies = liveCookies(response.headers);
      return { user, cookies, cookieHeader: cookieHeaderOf(cookies) };
    },
  };
}

export type RealModeClient = ReturnType<typeof realModeClient>;

// A request as a signed-in test user, for API-level scenarios (connect → accept → summary).
export async function asUser<T extends z.ZodType>(
  session: TestSessionCookies,
  { baseUrl, method, path, body, schema, fetch: doFetch = fetch }: { baseUrl: string; method: string; path: string; body?: unknown; schema: T; fetch?: typeof fetch },
): Promise<z.output<T>> {
  const response = await doFetch(new URL(path, baseUrl).toString(), {
    method,
    headers: { cookie: session.cookieHeader, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new RealModeError(response.status, path, ((await response.json().catch(() => null)) as { error?: { code?: string } } | null)?.error?.code ?? "unknown");
  return schema.parse(response.status === 204 ? undefined : await response.json());
}
