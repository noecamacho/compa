import { expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));
const { searchPatterns } = await import("./people-search");

test("the handle pattern is accent-free so 'López' is found by 'lopez' and 'LÓPEZ'", () => {
  expect(searchPatterns("López").handle).toBe("%lopez%");
  expect(searchPatterns("Ana  Lopez").handle).toBe("%ana-lopez%");
});

test("LIKE wildcards in the query are literal", () => {
  expect(searchPatterns("100%_a").name).toBe("%100\\%\\_a%");
});

test("a query without letters or digits has no handle pattern, so it cannot match everyone", () => {
  expect(searchPatterns("--").handle).toBeNull();
});
