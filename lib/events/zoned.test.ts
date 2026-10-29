import { describe, expect, test } from "bun:test";
import { utcToZoned, zonedToUtc } from "./zoned";

describe("event wall clock", () => {
  test("reads a local time in the event's zone", () => {
    expect(zonedToUtc("2026-10-29T10:00", "America/Mexico_City")?.toISOString()).toBe("2026-10-29T16:00:00.000Z");
    expect(zonedToUtc("2026-10-29T10:00", "Europe/Madrid")?.toISOString()).toBe("2026-10-29T09:00:00.000Z");
    expect(zonedToUtc("2026-10-29T10:00", "UTC")?.toISOString()).toBe("2026-10-29T10:00:00.000Z");
  });
  test("handles a DST change (Madrid, 25 Oct 2026)", () => {
    expect(zonedToUtc("2026-10-24T12:00", "Europe/Madrid")?.toISOString()).toBe("2026-10-24T10:00:00.000Z");
    expect(zonedToUtc("2026-10-26T12:00", "Europe/Madrid")?.toISOString()).toBe("2026-10-26T11:00:00.000Z");
  });
  test("round-trips", () => {
    for (const zone of ["America/Mexico_City", "Europe/Madrid", "Asia/Kolkata"]) {
      expect(utcToZoned(zonedToUtc("2026-10-29T18:30", zone)?.toISOString() ?? "", zone)).toBe("2026-10-29T18:30");
    }
  });
  test("malformed input is null", () => expect(zonedToUtc("29/10/2026 10:00", "UTC")).toBeNull());
  test("an unknown or half-typed zone is null, not a throw", () => {
    expect(zonedToUtc("2026-10-29T10:00", "Mars/Olympus")).toBeNull();
    expect(zonedToUtc("2026-10-29T10:00", "America/Mex")).toBeNull();
  });
});
