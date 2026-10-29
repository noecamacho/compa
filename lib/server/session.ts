import "server-only";
import { headers } from "next/headers";
import { PATHNAME_HEADER } from "../pathname-header";
import { safeNext } from "../safe-next";
import { createSupabaseServerClient } from "./supabase";

// Whether the request belongs to a signed-in person. Mock mode has no sessions: everyone is Diego (lib/api/examples.ts).
export async function hasSession(): Promise<boolean> {
  if (process.env.API_MODE === "mock") return true;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return Boolean(data.user);
}

// Sign-in that comes back to `path`; an unsafe or missing path falls back to the welcome screen.
export function signInPath(path: string | null): string {
  const next = safeNext(path ?? undefined, "/");
  return next === "/" ? "/" : `/auth/linkedin?next=${encodeURIComponent(next)}`;
}

// Where a signed-out visitor to a session-only screen goes: sign-in, then back to the screen they asked for.
export async function signInForRequest(): Promise<string> {
  return signInPath((await headers()).get(PATHNAME_HEADER));
}
