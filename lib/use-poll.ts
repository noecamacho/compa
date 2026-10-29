import { useEffect, useRef } from "react";

export type Visibility = {
  visibilityState: DocumentVisibilityState;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
};

type PollOptions = { intervalMs: number; maxMs?: number; doc?: Visibility };

const MAX_BACKOFF_MS = 30_000;

// Doubles the wait after each failed tick, capped, so a broken API is not hammered every 3 s.
export const pollDelay = (intervalMs: number, failures: number, maxMs = MAX_BACKOFF_MS): number => Math.min(intervalMs * 2 ** failures, maxMs);

// Runs `tick` every `intervalMs` while the tab is visible (API spec §8 fallback). Returns a stop function.
export function startPolling(tick: () => Promise<unknown>, { intervalMs, maxMs, doc = document }: PollOptions): () => void {
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let inFlight = false;

  const schedule = (delay: number) => {
    clearTimeout(timer);
    if (stopped || doc.visibilityState === "hidden") return;
    timer = setTimeout(run, delay);
  };

  async function run() {
    inFlight = true;
    try {
      await tick();
      failures = 0;
    } catch {
      failures += 1;
    }
    inFlight = false;
    schedule(pollDelay(intervalMs, failures, maxMs));
  }

  // Coming back to the tab refreshes at once instead of waiting a full interval.
  const onVisibility = () => {
    if (doc.visibilityState === "hidden") return clearTimeout(timer);
    if (!inFlight) schedule(0);
  };

  doc.addEventListener("visibilitychange", onVisibility);
  schedule(intervalMs);
  return () => {
    stopped = true;
    clearTimeout(timer);
    doc.removeEventListener("visibilitychange", onVisibility);
  };
}

// React wrapper: a tick that throws counts as a failure and backs off.
export function usePoll(tick: () => Promise<unknown>, intervalMs: number): void {
  const latest = useRef(tick);
  useEffect(() => {
    latest.current = tick;
  });
  useEffect(() => startPolling(() => latest.current(), { intervalMs }), [intervalMs]);
}
