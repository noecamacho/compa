import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { users, type UserRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import { authUserId } from "./supabase";

export async function findUserByAuthId(authUserId: string): Promise<UserRow | undefined> {
  const [row] = await getDb().select().from(users).where(eq(users.authUserId, authUserId)).limit(1);
  return row;
}

// Resolves the signed-in `users` row from the Supabase session cookie, or fails with 401 (503 when Auth is down).
export async function requireUser(): Promise<UserRow> {
  const id = await authUserId();
  if (!id) return fail(E.unauthorized);
  const row = await findUserByAuthId(id);
  return row ?? fail(E.unauthorized);
}

// The signed-in person on a public route, or null without a session (never throws).
// An Auth outage degrades to the anonymous view here: public routes still answer, nobody is signed out.
export async function currentUserOrNull(): Promise<UserRow | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const id = await authUserId().catch(() => null);
  if (!id) return null;
  return (await findUserByAuthId(id)) ?? null;
}
