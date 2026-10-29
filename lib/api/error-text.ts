import type { Dictionary } from "../copy";

// Any typed request failure: the client's ApiClientError, or the recorder's upload ApiError (lib/audio/recorder.ts).
const isFailure = (error: unknown): error is { status: number; code: string } =>
  error instanceof Error && "status" in error && typeof error.status === "number" && "code" in error && typeof error.code === "string";

// What the attendee reads, in their language: actionable, never a raw server or browser message.
export function errorText({ apiErrors, common }: Pick<Dictionary, "apiErrors" | "common">, error: unknown): string {
  if (!isFailure(error)) return apiErrors.generic;
  const codes: Record<string, string | undefined> = { ...apiErrors.codes, rate_limited: common.rateLimited, limit_reached: common.limitReached };
  const known = codes[error.code];
  if (known) return known;
  if (error.status === 401) return apiErrors.signedOut;
  if (error.status === 429) return common.rateLimited;
  if (error.status >= 500) return apiErrors.server;
  return apiErrors.generic;
}
