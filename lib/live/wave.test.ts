import { describe, expect, test } from "bun:test";
import type { LiveSnapshotT } from "@/lib/api/schemas";
import { approach, freshLinks, Heartbeat, idsOf, NEW, NONE, RECONNECTION, SAMPLE_RATE, SAMPLES, slotCounts, spikeAmp } from "./wave";

type Links = LiveSnapshotT["connections"];

const NOW = Date.parse("2026-10-29T12:00:00.000Z");
const link = (id: string, secondsAgo: number, kind: "new" | "reconnection" = "new"): Links[number] => ({
  id,
  a: "a",
  b: "b",
  kind,
  at: new Date(NOW - secondsAgo * 1000).toISOString(),
});

const peak = (beat: Heartbeat) => Math.max(...Array.from({ length: SAMPLES }, (_, index) => beat.valueAt(index)));

describe("spikeAmp", () => {
  test("grows with the crowd and saturates at one", () => {
    expect(spikeAmp(1)).toBeCloseTo(0.4);
    expect(spikeAmp(4)).toBeGreaterThan(spikeAmp(2));
    expect(spikeAmp(500)).toBeLessThanOrEqual(1);
  });
});

describe("slotCounts", () => {
  test("puts the newest link in the last slot and skips what is older than the window", () => {
    const slots = slotCounts([link("old", 3600), link("x", 1), link("y", 2, "reconnection"), link("z", 3, "reconnection")], NOW, 300_000, 10);
    expect(slots).toHaveLength(10);
    expect(slots.at(-1)).toEqual({ count: 3, kind: RECONNECTION });
    expect(slots.reduce((sum, slot) => sum + slot.count, 0)).toBe(3);
  });
});

describe("freshLinks", () => {
  test("ignores the first snapshot and counts only unseen ids afterwards", () => {
    const first = [link("a", 10), link("b", 5)];
    expect(freshLinks(null, first)).toEqual({ news: 0, reconnections: 0 });
    const next = [...first, link("c", 1), link("d", 1, "reconnection")];
    expect(freshLinks(idsOf(first), next)).toEqual({ news: 1, reconnections: 1 });
  });
});

describe("approach", () => {
  test("moves toward the target without overshooting", () => {
    const value = approach(0, 10, 0.016, 6);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(10);
  });
});

describe("Heartbeat", () => {
  test("seeds one coloured spike per busy slot", () => {
    const beat = new Heartbeat();
    beat.seed([{ count: 0, kind: NEW }, { count: 5, kind: RECONNECTION }]);
    expect(peak(beat)).toBeGreaterThan(0.7);
    const kinds = new Set(Array.from({ length: SAMPLES }, (_, index) => beat.kindAt(index)));
    expect(kinds).toEqual(new Set([NONE, RECONNECTION]));
  });

  test("stays flat-ish and starts nothing while idle, yet keeps scrolling", () => {
    const beat = new Heartbeat();
    beat.seed([]);
    const before = beat.valueAt(SAMPLES - 1);
    expect(beat.advance(1)).toBeNull();
    expect(peak(beat)).toBeLessThan(0.15);
    expect(beat.valueAt(SAMPLES - 1)).not.toBe(before);
  });

  test("an arrival begins a beat on the right edge, taller for a crowd", () => {
    const beat = new Heartbeat();
    beat.seed([]);
    beat.add(NEW, 1);
    const single = beat.advance(1.01 / SAMPLE_RATE);
    expect(single).toEqual({ amp: spikeAmp(1), kind: NEW });
    beat.advance(1);
    beat.add(RECONNECTION, 6);
    const crowd = beat.advance(1.01 / SAMPLE_RATE);
    expect(crowd?.kind).toBe(RECONNECTION);
    expect(crowd?.amp).toBeGreaterThan(single?.amp ?? 1);
  });

  test("queued arrivals while a beat is running wait for the next one", () => {
    const beat = new Heartbeat();
    beat.seed([]);
    beat.add(NEW, 1);
    beat.advance(1.01 / SAMPLE_RATE);
    beat.add(NEW, 1);
    expect(beat.advance(2.01 / SAMPLE_RATE)).toBeNull();
    expect(beat.advance(1)).not.toBeNull();
  });
});
