import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { parsePageParams } from "./page-params";

const Query = z.object({
  q: z.string().trim().max(80).optional(),
  test: z.enum(["include", "exclude", "only"]).default("include"),
  page: z.coerce.number().int().min(1).default(1),
});

describe("parsePageParams", () => {
  test("parses valid params", () => {
    expect(parsePageParams(Query, { q: "ana", test: "only", page: "2" })).toEqual({ q: "ana", test: "only", page: 2 });
  });

  test("falls back to the default for each invalid key, never throws", () => {
    expect(parsePageParams(Query, { q: "x".repeat(81), test: "foo", page: "abc" })).toEqual({ q: undefined, test: "include", page: 1 });
  });

  test("keeps the valid keys when another key is invalid", () => {
    expect(parsePageParams(Query, { q: "ana", page: "-3" })).toEqual({ q: "ana", test: "include", page: 1 });
  });

  test("takes the first value of a repeated key and ignores unknown keys", () => {
    expect(parsePageParams(Query, { test: ["exclude", "only"], bogus: "1" })).toEqual({ q: undefined, test: "exclude", page: 1 });
  });

  test("returns the defaults for no params", () => {
    expect(parsePageParams(Query, {})).toEqual({ q: undefined, test: "include", page: 1 });
  });
});
