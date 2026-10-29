import { describe, expect, test } from "bun:test";
import { CONNECTION_POINTS, decideKind, INVITE_POINTS, pointsFor, SUMMARY_POINTS, TOPICS_POINTS, topicsPointsFor } from "./points";

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

test("points follow the V2 design table", () => {
  expect(pointsFor("new")).toBe(50);
  expect(pointsFor("reconnection")).toBe(20);
  expect(CONNECTION_POINTS).toEqual({ new: 50, reconnection: 20 });
  expect(SUMMARY_POINTS).toBe(15);
  expect(TOPICS_POINTS).toBe(5);
  expect(INVITE_POINTS).toEqual({ inviter: 100, invitee: 50 });
});

test("topics score once, whatever their number", () => {
  expect(topicsPointsFor([])).toBe(0);
  expect(topicsPointsFor(["IA"])).toBe(5);
  expect(topicsPointsFor(["IA", "Proptech", "Fintech"])).toBe(5);
});
