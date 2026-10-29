import { describe, expect, test } from "bun:test";
import { ApiError, errorResponse } from "./errors";
import { LIMITS, counterKey, windowSlot } from "./rate-limits";

describe("windowSlot", () => {
  test("a minute window starts on the minute and retries when it ends", () => {
    const slot = windowSlot("minute", new Date("2026-10-29T10:00:45.200Z"));
    expect(slot.start.toISOString()).toBe("2026-10-29T10:00:00.000Z");
    expect(slot.retryAfterSeconds).toBe(15);
  });

  test("a day window starts at UTC midnight", () => {
    const slot = windowSlot("day", new Date("2026-10-29T23:00:00.000Z"));
    expect(slot.start.toISOString()).toBe("2026-10-29T00:00:00.000Z");
    expect(slot.retryAfterSeconds).toBe(3600);
  });

  test("retry is at least one second on a window edge", () => {
    expect(windowSlot("minute", new Date("2026-10-29T10:00:59.999Z")).retryAfterSeconds).toBe(1);
  });
});

test("counterKey scopes by user, rule and optional scope", () => {
  expect(counterKey("u1", LIMITS.scanPerMinute)).toBe("u1:scan-minute");
  expect(counterKey("u1", LIMITS.draftPerMinute, "c9")).toBe("u1:draft-minute:c9");
});

test("an error with headers keeps them in its response (Retry-After)", () => {
  const error = new ApiError(429, "rate_limited", "slow down", undefined, { "Retry-After": "12" });
  const response = errorResponse(error);
  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("12");
});
