import { describe, expect, test } from "bun:test";
import { matchPath } from "./match-path";

describe("matchPath", () => {
  test("reads named segments", () => expect(matchPath("/api/e/{code}/live", "/api/e/k7m2p9xq4t/live")).toEqual({ code: "k7m2p9xq4t" }));
  test("decodes segments", () => expect(matchPath("/api/users/{handle}", "/api/users/ana%20b")).toEqual({ handle: "ana b" }));
  test("static paths match exactly", () => {
    expect(matchPath("/api/me", "/api/me")).toEqual({});
    expect(matchPath("/api/invites/me", "/api/invites/abc")).toBeNull();
  });
  test("a different depth never matches", () => {
    expect(matchPath("/api/e/{code}", "/api/e/k7m2/live")).toBeNull();
    expect(matchPath("/api/e/{code}/live", "/api/e/k7m2")).toBeNull();
  });
});

describe("matchPath on malformed input", () => {
  test("a broken escape does not throw", () => expect(matchPath("/api/users/{handle}", "/api/users/100%")).toBeNull());
});
