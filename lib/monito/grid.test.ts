import { describe, expect, test } from "bun:test";
import { GRID_HEIGHT, GRID_WIDTH, LAYER_ORDER, fills, grid, monitoLayers, paths, shade } from "./grid";
import { DEFAULT_LOOK, EXTRAS, FACES, HAIR_STYLES, HATS, OUTFITS, withDefaults } from "./look";
import { SAMPLE_PEOPLE } from "./sample-people";

describe("grid", () => {
  test("is 16×20", () => {
    const g = grid(DEFAULT_LOOK);
    expect(g).toHaveLength(GRID_HEIGHT);
    expect(g.every((row) => row.length === GRID_WIDTH)).toBe(true);
  });

  test("base look matches the design mock, row by row", () => {
    const rows = grid(DEFAULT_LOOK).map((row) => row.join(""));
    expect(rows[0]).toBe("................");
    expect(rows[1]).toBe("....oooooooo....");
    expect(rows[2]).toBe("...ohhhhhhhho...");
    expect(rows[6]).toBe("..ossessssesso..");
    expect(rows[8]).toBe("..oskssmmsskso..");
    expect(rows[13]).toBe("..otottttttoto..");
    expect(rows[19]).toBe("...oooooooooo...");
  });

  test("woman draws a skirt with bare legs; man and other keep the base body", () => {
    const rows = grid(withDefaults({ body: "woman" })).map((row) => row.join(""));
    expect(rows[16]).toBe("...oppppppppo...");
    expect(rows[17]).toBe("....ossoosso....");
    const base = grid(DEFAULT_LOOK).map((row) => row.join(""));
    expect(grid(withDefaults({ body: "man" })).map((row) => row.join(""))).toEqual(base);
    expect(grid(withDefaults({ body: "other" })).map((row) => row.join(""))).toEqual(base);
  });

  test("a cap clears the top rows and covers the hair", () => {
    const rows = grid(withDefaults({ hat: "cap" })).map((row) => row.join(""));
    expect(rows[0]).toBe("................");
    expect(rows[2]).toBe("...oaaaaaaaao...");
    expect(rows[4]).toBe("..oaaaaaaaaaaaao");
  });

  test("glasses and beard combine", () => {
    const rows = grid(withDefaults({ face: "glasses", beard: true })).map((row) => row.join(""));
    expect(rows[6]).toBe("..oolelooleloo..");
    expect(rows[9]).toBe("...ohhhsshhho...");
  });

  test("the cape only paints empty cells", () => {
    const withCape = grid(withDefaults({ extra: "cape" }));
    const without = grid(DEFAULT_LOOK);
    const overwritten = without.flatMap((row, r) => row.filter((cell, c) => cell !== "." && withCape[r]?.[c] !== cell));
    expect(overwritten).toHaveLength(0);
  });
});

describe("paths", () => {
  test("merges horizontal runs into one rectangle each", () => {
    const d = paths(grid(DEFAULT_LOOK));
    expect(d.o.startsWith("M4 1h8v1h-8z")).toBe(true);
    expect(d.e).toBe("M5 6h1v1h-1zM10 6h1v1h-1zM5 7h1v1h-1zM10 7h1v1h-1z");
    expect(d.m).toBe("M7 8h2v1h-2z");
  });

  test("every option combination renders at least the body layers", () => {
    for (const hair of HAIR_STYLES) {
      for (const outfit of OUTFITS) {
        for (const hat of HATS) {
          for (const face of FACES) {
            for (const extra of EXTRAS) {
              const layers = monitoLayers(withDefaults({ hair, outfit, hat, face, extra }));
              const ids = layers.map((layer) => layer.layer);
              expect(ids).toEqual(expect.arrayContaining(["s", "t", "p", "b", "o"]));
            }
          }
        }
      }
    }
  });

  test("layers come out in paint order", () => {
    const ids = monitoLayers(SAMPLE_PEOPLE.CI.look).map((layer) => layer.layer);
    const order = ids.map((id) => LAYER_ORDER.indexOf(id));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe("fills", () => {
  test("shade darkens and keeps the format", () => {
    expect(shade("#FF8FAB", 0.82)).toBe("#D1758C");
    expect(shade("#000000", 0.5)).toBe("#000000");
  });

  test("black hair gets the fixed highlight; other colors are shaded", () => {
    expect(fills(withDefaults({ hairColor: "#2A2438" })).H).toBe("#4A4360");
    expect(fills(withDefaults({ hairColor: "#5A3825" })).H).toBe(shade("#5A3825", 0.78));
  });

  test("outfit accents depend on the shirt", () => {
    expect(fills(withDefaults({ outfit: "stripes", shirt: "#FFFFFF" })).T).toBe("#1E1B2E");
    expect(fills(withDefaults({ outfit: "compa", shirt: "#FFD93D" })).T).toBe("#FF6B4A");
    expect(fills(withDefaults({ outfit: "event", accent: "#6CC4FF" })).T).toBe("#6CC4FF");
    expect(fills(withDefaults({ face: "sunglasses" })).l).toBe("#2E2B40");
  });
});
