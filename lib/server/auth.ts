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

export async function requireAdmin(): Promise<UserRow> {
  const user = await requireUser();
  return user.isAdmin ? user : fail(E.notAdmin);
}
