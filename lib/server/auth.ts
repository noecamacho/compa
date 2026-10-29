import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { users, type UserRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import { createSupabaseServerClient } from "./supabase";
import { isTestAuth, testSessionAuthId } from "./test-auth";

export async function findUserByAuthId(authUserId: string): Promise<UserRow | undefined> {
  const [row] = await getDb().select().from(users).where(eq(users.authUserId, authUserId)).limit(1);
  return row;
}

// The auth id of the session, from the test cookie (Playwright suite) or from Supabase.
async function sessionAuthId(): Promise<string | null> {
  if (isTestAuth()) return testSessionAuthId();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Resolves the signed-in `users` row from the session cookie, or fails with 401.
export async function requireUser(): Promise<UserRow> {
  const authId = await sessionAuthId();
  if (!authId) return fail(E.unauthorized);
  const row = await findUserByAuthId(authId);
  return row ?? fail(E.unauthorized);
}

// The signed-in person on a public route, or null without a session (never throws).
export async function currentUserOrNull(): Promise<UserRow | null> {
  const authId = await sessionAuthId();
  if (!authId) return null;
  return (await findUserByAuthId(authId)) ?? null;
}

export async function requireAdmin(): Promise<UserRow> {
  const user = await requireUser();
  return user.isAdmin ? user : fail(E.notAdmin);
}
