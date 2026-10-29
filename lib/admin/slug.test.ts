import { describe, expect, test } from "bun:test";
import { slugify } from "./slug";

describe("slugify", () => {
  test("strips accents and lowercases", () => {
    expect(slugify("Fundadores Mérida")).toBe("fundadores-merida");
    expect(slugify("Ñandú Señor ÜBER")).toBe("nandu-senor-uber");
  });

  test("collapses runs of other characters into one hyphen and trims the ends", () => {
    expect(slugify("  Codex Conf — 2026!! ")).toBe("codex-conf-2026");
    expect(slugify("a__b..c")).toBe("a-b-c");
    expect(slugify("¡¿?!")).toBe("");
  });

  test("caps at 48 characters without a trailing hyphen", () => {
    expect(slugify(`${"a".repeat(47)} bcd`)).toBe("a".repeat(47));
    expect(slugify("x".repeat(60))).toHaveLength(48);
  });
});
