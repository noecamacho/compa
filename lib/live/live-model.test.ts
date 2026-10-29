import { describe, expect, test } from "bun:test";
import { scenarioFrames, type ScenarioName } from "@/lib/testing/live-scenarios";
import { boardRows, closingMinutes, feed, isNewer, moodOf, pulse, recentCount } from "./live-model";

const last = (name: ScenarioName) => {
  const frame = scenarioFrames(name).at(-1);
  if (!frame) throw new Error(`no frames for ${name}`);
  return frame;
};

describe("moodOf", () => {
  test.each([
    ["upcoming", "upcoming"],
    ["zero", "empty"],
    ["oneAttendee", "empty"],
    ["quiet", "quiet"],
    ["trickle", "steady"],
    ["rush", "rush"],
    ["ended", "ended"],
    ["afterEvent", "ended"],
  ] as const)("%s reads as %s", (scenario, mood) => {
    expect(moodOf(last(scenario))).toBe(mood);
  });
});

describe("pulse", () => {
  test("has one bar per minute and counts only the last half hour", () => {
    const snapshot = last("rush");
    const bars = pulse(snapshot);
    expect(bars).toHaveLength(30);
    expect(bars.reduce((sum, bar) => sum + bar, 0)).toBe(recentCount(snapshot, 30));
  });

  test("after the close it still shows the event's last half hour", () => {
    expect(pulse(last("afterEvent")).some((bar) => bar > 0)).toBe(true);
  });

  test("is flat when nothing happened", () => {
    expect(pulse(last("zero")).every((bar) => bar === 0)).toBe(true);
  });

  test("ignores connections stamped after the snapshot (clock skew)", () => {
    const snapshot = last("trickle");
    const future = { ...snapshot, connections: [...snapshot.connections, { ...snapshot.connections[0]!, id: "x", at: "2099-01-01T00:00:00.000Z" }] };
    expect(pulse(future)).toEqual(pulse(snapshot));
  });
});

describe("feed", () => {
  test("lists the newest connections first with both names", () => {
    const snapshot = last("rush");
    const items = feed(snapshot, 4);
    expect(items).toHaveLength(4);
    expect(items[0]?.id).toBe(snapshot.connections.at(-1)?.id);
    expect(items.every((item) => item.a && item.b)).toBe(true);
  });

  test("skips links to people no longer on screen and stays empty without links", () => {
    const snapshot = last("trickle");
    const [first, ...rest] = snapshot.people;
    const without = { ...snapshot, people: rest };
    expect(feed(without, 100).some((item) => item.a === first?.name || item.b === first?.name)).toBe(false);
    expect(feed(last("zero"), 5)).toEqual([]);
  });
});

describe("boardRows", () => {
  test("equal points and connections share a place", () => {
    const rows = boardRows(last("ties"));
    expect(rows.every((row) => row.rank === 1)).toBe(true);
  });

  test("ranks follow the server order otherwise, with competition ranking after a tie", () => {
    const snapshot = last("trickle");
    const rows = boardRows(snapshot);
    expect(rows.map((row) => row.id)).toEqual(snapshot.people.map((person) => person.id));
    for (const [index, row] of rows.entries()) expect(row.rank === index + 1 || row.rank === rows[index - 1]?.rank).toBe(true);
  });
});

test("isNewer refuses a snapshot from the past", () => {
  const [older, newer] = scenarioFrames("trickle");
  expect(isNewer(newer!, older!)).toBe(true);
  expect(isNewer(older!, newer!)).toBe(false);
});

describe("closingMinutes", () => {
  const running = last("trickle");
  const endingIn = (minutes: number) => ({ ...running, event: { ...running.event, endsAt: new Date(Date.parse(running.generatedAt) + minutes * 60_000).toISOString() } });

  test("counts down only in the last ten minutes", () => {
    expect(closingMinutes(endingIn(8.5))).toBe(9);
    expect(closingMinutes(endingIn(11))).toBeNull();
    expect(closingMinutes(running)).toBeNull();
  });

  test("is silent once the event is over", () => {
    expect(closingMinutes(last("ended"))).toBeNull();
  });
});
