import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));
const { nextSeenAt } = await import("./notifications");

const now = new Date("2026-10-29T10:00:00Z");

describe("nextSeenAt", () => {
  test("moves forward to what the person saw", () => {
    expect(nextSeenAt(new Date("2026-10-29T09:00:00Z"), new Date("2026-10-29T09:30:00Z"), now)).toEqual(new Date("2026-10-29T09:30:00Z"));
    expect(nextSeenAt(null, new Date("2026-10-29T09:30:00Z"), now)).toEqual(new Date("2026-10-29T09:30:00Z"));
  });

  test("a stale tab never marks newer alerts unseen again", () => {
    expect(nextSeenAt(new Date("2026-10-29T09:45:00Z"), new Date("2026-10-29T09:30:00Z"), now)).toEqual(new Date("2026-10-29T09:45:00Z"));
  });

  test("a future timestamp cannot hide alerts that have not happened", () => {
    expect(nextSeenAt(null, new Date("2027-01-01T00:00:00Z"), now)).toEqual(now);
  });
});
