"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Props = { to: string };

// Sends a person with unfinished onboarding to the screen they still owe, then back to where they were going.
// Client-side because only the browser knows the full path and query of the screen it was opening.
export function OnboardingGate({ to }: Props) {
  const router = useRouter();
  useEffect(() => {
    const next = window.location.pathname + window.location.search;
    router.replace(`${to}?next=${encodeURIComponent(next)}`);
  }, [router, to]);
  return null;
}
