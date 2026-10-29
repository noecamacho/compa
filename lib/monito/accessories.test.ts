import { describe, expect, test } from "bun:test";
import { accessoriesOf, unlockedAccessories, wearing } from "./accessories";
import { DEFAULT_LOOK, GOLDEN_CAP } from "./look";

const earned = new Date("2026-10-29T18:00:00Z");

describe("accessories", () => {
  test("the golden cap is unlocked by goldenCapAt and worn unless hidden", () => {
    expect(unlockedAccessories({ goldenCapAt: null })).toEqual([]);
    expect(accessoriesOf({ goldenCapAt: earned, showAccessories: true })).toEqual(["golden_cap"]);
    expect(accessoriesOf({ goldenCapAt: earned, showAccessories: false })).toEqual([]);
    expect(unlockedAccessories({ goldenCapAt: earned })).toEqual(["golden_cap"]);
  });

  test("wearing the cap puts it on the monito without changing anything else", () => {
    expect(wearing(DEFAULT_LOOK, ["golden_cap"])).toEqual({ ...DEFAULT_LOOK, ...GOLDEN_CAP });
    expect(wearing(DEFAULT_LOOK, [])).toBe(DEFAULT_LOOK);
    expect(wearing(DEFAULT_LOOK, undefined)).toBe(DEFAULT_LOOK);
  });
});
