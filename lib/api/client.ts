import type { z } from "zod";
import { apiErrors, common } from "../copy/es";

// Typed same-origin fetch for Client Components. The session cookie travels on its own.
export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type ErrorBody = { error?: { code?: string; message?: string; fields?: Record<string, string[]> } };

async function toError(response: Response): Promise<ApiClientError> {
  const body = (await response.json().catch(() => null)) as ErrorBody | null;
  return new ApiClientError(response.status, body?.error?.code ?? "unknown", body?.error?.message ?? response.statusText, body?.error?.fields);
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";
type Options = { timeoutMs?: number };

// Venue Wi-Fi drops and stalls: no request may hang forever, and a GET survives one blip.
export const DEFAULT_TIMEOUT_MS = 15_000;
const GET_RETRY_DELAY_MS = 800;

// Status 0 = the request never got an answer: offline, timed out, or the network failed.
export function networkError(error: unknown, online = typeof navigator === "undefined" || navigator.onLine !== false): ApiClientError {
  const name = error instanceof Error ? error.name : "";
  // Some Safari and Firefox builds reject a timed-out fetch with AbortError; nothing else aborts these requests.
  if (name === "TimeoutError" || name === "AbortError") return new ApiClientError(0, "timeout", "request timed out");
  if (!online) return new ApiClientError(0, "offline", "offline");
  return new ApiClientError(0, "network_error", error instanceof Error ? error.message : "network error");
}

// AbortSignal.timeout arrived in Safari 16; older phones simply get no timeout.
const timeoutSignal = (ms: number): AbortSignal | undefined => (typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(ms) : undefined);

async function send(method: Method, path: string, body: unknown, timeoutMs: number): Promise<Response> {
  return fetch(path, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: timeoutSignal(timeoutMs),
  }).catch((error: unknown) => {
    throw networkError(error);
  });
}

// Only reads retry, and only when the network failed outright: a retried write could apply twice, a retried 5xx adds load.
async function sendWithRetry(method: Method, path: string, body: unknown, timeoutMs: number): Promise<Response> {
  try {
    return await send(method, path, body, timeoutMs);
  } catch (error) {
    if (method !== "GET" || !(error instanceof ApiClientError) || error.code !== "network_error") throw error;
    await new Promise((resolve) => setTimeout(resolve, GET_RETRY_DELAY_MS));
    return send(method, path, body, timeoutMs);
  }
}

export async function apiCall<T extends z.ZodType>(method: Method, path: string, schema: T, body?: unknown, options: Options = {}): Promise<z.output<T>> {
  const response = await sendWithRetry(method, path, body, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!response.ok) throw await toError(response);
  if (response.status === 204) return schema.parse(undefined);
  return schema.parse(await response.json());
}

const FRIENDLY_CODES: Record<string, string | undefined> = { ...apiErrors.codes, rate_limited: common.rateLimited, limit_reached: common.limitReached };

// Any typed request failure: ApiClientError here, or the recorder's upload ApiError (lib/audio/recorder.ts).
const isFailure = (error: unknown): error is { status: number; code: string } =>
  error instanceof Error && "status" in error && typeof error.status === "number" && "code" in error && typeof error.code === "string";

// What the attendee reads: Spanish, actionable, never a raw server or browser message.
export function errorText(error: unknown): string {
  if (!isFailure(error)) return apiErrors.generic;
  const known = FRIENDLY_CODES[error.code];
  if (known) return known;
  if (error.status === 401) return apiErrors.signedOut;
  if (error.status === 429) return common.rateLimited;
  if (error.status >= 500) return apiErrors.server;
  return apiErrors.generic;
}
