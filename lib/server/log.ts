// Structured server error logs: one JSON line per failure, so Vercel's log search can filter by requestId or route.
// No `server-only` import: instrumentation.ts and unit tests load this too.
const REQUEST_ID_HEADERS = ["x-vercel-id", "x-request-id"] as const;

export type ErrorLogFields = {
  event: string;
  error: unknown;
  requestId: string;
  method: string;
  path: string;
  status?: number;
  digest?: string;
};

// Vercel stamps every request with x-vercel-id; locally a random id keeps the log line and the response header linkable.
export function requestIdFrom(headers: Headers): string {
  for (const name of REQUEST_ID_HEADERS) {
    const value = headers.get(name);
    if (value) return value;
  }
  return crypto.randomUUID();
}

// The query string is dropped: it can carry tokens and is never needed to find the route.
export const pathOnly = (url: string): string => new URL(url, "http://local").pathname;

function describe(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  return { name: "NonError", message: String(error) };
}

export function formatErrorLog({ error, ...fields }: ErrorLogFields): string {
  return JSON.stringify({ level: "error", time: new Date().toISOString(), ...fields, error: describe(error) });
}

export const logError = (fields: ErrorLogFields): void => console.error(formatErrorLog(fields));
