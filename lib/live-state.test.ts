import { describe, expect, test } from "bun:test";
import type { LiveSnapshotT } from "./api/schemas";
import { nextLiveState, type LiveState } from "./live-state";

const snapshot = (name: string): LiveSnapshotT => ({
  event: { code: "abcdef2345", name, isRunning: true },
  people: [],
  connections: [],
  counters: { checkedIn: 0, connections: 0, newCount: 0, reconnections: 0 },
  generatedAt: "2026-10-29T12:00:00.000Z",
});

const fresh: LiveState = { snapshot: snapshot("A"), stale: false, gone: false, updatedAt: 1_000, staleForS: 0 };

describe("nextLiveState", () => {
  test("a failed poll keeps the last snapshot and says how old it is", () => {
    const next = nextLiveState(fresh, { kind: "failed" }, 46_000);
    expect(next).toMatchObject({ stale: true, gone: false, staleForS: 45 });
    expect(next.snapshot.event.name).toBe("A");
  });

  test("a rotated code (404) keeps the board up instead of a not-found page", () => {
    const next = nextLiveState(fresh, { kind: "gone" }, 4_000);
    expect(next).toMatchObject({ stale: true, gone: true });
    expect(next.snapshot.event.name).toBe("A");
  });

  test("a network blip after a 404 still says the code changed", () => {
    const gone = nextLiveState(fresh, { kind: "gone" }, 4_000);
    expect(nextLiveState(gone, { kind: "failed" }, 7_000).gone).toBe(true);
  });

  test("the next good poll clears every outage flag", () => {
    const down = nextLiveState(fresh, { kind: "gone" }, 60_000);
    expect(nextLiveState(down, { kind: "ok", snapshot: snapshot("B") }, 63_000)).toEqual({
      snapshot: snapshot("B"),
      stale: false,
      gone: false,
      updatedAt: 63_000,
      staleForS: 0,
    });
  });
});
