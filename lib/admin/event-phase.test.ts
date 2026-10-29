import { describe, expect, test } from "bun:test";
import { EVENT_PHASES, phaseOf } from "./event-phase";

const startsAt = "2026-10-29T16:00:00.000Z";
const endsAt = "2026-10-30T04:00:00.000Z";
const at = (iso: string) => new Date(iso);

describe("phaseOf (spec §6.2)", () => {
  test("archived, draft and ended ignore the window", () => {
    const now = at("2026-10-29T20:00:00.000Z");
    expect(phaseOf({ status: "archived", startsAt, endsAt }, now)).toBe("archived");
    expect(phaseOf({ status: "draft", startsAt, endsAt }, now)).toBe("draft");
    expect(phaseOf({ status: "ended", startsAt, endsAt }, now)).toBe("ended");
  });

  test("live before the start is upcoming", () => {
    expect(phaseOf({ status: "live", startsAt, endsAt }, at("2026-10-29T15:59:59.999Z"))).toBe("upcoming");
  });

  test("live at the start instant is running", () => {
    expect(phaseOf({ status: "live", startsAt, endsAt }, at(startsAt))).toBe("running");
  });

  test("live at the end instant has ended; a millisecond before it still runs", () => {
    expect(phaseOf({ status: "live", startsAt, endsAt }, at(endsAt))).toBe("ended");
    expect(phaseOf({ status: "live", startsAt, endsAt }, at("2026-10-30T03:59:59.999Z"))).toBe("running");
  });

  test("accepts Date windows as well as ISO strings", () => {
    expect(phaseOf({ status: "live", startsAt: at(startsAt), endsAt: at(endsAt) }, at("2026-10-29T20:00:00.000Z"))).toBe("running");
  });

  test("phases are listed in their display and sort order", () => {
    expect(EVENT_PHASES).toEqual(["running", "upcoming", "draft", "ended", "archived"]);
  });
});
