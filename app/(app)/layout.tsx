import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { MonitoGate } from "@/components/monito/MonitoGate";
import { DockHost } from "@/components/nav/Dock";
import { Me } from "@/lib/api/schemas";
import { apiGetSafe } from "@/lib/api/server-fetch";
import { hasSession } from "@/lib/server/session";

// Every attendee screen needs a session; without one, back to the welcome screen.
// The dock sits here, outside the per-screen template, so it persists across navigations.
// Everyone builds a monito before using the app, even when signing in with a LinkedIn photo (team decision).
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await hasSession())) redirect("/");
  // A failed /api/me must not lock anyone out: no gate then, the screen handles its own error.
  const me = await apiGetSafe("/api/me", Me);
  if (me && !me.avatar) return <MonitoGate />;
  return (
    <>
      {children}
      <DockHost />
    </>
  );
}
