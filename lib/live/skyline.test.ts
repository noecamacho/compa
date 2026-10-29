import { describe, expect, test } from "bun:test";
import { scenarioFrames } from "@/lib/testing/live-scenarios";
import { BUILDINGS_MAX, MAX_FLOORS, buildings, floorsOf, gridSize, placeOf } from "./skyline";

describe("skyline", () => {
  test("every building has its own cell and the leader the most floors", () => {
    const city = buildings(scenarioFrames("thousands")[0]!);
    expect(city.length).toBe(BUILDINGS_MAX);
    const cells = new Set(city.map((building) => `${building.col},${building.row}`));
    expect(cells.size).toBe(city.length);
    expect(city[0]!.floors).toBe(MAX_FLOORS);
    expect(city[0]!.row).toBe(0);
  });

  test("zero points still stands one floor; the grid fits the count", () => {
    expect(floorsOf(0, 0)).toBe(1);
    expect(floorsOf(0, 50)).toBe(1);
    expect(gridSize(1)).toBe(2);
    expect(gridSize(72)).toBe(9);
    for (let rank = 1; rank <= 81; rank++) {
      const place = placeOf(rank, 9);
      expect(place.col).toBeGreaterThanOrEqual(0);
      expect(place.col).toBeLessThan(9);
    }
  });
});
