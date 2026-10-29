// Super-admin gate (API spec A11). Anyone else, signed in or not, gets the plain 404 every unknown path gets,
// so the console cannot be discovered by probing.
import type { UserRow } from "../../db/schema";
import { isSuperAdmin } from "../roles";
import { E, fail } from "./errors";

export function requireSuperAdmin(user: UserRow | null): UserRow {
  if (!user || !isSuperAdmin(user)) return fail(E.notFound);
  return user;
}

// A test super admin (seeded for agents) manages test events and test people only; real data stays out of reach.
export const canManageEvent = (admin: Pick<UserRow, "isTest">, event: { isTest: boolean }): boolean => !admin.isTest || event.isTest;

export const canManageUser = (admin: Pick<UserRow, "isTest">, person: { isTest: boolean }): boolean => !admin.isTest || person.isTest;
