import { describe, expect, test } from "bun:test";
import { scenarioFrames } from "@/lib/testing/live-scenarios";
import { FLOWERS, flowerX, flowers, grassCount, stemOf } from "./garden";

describe("garden", () => {
  test("flowers stay inside the stage and the leader is tallest", () => {
    const list = flowers(scenarioFrames("rush")[0]!);
    expect(list.length).toBe(FLOWERS);
    for (const flower of list) expect(flower.x).toBeGreaterThan(0.02);
    for (const flower of list) expect(flower.x).toBeLessThan(0.98);
    expect(Math.max(...list.map((flower) => flower.stem))).toBe(list[0]!.stem);
  });

  test("zero points still grows a stub", () => {
    expect(stemOf(0, 0)).toBeGreaterThan(0);
    expect(flowerX(1, 1)).toBeCloseTo(0.5, 1);
  });

  test("thousands become a capped lawn", () => {
    expect(grassCount(scenarioFrames("thousands")[0]!)).toBe(220);
    expect(grassCount(scenarioFrames("zero")[0]!)).toBe(0);
  });
});
