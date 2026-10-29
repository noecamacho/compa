import { describe, expect, test } from "bun:test";
import { ACCESS_CODE_ALPHABET, ACCESS_CODE_LENGTH, codeFromSegment, generateAccessCode, joinUrl, parseAccessCode } from "./access-code";

describe("generateAccessCode", () => {
  test("is 10 URL-safe characters from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateAccessCode();
      expect(code).toHaveLength(ACCESS_CODE_LENGTH);
      expect([...code].every((ch) => ACCESS_CODE_ALPHABET.includes(ch))).toBe(true);
      expect(encodeURIComponent(code)).toBe(code);
    }
  });

  test("does not repeat across many draws", () => {
    const codes = new Set(Array.from({ length: 5000 }, () => generateAccessCode()));
    expect(codes.size).toBe(5000);
  });

  test("drops biased bytes instead of folding them into the alphabet", () => {
    // 248 is the first byte past the largest multiple of 31 below 256; only the 3 → "5" bytes count.
    const bytes = (size: number) => new Uint8Array(size).fill(248).map((value, index) => (index % 2 ? 3 : value));
    expect(generateAccessCode(bytes)).toBe("5555555555");
  });

  test("never contains look-alike characters", () => {
    expect(ACCESS_CODE_ALPHABET).not.toMatch(/[01ilo]/);
  });
});

describe("parseAccessCode", () => {
  test("accepts generated and backfilled codes", () => {
    expect(parseAccessCode("k7m2p9xq4t")).toBe("k7m2p9xq4t");
    expect(parseAccessCode("0a1b2c3d4e5f")).toBe("0a1b2c3d4e5f");
  });

  test("normalizes case and spaces from scanners and typing", () => {
    expect(parseAccessCode("  K7M2P9XQ4T ")).toBe("k7m2p9xq4t");
  });

  test("rejects anything that cannot be a code", () => {
    for (const input of ["", "   ", "short", "founders-fest", "k7m2p9xq4t/../x", "a".repeat(33), "k7m2p9xq4t%00", null, undefined]) {
      expect(parseAccessCode(input)).toBeNull();
    }
  });
});

test("joinUrl builds the event QR link without a double slash", () => {
  expect(joinUrl("https://compa.lol/", "k7m2p9xq4t")).toBe("https://compa.lol/e/k7m2p9xq4t");
});

describe("codeFromSegment", () => {
  test("decodes a percent-encoded route segment once", () => {
    expect(codeFromSegment("%20k7m2p9xq4t%20")).toBe(" k7m2p9xq4t ");
    expect(parseAccessCode(codeFromSegment("%20K7M2P9XQ4T"))).toBe("k7m2p9xq4t");
  });

  test("keeps a malformed escape as is", () => {
    expect(codeFromSegment("%E0%A4%A")).toBe("%E0%A4%A");
  });
});
