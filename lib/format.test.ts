import { describe, expect, test } from "bun:test";
import { formatClock, formatHour, formatPoints, timeAgo } from "./format";

const NOW = new Date("2026-10-29T20:00:00Z");

describe("format by locale", () => {
  test("time ago reads in the person's language", () => {
    expect(timeAgo("es", "2026-10-29T19:55:00Z", NOW)).toBe("hace 5 min");
    expect(timeAgo("en", "2026-10-29T19:55:00Z", NOW)).toBe("5 min ago");
    expect(timeAgo("en", "2026-10-29T17:00:00Z", NOW)).toBe("3 h ago");
    expect(timeAgo("en", "2026-10-29T20:00:00Z", NOW)).toBe("just now");
  });

  test("clock, points and hour", () => {
    expect(formatClock("en", 65)).toBe("1:05");
    expect(formatPoints("en", 1265)).toBe("1,265");
    expect(formatHour("es", "2026-10-29T22:30:00Z")).toBe("16:30");
    expect(formatHour("en", "2026-10-29T22:30:00Z")).toMatch(/4:30\s?PM/);
  });
});
