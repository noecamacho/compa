import type { z } from "zod";
import { common } from "../copy/es";

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

export async function apiCall<T extends z.ZodType>(method: Method, path: string, schema: T, body?: unknown): Promise<z.output<T>> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch((error: unknown) => {
    throw new ApiClientError(0, "network_error", error instanceof Error ? error.message : "network error");
  });
  if (!response.ok) throw await toError(response);
  if (response.status === 204) return schema.parse(undefined);
  return schema.parse(await response.json());
}

// Text for a caught error: known codes get their own copy, anything else keeps the server message.
export function errorText(caught: unknown): string {
  if (caught instanceof ApiClientError && caught.code === "rate_limited") return common.rateLimited;
  return caught instanceof Error ? caught.message : String(caught);
}
