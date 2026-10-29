import "server-only";
import { createSupabaseServerClient } from "./supabase";
import { isTestAuth, testSessionAuthId } from "./test-auth";

// Whether the request belongs to a signed-in person. Mock mode has no sessions: everyone is Diego (lib/api/examples.ts).
export async function hasSession(): Promise<boolean> {
  if (process.env.API_MODE === "mock") return true;
  if (isTestAuth()) return (await testSessionAuthId()) !== null;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return Boolean(data.user);
}
