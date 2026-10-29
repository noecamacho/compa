import { MOCK_HEADERS } from "./mock-headers";

// Test-only: e2e specs set this cookie to inject a documented error into a server-rendered fetch (docs/flows/README.md
// "E2E tests"). It is honored only under API_MODE=mock, so production never reads it.
export const MOCK_ERROR_COOKIE = "compa-mock-error";

const ERROR_CODE = /^[a-z][a-z0-9_]{0,63}$/;

function cookieValue(cookieHeader: string, name: string): string | undefined {
  const pair = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return pair?.slice(name.length + 1);
}

// The mock headers server-side fetches add for this request: none outside mock mode.
export function mockHeadersFor(cookieHeader: string, apiMode = process.env.API_MODE): Record<string, string> {
  if (apiMode !== "mock") return {};
  const error = cookieValue(cookieHeader, MOCK_ERROR_COOKIE);
  if (!error || !ERROR_CODE.test(error)) return { [MOCK_HEADERS.mock]: "1" };
  return { [MOCK_HEADERS.mock]: "1", [MOCK_HEADERS.error]: error };
}
