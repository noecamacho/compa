import { describe, expect, test } from "bun:test";
import { dayIn, entriesOutsideWindow, isTimeZone, Schedule, ScheduleEntry, sortSchedule, TimeZone } from "./schedule";

describe("time zone (M20)", () => {
  test("accepts IANA zones and UTC", () => {
    for (const zone of ["America/Mexico_City", "Europe/Madrid", "UTC", "Asia/Kolkata"]) expect(isTimeZone(zone)).toBe(true);
  });
  test("rejects anything else", () => {
    for (const zone of ["", " ", "Mars/Olympus", "GMT+25", "America/Nowhere"]) expect(TimeZone.safeParse(zone).success).toBe(false);
  });
  test("a day is read in the event's zone", () => {
    const lateNight = new Date("2026-10-30T04:30:00.000Z");
    expect(dayIn(lateNight, "America/Mexico_City")).toBe("2026-10-29");
    expect(dayIn(lateNight, "Europe/Madrid")).toBe("2026-10-30");
  });
});

describe("schedule entries", () => {
  test("a doors block and an agenda item are valid", () => {
    const parsed = Schedule.safeParse([
      { date: "2026-10-29", start: "10:00", end: "22:00" },
      { date: "2026-10-29", start: "18:00", end: "18:45", title: "Keynote" },
    ]);
    expect(parsed.success).toBe(true);
  });
  test("end must follow start on the same day", () => {
    expect(ScheduleEntry.safeParse({ date: "2026-10-29", start: "22:00", end: "02:00" }).success).toBe(false);
    expect(ScheduleEntry.safeParse({ date: "2026-10-29", start: "10:00", end: "10:00" }).success).toBe(false);
  });
  test("malformed dates, hours and long titles are rejected", () => {
    const bad = [
      { date: "29/10/2026", start: "10:00", end: "11:00" },
      { date: "2026-10-29", start: "24:00", end: "24:30" },
      { date: "2026-10-29", start: "9:00", end: "11:00" },
      { date: "2026-10-29", start: "10:00", end: "11:00", title: "x".repeat(81) },
    ];
    for (const entry of bad) expect(ScheduleEntry.safeParse(entry).success).toBe(false);
  });
  test("at most 40 entries", () => {
    const entry = { date: "2026-10-29", start: "10:00", end: "11:00" };
    expect(Schedule.safeParse(Array.from({ length: 41 }, () => entry)).success).toBe(false);
  });
  test("days outside the window are reported by index", () => {
    const window = { startsAt: new Date("2026-10-29T16:00:00Z"), endsAt: new Date("2026-10-30T04:00:00Z"), timezone: "America/Mexico_City" };
    const schedule = [
      { date: "2026-10-29", start: "10:00", end: "22:00" },
      { date: "2026-10-30", start: "10:00", end: "12:00" },
      { date: "2026-10-28", start: "10:00", end: "12:00" },
    ];
    expect(entriesOutsideWindow(schedule, window)).toEqual([1, 2]);
  });
  test("sorted by day, then start", () => {
    const sorted = sortSchedule([
      { date: "2026-10-30", start: "09:00", end: "10:00" },
      { date: "2026-10-29", start: "18:00", end: "19:00" },
      { date: "2026-10-29", start: "10:00", end: "11:00" },
    ]);
    expect(sorted.map((entry) => `${entry.date} ${entry.start}`)).toEqual(["2026-10-29 10:00", "2026-10-29 18:00", "2026-10-30 09:00"]);
  });
});
