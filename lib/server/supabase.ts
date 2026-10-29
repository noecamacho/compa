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
      // Server Components cannot set cookies; a refreshed session is persisted by route handlers instead (Supabase SSR pattern).
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

// Errors that mean "no valid session": missing, expired, forged or unreadable JWT, or a refresh token Auth rejected (4xx).
// Anything else (network, timeout, 5xx, 429) means Auth could not answer, which is not the same as signed out.
export function isSignedOutError(error: unknown): boolean {
  // A cookie whose JWT payload is not JSON fails to decode; it will never verify, so it is no session.
  if (error instanceof SyntaxError) return true;
  if (!isAuthError(error)) return false;
  if (error.name === "AuthSessionMissingError" || error.name === "AuthInvalidJwtError") return true;
  const status = error.status ?? 0;
  return isAuthApiError(error) && status >= 400 && status < 500 && status !== 429;
}

// The part of the Supabase Auth client this module reads; the real client satisfies it.
export type ClaimsReader = { getClaims(): Promise<{ data: { claims: { sub?: string } } | null; error: unknown }> };

// The signed-in Supabase user id, or null when signed out. getClaims() verifies the JWT locally against the cached
// JWKS (production signs with ES256), so a request does not call Supabase Auth unless the token needs a refresh.
// When Auth cannot answer it fails with 503, so a load spike never looks like a mass sign-out (conference-scale finding 1).
export async function authUserIdFrom(auth: ClaimsReader): Promise<string | null> {
  const { data, error } = await auth.getClaims().catch((thrown: unknown) => ({ data: null, error: thrown }));
  if (error && !isSignedOutError(error)) {
    console.error("auth unavailable", error);
    return fail(E.authUnavailable);
  }
  return data?.claims.sub ?? null;
}

export async function authUserId(): Promise<string | null> {
  return authUserIdFrom((await createSupabaseServerClient()).auth);
}
