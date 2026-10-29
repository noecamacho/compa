import { describe, expect, test } from "bun:test";
import { mockHeadersFor } from "./mock-cookie";

describe("mockHeadersFor", () => {
  test("adds nothing outside mock mode, even with the cookie", () => {
    expect(mockHeadersFor("compa-mock-error=not_pending", undefined)).toEqual({});
    expect(mockHeadersFor("compa-mock-error=not_pending", "real")).toEqual({});
  });

  test("turns mock mode on for server fetches under API_MODE=mock", () => {
    expect(mockHeadersFor("", "mock")).toEqual({ "x-compa-mock": "1" });
  });

  test("forwards the test cookie as the mock error header", () => {
    expect(mockHeadersFor("sb-auth=x; compa-mock-error=event_not_found; other=1", "mock")).toEqual({
      "x-compa-mock": "1",
      "x-compa-mock-error": "event_not_found",
    });
  });

  test("ignores a malformed error code", () => {
    expect(mockHeadersFor("compa-mock-error=Not%20Valid", "mock")).toEqual({ "x-compa-mock": "1" });
  });
});
