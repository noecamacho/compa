import { describe, expect, test } from "bun:test";
import { formatClock, formatDate, formatDateTime, formatHour, formatPoints, timeAgo } from "./format";
import { copyFor } from "./copy";

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

  test("relative time changes from hours to days at 24 hours and dates at a week", () => {
    for (const locale of ["es", "en"] as const) {
      const copy = copyFor(locale);
      expect(timeAgo(locale, "2026-10-28T20:00:01Z", NOW)).toBe(copy.time.hoursAgo(23));
      expect(timeAgo(locale, "2026-10-28T20:00:00Z", NOW)).toBe(copy.datesAndPeople.daysAgo(1));
      expect(timeAgo(locale, "2026-10-27T20:00:00Z", NOW)).toBe(copy.datesAndPeople.daysAgo(2));
      expect(timeAgo(locale, "2026-10-22T20:00:01Z", NOW)).toBe(copy.datesAndPeople.daysAgo(6));
      expect(timeAgo(locale, "2026-10-22T20:00:00Z", NOW)).toBe(formatDate(locale, "2026-10-22T20:00:00Z"));
      expect(timeAgo(locale, "2025-01-01T20:00:00Z", NOW)).toBe(formatDate(locale, "2025-01-01T20:00:00Z"));
      expect(timeAgo(locale, "2026-10-30T20:00:00Z", NOW)).toBe(copy.time.minutesAgo(0));
      expect(timeAgo(locale, "invalid", NOW)).toBe(copy.datesAndPeople.unknownDate);
    }
    expect(timeAgo("es", "2026-10-28T20:00:00Z", NOW)).toBe("hace 1 día");
    expect(timeAgo("en", "2026-10-27T20:00:00Z", NOW)).toBe("2 days ago");
  });

  test("dates include the year and follow Mexico City midnight", () => {
    expect(formatDate("es", "2026-01-01T05:59:00Z")).toBe("31 dic 2025");
    expect(formatDate("en", "2026-01-01T06:00:00Z")).toBe("Jan 1, 2026");
    expect(formatDateTime("es", "2026-01-01T05:59:00Z")).toBe("31 dic 2025 · 23:59");
    expect(formatDateTime("en", "2026-01-01T06:00:00Z")).toMatch(/Jan 1, 2026 · 12:00\s?AM/);
    expect(formatDateTime("es", "2026-01-01T05:59:00Z", "UTC")).toBe("1 ene 2026 · 05:59");
    for (const locale of ["es", "en"] as const) {
      expect(formatDate(locale, "invalid")).toBe(copyFor(locale).datesAndPeople.unknownDate);
      expect(formatDateTime(locale, "invalid")).toBe(copyFor(locale).datesAndPeople.unknownDate);
    }
  });
});
