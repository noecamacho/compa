"use client";

import { useCallback, useRef, useState } from "react";
import { LiveSnapshot, type LiveSnapshotT } from "@/lib/api/schemas";
import { nextLiveState, type Fetched, type LiveState } from "@/lib/live-state";
import { usePoll } from "@/lib/use-poll";

const POLL_MS = 3000;
// After the close nothing moves fast; the board still notices if an organizer reopens the event.
const ENDED_POLL_MS = 15_000;

async function fetchSnapshot(code: string, signal: AbortSignal): Promise<Fetched> {
  try {
    const response = await fetch(`/api/e/${code}/live`, { cache: "no-store", signal });
    if (response.status === 404) return { kind: "gone" };
    if (!response.ok) return { kind: "failed" };
    const parsed = LiveSnapshot.safeParse(await response.json());
    return parsed.success ? { kind: "ok", snapshot: parsed.data } : { kind: "failed" };
  } catch {
    return { kind: "failed" };
  }
}

const timeOf = (snapshot: LiveSnapshotT): number => Date.parse(snapshot.generatedAt);

// Polls the public snapshot through the shared poller (lib/use-poll.ts: one request at a time, 8 s timeout, backoff
// with jitter, paused in hidden tabs, immediate on return). Realtime is optional (API spec §8). An older snapshot (a CDN
// serving a stale copy) never replaces a newer one, and two answers in a row that do not move time forward (a stuck
// cache) read as a failure. A 404 means the code was rotated; polling continues so a code that answers again recovers.
export function useLiveSnapshot(code: string, initial: LiveSnapshotT): LiveState {
  const [state, setState] = useState<LiveState>(() => ({ snapshot: initial, stale: false, gone: false, updatedAt: Date.now(), staleForS: 0 }));
  const latest = useRef(initial);
  const stuck = useRef(0);

  // Out-of-order answers are dropped (null); a stuck run of them counts as a failure.
  const judge = useCallback((fetched: Fetched): Fetched | null => {
    if (fetched.kind !== "ok") return fetched;
    const step = timeOf(fetched.snapshot) - timeOf(latest.current);
    stuck.current = step > 0 ? 0 : stuck.current + 1;
    if (stuck.current >= 2) return { kind: "failed" };
    return step < 0 ? null : fetched;
  }, []);

  const tick = useCallback(
    async (signal: AbortSignal) => {
      const fetched = judge(await fetchSnapshot(code, signal));
      if (!fetched) return;
      if (fetched.kind === "ok") latest.current = fetched.snapshot;
      setState((current) => nextLiveState(current, fetched, Date.now()));
      // A failed poll throws so the shared poller backs off.
      if (fetched.kind !== "ok") throw new Error(`live poll ${fetched.kind}`);
    },
    [code, judge],
  );

  usePoll(tick, state.snapshot.event.phase === "ended" ? ENDED_POLL_MS : POLL_MS);
  return state;
}
