import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { hasSession } from "@/lib/server/session";

// Onboarding (02, 02b) needs a session but sits outside the (app) layout, whose monito gate sends people here.
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  if (!(await hasSession())) redirect("/");
  return children;
}
