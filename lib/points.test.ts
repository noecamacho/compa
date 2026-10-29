import { describe, expect, test } from "bun:test";
import { CONNECTION_POINTS, decideKind, pointsFor, SUMMARY_POINTS } from "./points";

const none = { metAtEarlierEvent: false, requesterKnew: null, addresseeKnew: null };

describe("decideKind (M4)", () => {
  test("first meeting without a tick is new", () => {
    expect(decideKind(none)).toBe("new");
    expect(decideKind({ ...none, requesterKnew: false, addresseeKnew: false })).toBe("new");
  });
  test("an accepted connection at an earlier event makes it a reconnection", () => {
    expect(decideKind({ ...none, metAtEarlierEvent: true })).toBe("reconnection");
  });
  test("either person's tick makes it a reconnection", () => {
    expect(decideKind({ ...none, requesterKnew: true })).toBe("reconnection");
    expect(decideKind({ ...none, addresseeKnew: true })).toBe("reconnection");
  });
  test("history overrides; nobody can force new alone", () => {
    expect(decideKind({ metAtEarlierEvent: true, requesterKnew: false, addresseeKnew: false })).toBe("reconnection");
    expect(decideKind({ ...none, requesterKnew: true, addresseeKnew: false })).toBe("reconnection");
  });
});

test("points follow kind (M3) and summaries add 25 (M18)", () => {
  expect(pointsFor("new")).toBe(20);
  expect(pointsFor("reconnection")).toBe(10);
  expect(CONNECTION_POINTS).toEqual({ new: 20, reconnection: 10 });
  expect(SUMMARY_POINTS).toBe(25);
});
