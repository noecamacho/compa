import { describe, expect, test } from "bun:test";
import { pollDelay, startPolling, withJitter, type Visibility } from "./use-poll";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const noJitter = () => 0.5;

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

describe("withJitter", () => {
  test("stays within ±20 %", () => {
    expect(withJitter(5000, () => 0)).toBe(4000);
    expect(withJitter(5000, () => 0.5)).toBe(5000);
    expect(withJitter(5000, () => 1)).toBe(6000);
  });
});

describe("startPolling", () => {
  test("ticks on the interval and stops cleanly", async () => {
    const doc = fakeDocument();
    let ticks = 0;
    const stop = startPolling(async () => ticks++, { intervalMs: 10, doc, random: noJitter });
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
    const stop = startPolling(async () => ticks++, { intervalMs: 10, doc, random: noJitter });
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
    const fail = async () => {
      ticks++;
      throw new Error("down");
    };
    const stop = startPolling(fail, { intervalMs: 10, maxMs: 1000, doc, random: noJitter });
    await sleep(80); // waits 10, 20, 40: three ticks, not eight
    stop();
    expect(ticks).toBeLessThanOrEqual(3);
  });

  test("never overlaps ticks and aborts one that hangs past the timeout", async () => {
    const doc = fakeDocument();
    let running = 0;
    let most = 0;
    let aborts = 0;
    const hang = (signal: AbortSignal) =>
      new Promise((resolve) => {
        running++;
        most = Math.max(most, running);
        signal.addEventListener("abort", () => {
          aborts++;
          running--;
          resolve(null);
        });
      });
    const stop = startPolling(hang, { intervalMs: 5, timeoutMs: 15, maxMs: 5, doc, random: noJitter });
    await sleep(70);
    stop();
    expect(most).toBe(1);
    expect(aborts).toBeGreaterThanOrEqual(2);
  });

  test("a returning tab does not start a second tick while one is in flight", async () => {
    const doc = fakeDocument();
    let started = 0;
    const stop = startPolling(
      () => {
        started++;
        return sleep(30);
      },
      { intervalMs: 5, doc, random: noJitter },
    );
    await sleep(10);
    doc.set("hidden");
    doc.set("visible");
    await sleep(5);
    expect(started).toBe(1);
    stop();
  });
});
