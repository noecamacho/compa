import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { users, type UserRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import { createSupabaseServerClient } from "./supabase";

export async function findUserByAuthId(authUserId: string): Promise<UserRow | undefined> {
  const [row] = await getDb().select().from(users).where(eq(users.authUserId, authUserId)).limit(1);
  return row;
}

// Resolves the signed-in `users` row from the Supabase session cookie, or fails with 401.
export async function requireUser(): Promise<UserRow> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail(E.unauthorized);
  const row = await findUserByAuthId(data.user.id);
  return row ?? fail(E.unauthorized);
}

// The signed-in person on a public route, or null without a session (never throws).
export async function currentUserOrNull(): Promise<UserRow | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return (await findUserByAuthId(data.user.id)) ?? null;
}

