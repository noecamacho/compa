import { describe, expect, test } from "bun:test";
import { confettiPieces } from "./poster";

describe("confettiPieces", () => {
  test("is deterministic, so server and client render the same stage", () => {
    expect(confettiPieces(24)).toEqual(confettiPieces(24));
    expect(confettiPieces(0)).toEqual([]);
  });

  test("keeps every piece on the stage with a falling loop already under way", () => {
    for (const piece of confettiPieces(40)) {
      expect(piece.left).toBeGreaterThanOrEqual(0);
      expect(piece.left).toBeLessThan(100);
      expect(piece.size).toBeGreaterThanOrEqual(1);
      expect(piece.size).toBeLessThanOrEqual(2.4);
      expect(piece.duration).toBeGreaterThanOrEqual(8);
      expect(piece.delay).toBeLessThanOrEqual(0);
      expect(-piece.delay).toBeLessThanOrEqual(piece.duration);
      expect(Math.abs(piece.sway)).toBeLessThanOrEqual(8);
    }
  });

  test("spreads pieces across the width and cycles the brand colors", () => {
    const pieces = confettiPieces(20);
    const halves = pieces.filter((piece) => piece.left < 50).length;
    expect(halves).toBeGreaterThanOrEqual(8);
    expect(halves).toBeLessThanOrEqual(12);
    expect(new Set(pieces.map((piece) => piece.color)).size).toBe(5);
    expect(new Set(pieces.map((piece) => piece.left)).size).toBe(20);
  });
});
