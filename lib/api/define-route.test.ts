import { describe, expect, spyOn, test } from "bun:test";
import { defineRoute } from "./define-route";
import { ApiError } from "./errors";
import * as routes from "./routes";

const call = (handler: () => never, headers?: HeadersInit) =>
  defineRoute(routes.listInterests, handler)(new Request("http://x/api/interests?secret=1", { headers }), undefined);

describe("defineRoute error responses", () => {
  test("an unexpected throw is a 500 with a request id, logged as one JSON line without the query", async () => {
    const log = spyOn(console, "error").mockImplementation(() => {});
    const res = await call(() => { throw new Error("boom"); }, { "x-vercel-id": "iad1::abc" });
    const line = JSON.parse(String(log.mock.calls[0]?.[0]));
    log.mockRestore();
    expect(res.status).toBe(500);
    expect(res.headers.get("x-request-id")).toBe("iad1::abc");
    expect(line).toMatchObject({ event: "route_error", requestId: "iad1::abc", path: "/api/interests", status: 500 });
  });

  test("a client error carries the id but is not logged", async () => {
    const log = spyOn(console, "error").mockImplementation(() => {});
    const res = await call(() => { throw new ApiError(404, "not_found", "Nope."); });
    const logged = log.mock.calls.length;
    log.mockRestore();
    expect(res.status).toBe(404);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect(logged).toBe(0);
  });
});
