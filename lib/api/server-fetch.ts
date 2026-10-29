import "server-only";
import { headers } from "next/headers";
import type { z } from "zod";
import { MOCK_HEADERS } from "./mock-headers";

// Server Components call the API over HTTP so pages and clients share one contract (lib/api/routes.ts).
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

async function originAndCookies(): Promise<{ origin: string; cookie: string }> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { origin: `${proto}://${host}`, cookie: h.get("cookie") ?? "" };
}

async function errorFrom(response: Response): Promise<ApiFetchError> {
  const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  return new ApiFetchError(response.status, body?.error?.code ?? "unknown", body?.error?.message ?? response.statusText);
}

type Options = { mockExample?: string };

export async function apiGet<T extends z.ZodType>(path: string, schema: T, options: Options = {}): Promise<z.output<T>> {
  const { origin, cookie } = await originAndCookies();
  const requestHeaders: Record<string, string> = { cookie };
  if (process.env.API_MODE === "mock") requestHeaders[MOCK_HEADERS.mock] = "1";
  if (options.mockExample) requestHeaders[MOCK_HEADERS.example] = options.mockExample;
  const response = await fetch(`${origin}${path}`, { headers: requestHeaders, cache: "no-store" });
  if (!response.ok) throw await errorFrom(response);
  return schema.parse(await response.json());
}

// Fire-and-forget POST from a page (e.g. claiming an invite after sign-in); failures are logged, never shown.
export async function apiPostQuietly(path: string, body: unknown = {}): Promise<void> {
  const { origin, cookie } = await originAndCookies();
  const requestHeaders: Record<string, string> = { cookie, "Content-Type": "application/json" };
  if (process.env.API_MODE === "mock") requestHeaders[MOCK_HEADERS.mock] = "1";
  const response = await fetch(`${origin}${path}`, { method: "POST", headers: requestHeaders, body: JSON.stringify(body), cache: "no-store" }).catch(() => null);
  if (!response?.ok) console.error("quiet post failed", path, response?.status);
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
