import { describe, expect, test } from "bun:test";
import { hasEnded, isRunning, statusForViewer } from "./connection-status";

const base = { requesterId: "requester", eventEnded: false };

describe("statusForViewer (§7.3, §7.4)", () => {
  test("accepted is accepted for both", () => {
    expect(statusForViewer({ ...base, status: "accepted", viewerId: "requester" })).toBe("accepted");
    expect(statusForViewer({ ...base, status: "accepted", viewerId: "addressee" })).toBe("accepted");
  });
  test("a pending row expires on read once the event ends", () => {
    expect(statusForViewer({ ...base, status: "pending", viewerId: "requester" })).toBe("pending");
    expect(statusForViewer({ ...base, status: "pending", viewerId: "addressee", eventEnded: true })).toBe("expired");
  });
  test("a decline is silent: the requester sees pending, then expired", () => {
    expect(statusForViewer({ ...base, status: "declined", viewerId: "requester" })).toBe("pending");
    expect(statusForViewer({ ...base, status: "declined", viewerId: "requester", eventEnded: true })).toBe("expired");
  });
  test("the addressee sees their own decline", () => {
    expect(statusForViewer({ ...base, status: "declined", viewerId: "addressee", eventEnded: true })).toBe("declined");
  });
});

test("event window", () => {
  const event = { startsAt: new Date("2026-10-29T16:00:00Z"), endsAt: new Date("2026-10-29T22:00:00Z") };
  expect(isRunning(event, new Date("2026-10-29T18:00:00Z"))).toBe(true);
  expect(isRunning(event, new Date("2026-10-29T22:00:00Z"))).toBe(false);
  expect(hasEnded(event, new Date("2026-10-29T22:00:00Z"))).toBe(true);
});
