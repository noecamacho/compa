import { describe, expect, mock, test } from "bun:test";
import { MOCK_HEADERS } from "./mock-headers";

mock.module("server-only", () => ({}));
const { forwardedMockHeaders } = await import("./server-fetch");

describe("forwardedMockHeaders (admin spec §7.5)", () => {
  test("forwards the mock error, status and example headers only", () => {
    const incoming = new Headers({
      [MOCK_HEADERS.error]: "event_not_found",
      [MOCK_HEADERS.example]: "empty",
      [MOCK_HEADERS.mock]: "1",
      cookie: "sb=secret",
    });
    expect(forwardedMockHeaders(incoming)).toEqual({ [MOCK_HEADERS.error]: "event_not_found", [MOCK_HEADERS.example]: "empty" });
  });

  test("nothing to forward is an empty object", () => expect(forwardedMockHeaders(new Headers())).toEqual({}));
});
