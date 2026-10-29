"use client";

import { useEffect, useState } from "react";
import { LiveSnapshot, type LiveSnapshotT } from "@/lib/api/schemas";
import { nextLiveState, type Fetched, type LiveState } from "@/lib/live-state";

const POLL_MS = 3000;
// After the close nothing moves fast; the board still notices if an organizer reopens the event.
const ENDED_POLL_MS = 15_000;
// Failed polls back off (3, 6, 12, 24, 30 s) so a venue whose network drops is not hammered when it returns.
const MAX_BACKOFF_MS = 30_000;
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

const delayFor = (snapshot: LiveSnapshotT, failures: number): number =>
  failures > 0 ? Math.min(MAX_BACKOFF_MS, POLL_MS * 2 ** failures) : snapshot.event.phase === "ended" ? ENDED_POLL_MS : POLL_MS;

const timeOf = (snapshot: LiveSnapshotT): number => Date.parse(snapshot.generatedAt);

// Polls the public snapshot while the tab is visible (Realtime is optional, API spec §8), one request at a time, and
// polls again at once when the tab or the network comes back. An older snapshot (a CDN serving a stale copy) never
// replaces a newer one, and two answers in a row that do not move time forward (a stuck cache) read as a failure.
// A 404 means the code was rotated; polling continues so a code that answers again recovers on its own.
export function useLiveSnapshot(code: string, initial: LiveSnapshotT): LiveState {
  const [state, setState] = useState<LiveState>(() => ({ snapshot: initial, stale: false, gone: false, updatedAt: Date.now(), staleForS: 0 }));

  useEffect(() => {
    let active = true;
    let timer = 0;
    let failures = 0;
    let stuck = 0;
    let latest = initial;
    let inFlight = false;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(poll, delayFor(latest, failures));
    };
    // Out-of-order answers are dropped (null); a stuck run of them counts as a failure.
    const judge = (fetched: Fetched): Fetched | null => {
      if (fetched.kind !== "ok") return fetched;
      const step = timeOf(fetched.snapshot) - timeOf(latest);
      stuck = step > 0 ? 0 : stuck + 1;
      if (stuck >= 2) return { kind: "failed" };
      return step < 0 ? null : fetched;
    };
    const poll = async () => {
      if (document.visibilityState === "hidden" || inFlight) return schedule();
      inFlight = true;
      const fetched = judge(await fetchSnapshot(code));
      inFlight = false;
      if (!active) return;
      failures = fetched && fetched.kind !== "ok" ? failures + 1 : 0;
      if (fetched?.kind === "ok") latest = fetched.snapshot;
      if (fetched) setState((current) => nextLiveState(current, fetched, Date.now()));
      schedule();
    };
    const pollNow = () => {
      if (document.visibilityState === "hidden") return;
      window.clearTimeout(timer);
      void poll();
    };
    schedule();
    document.addEventListener("visibilitychange", pollNow);
    window.addEventListener("online", pollNow);
    return () => {
      active = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", pollNow);
      window.removeEventListener("online", pollNow);
    };
  }, [code, initial]);

  return state;
}
