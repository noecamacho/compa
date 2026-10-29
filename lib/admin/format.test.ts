import { describe, expect, test } from "bun:test";
import { eventWhen, formatCount, inZone, relative, zoneAbbreviation } from "./format";

const ZONE = "America/Mexico_City";

describe("eventWhen", () => {
  test("same day: one date, a time range and the zone abbreviation", () => {
    expect(eventWhen("en", "2026-10-29T16:00:00Z", "2026-10-30T04:00:00Z", ZONE)).toBe("Thu, Oct 29 · 10:00–22:00 CST");
  });

  test("multi-day: both dates in the event's zone", () => {
    expect(eventWhen("en", "2026-10-29T16:00:00Z", "2026-10-30T08:00:00Z", ZONE)).toBe("Oct 29, 10:00 – Oct 30, 02:00 CST");
  });

  test("Spanish (Mexico) wording and zone name", () => {
    const text = eventWhen("es", "2026-10-29T16:00:00Z", "2026-10-30T04:00:00Z", ZONE);
    expect(text).toContain("29 de oct");
    expect(text).toContain("10:00–22:00");
    expect(text).toMatch(/(CST|GMT-6)$/);
  });

  test("the date is the event's local date, not UTC", () => {
    // 03:00 UTC on the 30th is still the 29th in Mexico City.
    expect(eventWhen("en", "2026-10-30T03:00:00Z", "2026-10-30T05:00:00Z", ZONE)).toBe("Thu, Oct 29 · 21:00–23:00 CST");
  });

  test("an invalid time zone falls back to UTC and flags it instead of throwing", () => {
    expect(eventWhen("en", "2026-10-29T16:00:00Z", "2026-10-29T20:00:00Z", "Mars/Olympus")).toBe("Thu, Oct 29 · 16:00–20:00 UTC (?)");
  });
});

describe("relative", () => {
  const now = new Date("2026-10-29T12:00:00Z");

  test("under a minute reads as now", () => {
    expect(relative("en", "2026-10-29T12:00:20Z", now)).toBe("now");
    expect(relative("es", "2026-10-29T11:59:40Z", now)).toBe("ahora");
  });

  test("picks the largest fitting unit, past and future", () => {
    expect(relative("en", "2026-10-29T15:00:00Z", now)).toBe("in 3 hours");
    expect(relative("en", "2026-10-29T11:15:00Z", now)).toBe("45 minutes ago");
    expect(relative("en", "2026-10-28T12:00:00Z", now)).toBe("yesterday");
    expect(relative("en", "2026-08-29T12:00:00Z", now)).toBe("2 months ago");
    expect(relative("en", "2024-10-29T12:00:00Z", now)).toBe("2 years ago");
  });

  test("Spanish", () => {
    expect(relative("es", "2026-10-29T15:00:00Z", now)).toBe("dentro de 3 horas");
  });
});

describe("formatCount", () => {
  test("groups thousands per locale", () => {
    expect(formatCount("en", 1340)).toBe("1,340");
    expect(formatCount("es", 1340)).toBe("1,340");
  });

  test("renders a dash for a missing number", () => {
    expect(formatCount("en", null)).toBe("—");
    expect(formatCount("es", undefined)).toBe("—");
  });
});

describe("inZone and zoneAbbreviation", () => {
  test("format in the event's zone", () => {
    expect(inZone("en", "2026-10-29T04:30:00Z", "America/Mexico_City", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })).toBe("22:30");
    expect(zoneAbbreviation("en", "2026-10-29T16:00:00Z", "America/Mexico_City")).toBe("CST");
  });

  test("an unknown zone falls back to UTC instead of throwing", () => {
    expect(inZone("en", "2026-10-29T04:30:00Z", "Mars/Olympus", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })).toBe("04:30");
    expect(zoneAbbreviation("en", "2026-10-29T16:00:00Z", "Mars/Olympus")).toBe("?");
  });
});
