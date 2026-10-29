"use client";

import { useEffect, useState } from "react";
import { LiveSnapshot, type LiveSnapshotT } from "@/lib/api/schemas";
import { nextLiveState, type Fetched, type LiveState } from "@/lib/live-state";

const POLL_MS = 3000;
// A hung request must not freeze the screen: past this the poll counts as failed and the stale pill shows.
const FETCH_TIMEOUT_MS = 8000;

const timeoutSignal = (): AbortSignal | undefined =>
  typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(FETCH_TIMEOUT_MS) : undefined;

async function fetchSnapshot(code: string): Promise<Fetched> {
  try {
    const response = await fetch(`/api/e/${code}/live`, { cache: "no-store", signal: timeoutSignal() });
    if (response.status === 404) return { kind: "gone" };
    if (!response.ok) return { kind: "failed" };
    const parsed = LiveSnapshot.safeParse(await response.json());
    return parsed.success ? { kind: "ok", snapshot: parsed.data } : { kind: "failed" };
  } catch {
    return { kind: "failed" };
  }
}

// Polls the public snapshot every 3 s while the tab is visible (Realtime is optional, API spec §8).
// One request at a time: the next poll is scheduled only after the previous one settles.
// A 404 means the code was rotated; polling continues so a code that answers again recovers on its own.
export function useLiveSnapshot(code: string, initial: LiveSnapshotT): LiveState {
  const [state, setState] = useState<LiveState>(() => ({ snapshot: initial, stale: false, gone: false, updatedAt: Date.now(), staleForS: 0 }));

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const poll = async () => {
      if (document.visibilityState !== "hidden") {
        const fetched = await fetchSnapshot(code);
        if (!active) return;
        setState((current) => nextLiveState(current, fetched, Date.now()));
      }
      timer = window.setTimeout(poll, POLL_MS);
    };
    timer = window.setTimeout(poll, POLL_MS);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [code]);

  return state;
}
