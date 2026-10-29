import "server-only";
import { notFound } from "next/navigation";
import { Me, type MeT } from "../api/schemas";
import { apiGet } from "../api/server-fetch";
import { copyFor, type Dictionary } from "../copy";
import type { Locale } from "../i18n";
import { isSuperAdmin } from "../roles";
import { requestLocale } from "./locale";
import { hasSession } from "./session";

// Every /admin page: a super admin, or the same 404 an unknown path gets (A11). The API gates again on its own.
export async function requireAdminPage(): Promise<MeT> {
  if (!(await hasSession())) notFound();
  // In mock mode the named example stands in for a super admin; real mode ignores the example header.
  const me = await apiGet("/api/me", Me, { mockExample: "superAdmin" }).catch(() => null);
  if (!me || !isSuperAdmin(me)) notFound();
  return me;
}

export async function adminCopy(): Promise<{ locale: Locale; copy: Dictionary["admin"] }> {
  const locale = await requestLocale();
  return { locale, copy: copyFor(locale).admin };
}
