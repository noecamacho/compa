import { describe, expect, test } from "bun:test";
import { DEFAULT_ROTATE_SECONDS, VIZ_IDS, firstViz, nextViz, rotationFrom } from "./rotation";

describe("rotationFrom", () => {
  test("rotates every 30 s by default", () => {
    expect(rotationFrom("")).toEqual({ pinned: null, seconds: DEFAULT_ROTATE_SECONDS, explicit: false });
  });

  test("a pinned visualization never rotates", () => {
    expect(rotationFrom("?viz=race&rotate=10")).toEqual({ pinned: "race", seconds: 0, explicit: true });
  });

  test("rotate=0 stops, small periods are raised to 5 s", () => {
    expect(rotationFrom("?rotate=0").seconds).toBe(0);
    expect(rotationFrom("?rotate=1").seconds).toBe(5);
    expect(rotationFrom("?rotate=45").seconds).toBe(45);
  });

  test("malformed values fall back to the defaults", () => {
    expect(rotationFrom("?viz=<script>&rotate=abc")).toEqual({ pinned: null, seconds: DEFAULT_ROTATE_SECONDS, explicit: false });
    expect(rotationFrom("?rotate=99999").seconds).toBe(DEFAULT_ROTATE_SECONDS);
  });
});

describe("firstViz", () => {
  test("never repeats what the last load showed", () => {
    for (const last of VIZ_IDS) for (const random of [0, 0.3, 0.6, 0.99]) expect(firstViz(last, random)).not.toBe(last);
  });

  test("covers every visualization across draws", () => {
    const seen = new Set(VIZ_IDS.map((_, index) => firstViz(null, (index + 0.5) / VIZ_IDS.length)));
    expect(seen.size).toBe(VIZ_IDS.length);
  });

  test("with one available it still answers", () => {
    expect(firstViz("orbit", 0.5, ["orbit"])).toBe("orbit");
  });
});

describe("nextViz", () => {
  test("cycles in order and wraps", () => {
    expect(VIZ_IDS.map((id) => nextViz(id))).toEqual([...VIZ_IDS.slice(1), VIZ_IDS[0]]);
  });

  test("a dropped current view hands over to the first available", () => {
    expect(nextViz("loom", ["orbit", "race", "wave"])).toBe("orbit");
  });

  test("skips one that cannot run here", () => {
    expect(nextViz("wave", ["orbit", "race", "wave"])).toBe("orbit");
  });
});
