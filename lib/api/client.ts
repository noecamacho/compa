import type { z } from "zod";

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
// `signal` lets a poller cut a call itself (lib/use-poll.ts); it then replaces the default timeout.
type Options = { timeoutMs?: number; signal?: AbortSignal };

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

async function send(method: Method, path: string, body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<Response> {
  return fetch(path, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal ?? timeoutSignal(timeoutMs),
  }).catch((error: unknown) => {
    throw networkError(error);
  });
}

// Only reads retry, and only when the network failed outright: a retried write could apply twice, a retried 5xx adds load.
async function sendWithRetry(method: Method, path: string, body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<Response> {
  try {
    return await send(method, path, body, timeoutMs, signal);
  } catch (error) {
    if (method !== "GET" || !(error instanceof ApiClientError) || error.code !== "network_error") throw error;
    if (signal?.aborted) throw error;
    await new Promise((resolve) => setTimeout(resolve, GET_RETRY_DELAY_MS));
    return send(method, path, body, timeoutMs, signal);
  }
}

export async function apiCall<T extends z.ZodType>(method: Method, path: string, schema: T, body?: unknown, options: Options = {}): Promise<z.output<T>> {
  const response = await sendWithRetry(method, path, body, options.timeoutMs ?? DEFAULT_TIMEOUT_MS, options.signal);
  if (!response.ok) throw await toError(response);
  if (response.status === 204) return schema.parse(undefined);
  return schema.parse(await response.json());
}
