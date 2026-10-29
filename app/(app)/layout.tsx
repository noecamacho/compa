import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { MonitoGate } from "@/components/monito/MonitoGate";
import { DockHost } from "@/components/nav/Dock";
import { LiveNotifications } from "@/components/notifications/LiveNotifications";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { Me } from "@/lib/api/schemas";
import { apiGetSafe } from "@/lib/api/server-fetch";
import { isSuperAdmin } from "@/lib/roles";
import { requestLocale } from "@/lib/server/locale";
import { hasSession, signInForRequest } from "@/lib/server/session";

// Every attendee screen needs a session; without one, sign in and come back to the same screen (T-011).
// The dock sits here, outside the per-screen template, so it persists across navigations.
// From 1024 it becomes a left rail; `--rail` tells every Screen to center its content beside it (components/ui/Screen.tsx).
// Everyone builds a monito before using the app, even when signing in with a LinkedIn photo (team decision).
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await hasSession())) redirect(await signInForRequest());
  // A failed /api/me must not lock anyone out: no gate then, the screen handles its own error.
  const [me, locale] = await Promise.all([apiGetSafe("/api/me", Me), requestLocale()]);
  if (me && !me.avatar) return <MonitoGate />;
  const screens = (
    <div className="lg:[--rail:264px]">
      <OfflineBanner />
      {children}
      <DockHost admin={isSuperAdmin(me)} />
    </div>
  );
  // Notifications follow the person on every screen (T-080, T-081); without /api/me the screens still render.
  return me ? <LiveNotifications userId={me.id} locale={locale}>{screens}</LiveNotifications> : screens;
}
