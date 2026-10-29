import "server-only";
import { createServerClient } from "@supabase/ssr";
import { isAuthApiError, isAuthError } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { E, fail } from "../api/errors";

function requireEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// Session-aware Supabase client for route handlers; Auth only, data goes through Drizzle (db/client.ts).
export async function createSupabaseServerClient() {
  const store = await cookies();
  return createServerClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  });
}

// Errors that mean "no valid session": missing, expired or forged JWT, or a refresh token Auth rejected (4xx).
// Anything else (network, timeout, 5xx, 429) means Auth could not answer, which is not the same as signed out.
export function isSignedOutError(error: unknown): boolean {
  if (!isAuthError(error)) return false;
  if (error.name === "AuthSessionMissingError" || error.name === "AuthInvalidJwtError") return true;
  const status = error.status ?? 0;
  return isAuthApiError(error) && status >= 400 && status < 500 && status !== 429;
}

// The signed-in Supabase user id, or null when signed out. getClaims() verifies the JWT locally against the cached
// JWKS (production signs with ES256), so a request does not call Supabase Auth unless the token needs a refresh.
// When Auth cannot answer it fails with 503, so a load spike never looks like a mass sign-out (conference-scale finding 1).
export async function authUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims().catch((thrown: unknown) => ({ data: null, error: thrown }));
  if (error && !isSignedOutError(error)) {
    console.error("auth unavailable", error);
    return fail(E.authUnavailable);
  }
  return data?.claims.sub ?? null;
}
