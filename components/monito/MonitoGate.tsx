"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Sends a person who never saved a monito to 02b first, then back to where they were going.
// Client-side because only the browser knows the full path and query of the screen it was opening.
export function MonitoGate() {
  const router = useRouter();
  useEffect(() => {
    const next = window.location.pathname + window.location.search;
    router.replace(`/onboarding/monito?next=${encodeURIComponent(next)}`);
  }, [router]);
  return null;
}
