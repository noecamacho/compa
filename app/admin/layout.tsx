import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/server/admin-page";

// A title without a template would reset the root "%s · Compa" for the admin pages below.
export const metadata: Metadata = { title: { default: "Admin", template: "%s · Compa" }, robots: { index: false, follow: false } };

// Super admins only; anyone else gets the plain 404 (API spec A11).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminPage();
  return children;
}
