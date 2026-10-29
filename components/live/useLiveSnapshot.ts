"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LiveSnapshot, type LiveSnapshotT } from "@/lib/api/schemas";

const POLL_MS = 3000;

type State = { snapshot: LiveSnapshotT; stale: boolean };

async function fetchSnapshot(code: string): Promise<LiveSnapshotT | "gone" | null> {
  try {
    const response = await fetch(`/api/e/${code}/live`, { cache: "no-store" });
    if (response.status === 404) return "gone";
    if (!response.ok) return null;
    const parsed = LiveSnapshot.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// Polls the public snapshot every 3 s while the tab is visible (Realtime is optional, API spec §8).
// A 404 means the code was rotated: re-render the page, which then shows the not-found door.
export function useLiveSnapshot(code: string, initial: LiveSnapshotT): State {
  const router = useRouter();
  const [state, setState] = useState<State>({ snapshot: initial, stale: false });

  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (document.visibilityState === "hidden") return;
      const next = await fetchSnapshot(code);
      if (!active) return;
      if (next === "gone") return router.refresh();
      setState((current) => (next ? { snapshot: next, stale: false } : { ...current, stale: true }));
    };
    const timer = window.setInterval(poll, POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [code, router]);

  return state;
}
