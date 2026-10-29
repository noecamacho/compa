import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { hasSession } from "@/lib/server/session";

// Every attendee screen needs a session; without one, back to the welcome screen.
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await hasSession())) redirect("/");
  return children;
}
