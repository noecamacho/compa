import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import type { z } from "zod";
import { findInProcessRoute } from "../server/in-process-routes";
import { mockHeadersFor } from "./mock-cookie";
import { MOCK_HEADERS } from "./mock-headers";

const REQUEST_ID_HEADER = "x-vercel-id";

// Server Components read the API through its route handlers, so pages and clients share one contract (lib/api/routes.ts).
// The handler runs in this process, not over HTTP: a self-fetch per section made every page render wait on more
// requests to the same instances, and 50 concurrent /home renders wedged them (conference-scale finding 5).
export class ApiFetchError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiFetchError";
  }
}

async function originAndCookies(): Promise<{ origin: string; cookie: string; requestId: string | null }> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { origin: `${proto}://${host}`, cookie: h.get("cookie") ?? "", requestId: h.get(REQUEST_ID_HEADER) };
}

async function errorFrom(response: Response): Promise<ApiFetchError> {
  const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  return new ApiFetchError(response.status, body?.error?.code ?? "unknown", body?.error?.message ?? response.statusText);
}

type Options = { mockExample?: string };

// Mock mode reaches the handler the same way it reached the API over HTTP: headers, plus the e2e error cookie.
// The page's request id travels along, so a route error logs under the same id as the page (lib/server/log.ts).
function requestHeaders(cookie: string, requestId: string | null, extra: Record<string, string> = {}): Record<string, string> {
  return { cookie, ...mockHeadersFor(cookie), ...(requestId ? { [REQUEST_ID_HEADER]: requestId } : {}), ...extra };
}

async function dispatch(method: "GET" | "POST", path: string, init: { headers: Record<string, string>; body?: string }, origin: string): Promise<Response> {
  const url = new URL(path, origin);
  const request = new Request(url, { method, headers: init.headers, body: init.body });
  const route = findInProcessRoute(method, url.pathname);
  if (route) return route.handler(request, { params: Promise.resolve(route.params) });
  // A page reading a route missing from lib/server/in-process-routes.ts still works, over HTTP as before.
  console.warn(`server-fetch: ${method} ${url.pathname} is not in lib/server/in-process-routes.ts; fetching over HTTP`);
  return fetch(request, { cache: "no-store" });
}

type Answer = { ok: true; json: unknown } | { ok: false; error: ApiFetchError };

// One call per path per render: the layout, the page and currentMe() share a single /api/me.
const getOnce = cache(async (path: string, mockExample: string | undefined): Promise<Answer> => {
  const { origin, cookie, requestId } = await originAndCookies();
  const extra: Record<string, string> = mockExample ? { [MOCK_HEADERS.example]: mockExample } : {};
  const response = await dispatch("GET", path, { headers: requestHeaders(cookie, requestId, extra) }, origin);
  if (!response.ok) return { ok: false, error: await errorFrom(response) };
  return { ok: true, json: await response.json() };
});

export async function apiGet<T extends z.ZodType>(path: string, schema: T, options: Options = {}): Promise<z.output<T>> {
  const answer = await getOnce(path, options.mockExample);
  if (!answer.ok) throw answer.error;
  return schema.parse(answer.json);
}

// Fire-and-forget POST from a page (e.g. claiming an invite after sign-in); failures are logged, never shown.
export async function apiPostQuietly(path: string, body: unknown = {}): Promise<void> {
  const { origin, cookie, requestId } = await originAndCookies();
  const init = { headers: requestHeaders(cookie, requestId, { "Content-Type": "application/json" }), body: JSON.stringify(body) };
  const response = await dispatch("POST", path, init, origin).catch((error: unknown) => {
    console.error("quiet post failed", path, error);
    return null;
  });
  if (response && !response.ok) console.error("quiet post failed", path, response.status);
}

// A missing resource becomes null so pages can `notFound()`; other failures still throw.
export async function apiGetOrNull<T extends z.ZodType>(path: string, schema: T, options?: Options): Promise<z.output<T> | null> {
  try {
    return await apiGet(path, schema, options);
  } catch (error) {
    if (error instanceof ApiFetchError && error.status === 404) return null;
    throw error;
  }
}

// Secondary data (invites, badges, boards): any failure renders that section empty instead of the error page.
export async function apiGetSafe<T extends z.ZodType>(path: string, schema: T, options?: Options): Promise<z.output<T> | null> {
  try {
    return await apiGet(path, schema, options);
  } catch (error) {
    console.error(`optional fetch failed: ${path}`, error);
    return null;
  }
}
