import { afterEach, describe, expect, test } from "bun:test";
import { z } from "zod";
import { apiErrors, common } from "../copy/es";
import { ApiClientError, apiCall, errorText, networkError } from "./client";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const stubFetch = (handler: (init: RequestInit | undefined) => Promise<Response>) => {
  const calls: (RequestInit | undefined)[] = [];
  globalThis.fetch = Object.assign(
    async (_input: unknown, init?: RequestInit) => {
      calls.push(init);
      return handler(init);
    },
    { preconnect: realFetch.preconnect },
  );
  return calls;
};

describe("networkError", () => {
  test("a timeout, an offline phone and a plain failure get distinct codes", () => {
    expect(networkError(new DOMException("slow", "TimeoutError")).code).toBe("timeout");
    expect(networkError(new DOMException("aborted", "AbortError")).code).toBe("timeout");
    expect(networkError(new TypeError("Failed to fetch"), false).code).toBe("offline");
    expect(networkError(new TypeError("Failed to fetch"), true).code).toBe("network_error");
  });
});

describe("errorText", () => {
  test("never shows the raw browser or server message", () => {
    expect(errorText(new ApiClientError(0, "network_error", "Failed to fetch"))).toBe(apiErrors.codes.network_error);
    expect(errorText(new ApiClientError(409, "not_pending", "This request was already answered."))).toBe(apiErrors.codes.not_pending);
    expect(errorText(new ApiClientError(401, "unauthorized", "Sign in with LinkedIn to continue."))).toBe(apiErrors.signedOut);
    expect(errorText(new ApiClientError(429, "rate_limited", "slow down"))).toBe(common.rateLimited);
    expect(errorText(new ApiClientError(503, "unknown", "Service Unavailable"))).toBe(apiErrors.server);
    expect(errorText(new Error("boom"))).toBe(apiErrors.generic);
  });

  test("reads the recorder's upload errors by shape", () => {
    const upload = Object.assign(new Error("TimeoutError"), { status: 0, code: "timeout" });
    expect(errorText(upload)).toBe(apiErrors.codes.timeout);
  });
});

describe("apiCall", () => {
  test("every request carries a timeout signal", async () => {
    const calls = stubFetch(async () => Response.json({ ok: true }));
    await apiCall("POST", "/api/x", z.object({ ok: z.boolean() }), {});
    expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);
  });

  test("a hung request rejects as timeout instead of hanging", async () => {
    stubFetch(
      (init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const result = apiCall("POST", "/api/x", z.unknown(), {}, { timeoutMs: 20 });
    await expect(result).rejects.toMatchObject({ status: 0, code: "timeout" });
  });

  test("a GET retries once after a network failure", async () => {
    let attempt = 0;
    const calls = stubFetch(async () => {
      attempt += 1;
      if (attempt === 1) throw new TypeError("Failed to fetch");
      return Response.json({ ok: true });
    });
    expect(await apiCall("GET", "/api/x", z.object({ ok: z.boolean() }))).toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });

  test("a write never retries, so it cannot apply twice", async () => {
    const calls = stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(apiCall("POST", "/api/x", z.unknown(), {})).rejects.toMatchObject({ code: "network_error" });
    expect(calls).toHaveLength(1);
  });

  test("a 5xx GET is not retried (no retry storm on an overloaded server)", async () => {
    const calls = stubFetch(async () => Response.json({ error: { code: "internal_error", message: "x" } }, { status: 500 }));
    await expect(apiCall("GET", "/api/x", z.unknown())).rejects.toMatchObject({ status: 500, code: "internal_error" });
    expect(calls).toHaveLength(1);
  });
});
