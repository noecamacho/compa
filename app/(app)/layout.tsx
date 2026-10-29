import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DockHost } from "@/components/nav/Dock";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { hasSession } from "@/lib/server/session";

// Every attendee screen needs a session; without one, back to the welcome screen.
// The dock sits here, outside the per-screen template, so it persists across navigations.
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await hasSession())) redirect("/");
  return (
    <>
      <OfflineBanner />
      {children}
      <DockHost />
    </>
  );
}
