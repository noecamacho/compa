import { describe, expect, test } from "bun:test";
import { BADGE_IDS } from "./catalog";
import { earnedBadges, isEarned, progressFor, type BadgeFacts } from "./rules";

const nobody: BadgeFacts = {
  totalConnections: 0,
  connectionsTonight: 0,
  scannedBy: 0,
  eventsAttended: 0,
  consecutiveEvents: 0,
  cities: 0,
  distinctTopics: 0,
  notesApproved: 0,
  maxReconnectionsWithOne: 0,
  maxEventsWithOne: 0,
  firstConnectionMinute: null,
  minutesBeforeEnd: null,
  eventConnections: 0,
  signupIndex: 500,
  attendedFoundersFest2026: false,
};

describe("badge rules", () => {
  test("a new person has earned nothing", () => {
    expect(earnedBadges(nobody)).toEqual([]);
  });

  test("the first connection earns the handshake and counts toward the rest", () => {
    const facts = { ...nobody, totalConnections: 1, connectionsTonight: 1, firstConnectionMinute: 12 };
    expect(earnedBadges(facts)).toEqual(["apreton", "madrugador"]);
    expect(progressFor("conector100", facts)).toEqual({ current: 1, total: 100 });
    expect(progressFor("maraton", facts)).toEqual({ current: 1, total: 15 });
  });

  test("progress never exceeds the total", () => {
    expect(progressFor("iman", { ...nobody, scannedBy: 25 })).toEqual({ current: 10, total: 10 });
  });

  test("secret badges have no progress and are never earned by rule", () => {
    for (const id of ["rey", "speaker", "noctambulo", "cazatalentos"] as const) {
      expect(progressFor(id, { ...nobody, totalConnections: 999 })).toBeNull();
    }
    expect(isEarned(null)).toBe(false);
  });

  test("every non-secret badge has a rule", () => {
    const withoutRule = BADGE_IDS.filter((id) => progressFor(id, nobody) === null);
    expect(withoutRule).toEqual(["rey", "speaker", "noctambulo", "cazatalentos"]);
  });
});
