import { useEffect, useRef } from "react";

export type Visibility = {
  visibilityState: DocumentVisibilityState;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
};

type PollOptions = { intervalMs: number; maxMs?: number; timeoutMs?: number; doc?: Visibility; random?: () => number };

const MAX_BACKOFF_MS = 30_000;
const TICK_TIMEOUT_MS = 8_000;
const JITTER = 0.2;

// Doubles the wait after each failed tick, capped, so a broken API is not hammered every 3 s.
export const pollDelay = (intervalMs: number, failures: number, maxMs = MAX_BACKOFF_MS): number => Math.min(intervalMs * 2 ** failures, maxMs);

// ±20 %, so a room of phones that opened at the same moment (a stage announcement) does not poll in lockstep.
export const withJitter = (ms: number, random: () => number = Math.random): number => Math.round(ms * (1 - JITTER + 2 * JITTER * random()));

// Runs `tick` every `intervalMs` while the tab is visible (API spec §8 fallback; conference-scale finding 3).
// One tick at a time; a tick that throws or outlives `timeoutMs` is aborted and backs off. Returns a stop function.
export function startPolling(
  tick: (signal: AbortSignal) => Promise<unknown>,
  { intervalMs, maxMs, timeoutMs = TICK_TIMEOUT_MS, doc = document, random = Math.random }: PollOptions,
): () => void {
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let inFlight: AbortController | null = null;

  const schedule = (delay: number) => {
    clearTimeout(timer);
    if (stopped || doc.visibilityState === "hidden") return;
    timer = setTimeout(run, withJitter(delay, random));
  };

  async function run() {
    const controller = new AbortController();
    inFlight = controller;
    const deadline = setTimeout(() => controller.abort(), timeoutMs);
    const aborted = new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error("poll aborted"))));
    try {
      await Promise.race([tick(controller.signal), aborted]);
      failures = 0;
    } catch {
      failures += 1;
    }
    clearTimeout(deadline);
    inFlight = null;
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
    inFlight?.abort();
    doc.removeEventListener("visibilitychange", onVisibility);
  };
}

// React wrapper: a tick that throws counts as a failure and backs off. Pass the signal to fetch so a hung call is cut.
export function usePoll(tick: (signal: AbortSignal) => Promise<unknown>, intervalMs: number): void {
  const latest = useRef(tick);
  useEffect(() => {
    latest.current = tick;
  });
  useEffect(() => startPolling((signal) => latest.current(signal), { intervalMs }), [intervalMs]);
}
