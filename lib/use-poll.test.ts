import { describe, expect, test } from "bun:test";
import { pollDelay, startPolling, type Visibility } from "./use-poll";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fakeDocument(): Visibility & { set(state: DocumentVisibilityState): void; listeners: Set<() => void> } {
  const listeners = new Set<() => void>();
  return {
    visibilityState: "visible",
    addEventListener: (_, fn) => void listeners.add(fn),
    removeEventListener: (_, fn) => void listeners.delete(fn),
    set(state: DocumentVisibilityState) {
      this.visibilityState = state;
      for (const fn of listeners) fn();
    },
    listeners,
  };
}

describe("pollDelay", () => {
  test("keeps the interval while ticks succeed", () => expect(pollDelay(3000, 0)).toBe(3000));
  test("doubles after each failure, capped", () => {
    expect(pollDelay(3000, 1)).toBe(6000);
    expect(pollDelay(3000, 2)).toBe(12000);
    expect(pollDelay(3000, 10)).toBe(30000);
  });
});

describe("startPolling", () => {
  test("ticks on the interval and stops cleanly", async () => {
    const doc = fakeDocument();
    let ticks = 0;
    const stop = startPolling(async () => ticks++, { intervalMs: 10, doc });
    await sleep(55);
    stop();
    const seen = ticks;
    expect(seen).toBeGreaterThanOrEqual(3);
    await sleep(30);
    expect(ticks).toBe(seen);
    expect(doc.listeners.size).toBe(0);
  });

  test("pauses while the tab is hidden and refreshes on return", async () => {
    const doc = fakeDocument();
    let ticks = 0;
    const stop = startPolling(async () => ticks++, { intervalMs: 10, doc });
    doc.set("hidden");
    await sleep(40);
    expect(ticks).toBe(0);
    doc.set("visible");
    await sleep(5);
    expect(ticks).toBe(1);
    stop();
  });

  test("backs off after failures", async () => {
    const doc = fakeDocument();
    let ticks = 0;
    const stop = startPolling(
      async () => {
        ticks++;
        throw new Error("down");
      },
      { intervalMs: 10, maxMs: 1000, doc },
    );
    await sleep(80); // waits 10, 20, 40: three ticks, not eight
    stop();
    expect(ticks).toBeLessThanOrEqual(3);
  });
});
