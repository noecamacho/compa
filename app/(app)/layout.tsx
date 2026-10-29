import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DockHost } from "@/components/nav/Dock";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { Me } from "@/lib/api/schemas";
import { apiGetSafe } from "@/lib/api/server-fetch";
import { pendingOnboarding } from "@/lib/onboarding";
import { hasSession } from "@/lib/server/session";

// Every attendee screen needs a session; without one, back to the welcome screen.
// The dock sits here, outside the per-screen template, so it persists across navigations.
// Everyone finishes onboarding first: job title and company (LinkedIn does not share them), then a monito,
// even when signing in with a LinkedIn photo (team decision).
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await hasSession())) redirect("/");
  // A failed /api/me must not lock anyone out: no gate then, the screen handles its own error.
  const me = await apiGetSafe("/api/me", Me);
  const pending = me && pendingOnboarding(me);
  if (pending) return <OnboardingGate to={pending} />;
  return (
    <>
      {children}
      <DockHost />
    </>
  );
}
