import { describe, expect, test } from "bun:test";
import { BUBBLE_COUNT, barRatio, bubbleY, flipDeltas, gainedIds, pointsById, raceRows } from "./race";
import type { BoardRow } from "./live-model";

const row = (id: string, points: number, rank = 1): BoardRow => ({ id, rank, name: id, photoUrl: null, points, connections: 0 });

describe("raceRows", () => {
  test("keeps the top eight in order", () => {
    const rows = Array.from({ length: 12 }, (_, index) => row(`p${index}`, 100 - index));
    expect(raceRows(rows).map((item) => item.id)).toEqual(["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7"]);
  });
});

describe("barRatio", () => {
  test("is points over the leader's, floored and capped", () => {
    expect(barRatio(50, 100)).toBe(0.5);
    expect(barRatio(100, 100)).toBe(1);
    expect(barRatio(0, 100)).toBe(0.04);
    expect(barRatio(0, 0)).toBe(0.04);
  });
});

describe("gainedIds", () => {
  const rows = [row("a", 30), row("b", 20), row("c", 10)];
  test("ignores the first snapshot", () => {
    expect(gainedIds(null, rows)).toEqual([]);
  });
  test("lists only rows whose points rose; a new person is not a gain", () => {
    const previous = pointsById([row("a", 30), row("b", 10)]);
    expect(gainedIds(previous, rows)).toEqual(["b"]);
  });
});

describe("flipDeltas", () => {
  test("gives previous minus new top for rows that moved", () => {
    const previous = new Map([["a", 0], ["b", 50], ["c", 100]]);
    const next = new Map([["b", 0], ["a", 50], ["c", 100], ["d", 150]]);
    expect([...flipDeltas(previous, next)]).toEqual([["b", 50], ["a", -50]]);
  });
});

describe("bubbleY", () => {
  test("stays within the track plus its margins and keeps moving", () => {
    for (let index = 0; index < BUBBLE_COUNT; index++) {
      const y = bubbleY(index, 3.2, 400);
      expect(y).toBeGreaterThan(-21);
      expect(y).toBeLessThanOrEqual(420);
      expect(bubbleY(index, 3.3, 400)).not.toBe(y);
    }
  });
});
