import type { LiveSnapshotT } from "./api/schemas";

// stale: the last poll failed; gone: the code answers 404 (rotated); staleForS: seconds since the last good snapshot.
export type LiveState = { snapshot: LiveSnapshotT; stale: boolean; gone: boolean; updatedAt: number; staleForS: number };
export type Fetched = { kind: "ok"; snapshot: LiveSnapshotT } | { kind: "gone" } | { kind: "failed" };

// A failed or 404 poll keeps the last snapshot on screen: a projector never falls to a not-found page or a blank one.
export function nextLiveState(current: LiveState, fetched: Fetched, now: number): LiveState {
  if (fetched.kind === "ok") return { snapshot: fetched.snapshot, stale: false, gone: false, updatedAt: now, staleForS: 0 };
  const staleForS = Math.max(0, Math.round((now - current.updatedAt) / 1000));
  // Once the code answered 404, a later network blip keeps saying "code changed" rather than flipping to "reconnecting".
  return { ...current, stale: true, gone: fetched.kind === "gone" || current.gone, staleForS };
}
