import "server-only";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { upsertLinkedInUser } from "./linkedin";
import { siteOrigin } from "./site";
import { createSupabaseServerClient } from "./supabase";
import { isTestAuth, sessionCookie, testLinkedInPage, testProfileFromQuery, upsertTestUser } from "./test-auth";

// `next` must be a same-site path: "/u/luis" yes; "//evil.com", "https://evil.com" or "/\\evil" no.
export function safeNext(next: string | undefined, fallback = "/me"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

// Mutable headers (unlike Response.redirect) so Next.js can append the Supabase session cookies.
const redirect = (location: string, headers: Record<string, string> = {}) =>
  new Response(null, { status: 302, headers: { Location: location, ...headers } });

const redirectTo = (req: Request, path: string, headers?: Record<string, string>) => redirect(new URL(path, siteOrigin(req)).toString(), headers);

const failedSignIn = (req: Request) => redirectTo(req, "/?error=linkedin");

// Test sign-in (lib/server/test-auth.ts): the stand-in consent page instead of linkedin.com.
function testLinkedIn(req: Request, next: string): Response {
  const prefill = Object.fromEntries(new URL(req.url).searchParams);
  return new Response(testLinkedInPage(next, prefill), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function testCallback(req: Request, next: string): Promise<Response> {
  const profile = testProfileFromQuery(req.url);
  if (!profile) return failedSignIn(req);
  const user = await upsertTestUser(profile);
  return redirectTo(req, next, { "Set-Cookie": sessionCookie(user.authUserId) });
}

export async function authLinkedin({ req, query }: InputOf<typeof R.authLinkedin>): ResultOf<typeof R.authLinkedin> {
  if (isTestAuth()) return testLinkedIn(req, safeNext(query.next));
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
  if (isTestAuth()) return testCallback(req, safeNext(query.next));
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
  if (isTestAuth()) return new Response(null, { status: 204, headers: { "Set-Cookie": sessionCookie(null) } });
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return { status: 204 };
}
