import "server-only";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { upsertLinkedInUser } from "./linkedin";
import { createSupabaseServerClient } from "./supabase";

// `next` must be a same-site path: "/u/luis" yes; "//evil.com", "https://evil.com" or "/\\evil" no.
export function safeNext(next: string | undefined, fallback = "/me"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

const siteOrigin = (req: Request) => process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(req.url).origin;

// Mutable headers (unlike Response.redirect) so Next.js can append the Supabase session cookies.
const redirect = (location: string) => new Response(null, { status: 302, headers: { Location: location } });

const redirectTo = (req: Request, path: string) => redirect(new URL(path, siteOrigin(req)).toString());

const failedSignIn = (req: Request) => redirectTo(req, "/?error=linkedin");

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

export async function authCallback({ req, query }: InputOf<typeof R.authCallback>): ResultOf<typeof R.authCallback> {
  if (!query.code || query.error) return failedSignIn(req);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(query.code);
  if (error || !data.user) return failedSignIn(req);
  const synced = await upsertLinkedInUser(data.user).catch((syncError: unknown) => {
    console.error("LinkedIn user sync failed", syncError);
    return null;
  });
  return synced ? redirectTo(req, safeNext(query.next)) : failedSignIn(req);
}

export async function signOut(): ResultOf<typeof R.signOut> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return { status: 204 };
}
