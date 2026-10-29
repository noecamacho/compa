import { describe, expect, test } from "bun:test";
import { AdminCreateEventBody, PatchEventBody } from "../api/admin-schemas";
import { applyEventEdit, endNow, type EditableEvent } from "./edit";

const event: EditableEvent = {
  startsAt: new Date("2026-10-29T16:00:00Z"),
  endsAt: new Date("2026-10-30T04:00:00Z"),
  timezone: "America/Mexico_City",
  schedule: [],
  status: "live",
};
const duringEvent = new Date("2026-10-29T20:00:00Z");

describe("event edit validation (M20)", () => {
  test("a valid partial edit keeps the rest", () => {
    const result = applyEventEdit(event, { endsAt: "2026-10-30T06:00:00Z" }, duringEvent);
    expect(result).toEqual({ ok: true, value: { ...event, endsAt: new Date("2026-10-30T06:00:00Z") } });
  });
  test("the merged window must stay ordered, even when only one side changes", () => {
    const result = applyEventEdit(event, { startsAt: "2026-10-31T00:00:00Z" }, duringEvent);
    expect(result).toEqual({ ok: false, fields: { endsAt: ["endsAt must be after startsAt"] } });
  });
  test("schedule days must fall inside the window in the event's zone", () => {
    const result = applyEventEdit(event, { schedule: [{ date: "2026-11-02", start: "10:00", end: "11:00" }] }, duringEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fields.schedule?.[0]).toContain("0");
  });
  test("changing the time zone re-checks the schedule", () => {
    const schedule = [{ date: "2026-10-30", start: "10:00", end: "11:00" }];
    expect(applyEventEdit(event, { schedule }, duringEvent).ok).toBe(false);
    expect(applyEventEdit(event, { schedule, timezone: "Europe/Madrid" }, duringEvent).ok).toBe(true);
  });
  test("status ended closes the window now", () => {
    const result = applyEventEdit(event, { status: "ended" }, duringEvent);
    expect(result).toEqual({ ok: true, value: { ...event, status: "ended", endsAt: duringEvent } });
  });
  test("end now on an event that has not started yet keeps a one-minute window", () => {
    const before = new Date("2026-10-29T10:00:00Z");
    const ended = endNow(event, before);
    expect(ended.endsAt).toEqual(before);
    expect(ended.startsAt.getTime()).toBe(before.getTime() - 60_000);
  });
  test("end now on a finished event keeps its real end", () => {
    const later = new Date("2026-11-05T00:00:00Z");
    expect(endNow(event, later).endsAt).toEqual(event.endsAt);
  });
});

describe("event body schemas", () => {
  const base = { name: "Codex Conf 2026", slug: "codex-conf-2026", startsAt: "2026-10-29T16:00:00Z", endsAt: "2026-10-30T04:00:00Z" };
  test("the original create body still parses", () => expect(AdminCreateEventBody.safeParse(base).success).toBe(true));
  test("create rejects a reversed window, a bad zone, a non-http website and a long description", () => {
    const bad = [
      { ...base, endsAt: base.startsAt },
      { ...base, timezone: "Mars/Olympus" },
      { ...base, websiteUrl: "javascript:alert(1)" },
      { ...base, description: "x".repeat(2001) },
      { ...base, status: "deleted" },
    ];
    for (const body of bad) expect(AdminCreateEventBody.safeParse(body).success).toBe(false);
  });
  test("patch accepts null to clear and rejects an empty name", () => {
    expect(PatchEventBody.safeParse({ venueName: null, websiteUrl: null }).success).toBe(true);
    expect(PatchEventBody.safeParse({ name: "  " }).success).toBe(false);
  });
});
