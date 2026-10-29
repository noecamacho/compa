import "server-only";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { upsertLinkedInUser } from "./linkedin";
import { siteOrigin } from "./site";
import { createSupabaseServerClient } from "./supabase";

// `next` must be a same-site path: "/u/luis" yes; "//evil.com", "https://evil.com" or "/\\evil" no.
export function safeNext(next: string | undefined, fallback = "/me"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

// Mutable headers (unlike Response.redirect) so Next.js can append the Supabase session cookies.
const redirect = (location: string) => new Response(null, { status: 302, headers: { Location: location } });

const redirectTo = (req: Request, path: string) => redirect(new URL(path, siteOrigin(req)).toString());

const failedSignIn = (req: Request) => redirectTo(req, "/?error=signin");

export async function authLinkedin({ req, query }: InputOf<typeof R.authLinkedin>): ResultOf<typeof R.authLinkedin> {
  const callback = new URL("/auth/callback", siteOrigin(req));
  callback.searchParams.set("next", safeNext(query.next));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: { redirectTo: callback.toString() }, // Supabase already requests openid profile email for linkedin_oidc
  });
  if (error || !data.url) return failedSignIn(req);
  return redirect(data.url);
}

export async function authEmail({ req, body }: InputOf<typeof R.authEmail>): ResultOf<typeof R.authEmail> {
  const callback = new URL("/auth/callback", siteOrigin(req));
  callback.searchParams.set("next", safeNext(body.next));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ email: body.email, options: { emailRedirectTo: callback.toString() } });
  if (error) {
    console.error("Email sign-in link failed", error);
    return fail(E.internal);
  }
  return { status: 204 };
}

export async function authCallback({ req, query }: InputOf<typeof R.authCallback>): ResultOf<typeof R.authCallback> {
  if (!query.code || query.error) return failedSignIn(req);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(query.code);
  if (error || !data.user) return failedSignIn(req);
  const synced = await upsertLinkedInUser(data.user).catch((syncError: unknown) => {
    console.error("User sync failed", syncError);
    return null;
  });
  return synced ? redirectTo(req, safeNext(query.next)) : failedSignIn(req);
}

export async function signOut(): ResultOf<typeof R.signOut> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return { status: 204 };
}
