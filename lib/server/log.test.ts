import { describe, expect, test } from "bun:test";
import { formatErrorLog, pathOnly, requestIdFrom } from "./log";

describe("requestIdFrom", () => {
  test("prefers the Vercel id", () => {
    const headers = new Headers({ "x-vercel-id": "iad1::abc", "x-request-id": "other" });
    expect(requestIdFrom(headers)).toBe("iad1::abc");
  });

  test("falls back to x-request-id, then to a fresh id", () => {
    expect(requestIdFrom(new Headers({ "x-request-id": "r-1" }))).toBe("r-1");
    expect(requestIdFrom(new Headers())).not.toBe(requestIdFrom(new Headers()));
  });
});

describe("pathOnly", () => {
  test("drops the query string", () => {
    expect(pathOnly("https://compa.lol/api/me?token=secret")).toBe("/api/me");
    expect(pathOnly("/api/me?token=secret")).toBe("/api/me");
  });
});

describe("formatErrorLog", () => {
  test("is one JSON line with the request id and the error", () => {
    const line = formatErrorLog({ event: "route_error", error: new Error("boom"), requestId: "r-1", method: "POST", path: "/api/x", status: 500 });
    const parsed = JSON.parse(line);
    expect(line).not.toContain("\n");
    expect(parsed).toMatchObject({ level: "error", event: "route_error", requestId: "r-1", method: "POST", path: "/api/x", status: 500 });
    expect(parsed.error).toMatchObject({ name: "Error", message: "boom" });
  });

  test("accepts a thrown non-Error", () => {
    const parsed = JSON.parse(formatErrorLog({ event: "e", error: "oops", requestId: "r", method: "GET", path: "/" }));
    expect(parsed.error).toEqual({ name: "NonError", message: "oops" });
  });
});
