import { describe, expect, test } from "bun:test";
import { Event, LiveSnapshot } from "../api/schemas";
import { eventsSince, seenOf } from "../live/events";
import { boardRows, feed, isNewer, LIVE_LINK_LIMIT } from "../live/live-model";
import { CONNECTION_POINTS } from "../points";
import { DEMO_CONNECTION_MS, DEMO_CYCLE_MS, demoScenario } from "./scenario";

const START = Date.parse("2026-11-11T18:00:00.000Z");

describe("clock-driven demo scenario", () => {
  test("the same time gives the same room, independent of request order", () => {
    const first = demoScenario(START + 12_345);
    demoScenario(START + DEMO_CYCLE_MS * 3);
    expect(demoScenario(START + 12_345)).toEqual(first);
    expect(demoScenario(START + 12_345)).not.toBe(first);
  });

  test("adds exactly one pair at the 3s boundary, preserving earlier pairs", () => {
    const before = demoScenario(START + DEMO_CONNECTION_MS - 1).live;
    const after = demoScenario(START + DEMO_CONNECTION_MS).live;
    expect(after.connections.slice(0, -1)).toEqual(before.connections);
    expect(after.counters.connections).toBe(before.counters.connections + 1);
    expect(after.connections.at(-1)?.at).toBe(after.generatedAt);
    expect(demoScenario(START).live.connections).toHaveLength(240);
  });

  test("keeps the poll fresh even when no connection arrives", () => {
    const a = demoScenario(START + 1).live;
    const b = demoScenario(START + 2).live;
    expect(b.connections).toEqual(a.connections);
    expect(isNewer(b, a)).toBe(true);
    expect(b.generatedAt).toBe(new Date(START + 2).toISOString());
  });

  test.each(Array.from({ length: DEMO_CYCLE_MS / DEMO_CONNECTION_MS }, (_, index) => index))(
    "frame %i has coherent counters, scores, times and unique pairs",
    (frame) => {
      const now = START + frame * DEMO_CONNECTION_MS;
      const { event, cast, live } = demoScenario(now);
      expect(Event.safeParse(event).success).toBe(true);
      expect(LiveSnapshot.safeParse(live).success).toBe(true);
      expect(live.event.phase).toBe("running");
      expect(Date.parse(event.startsAt)).toBeLessThan(now);
      expect(Date.parse(event.endsAt)).toBeGreaterThan(now);
      expect(live.connections.length).toBeLessThanOrEqual(LIVE_LINK_LIMIT);
      expect(live.counters.checkedIn).toBe(cast.length);
      expect(live.counters.connections).toBe(live.connections.length);
      expect(live.counters.connections).toBe(live.counters.newCount + live.counters.reconnections);
      expect(new Set(live.connections.map((link) => link.id)).size).toBe(live.connections.length);
      expect(new Set(live.connections.map((link) => [link.a, link.b].sort().join(":"))).size).toBe(live.connections.length);
      const ids = new Set(cast.map((person) => person.id));
      expect(live.connections.every((link) => ids.has(link.a) && ids.has(link.b) && link.a !== link.b)).toBe(true);
      expect(live.connections.every((link) => Date.parse(link.at) >= Date.parse(event.startsAt) && Date.parse(link.at) <= now)).toBe(true);
      const times = live.connections.map((link) => Date.parse(link.at));
      expect(times).toEqual([...times].sort((a, b) => a - b));
      const scores = live.people.map((person) => {
        const links = live.connections.filter((link) => link.a === person.id || link.b === person.id);
        return { points: links.reduce((sum, link) => sum + CONNECTION_POINTS[link.kind], 0), connections: links.length };
      });
      expect(live.people.map(({ points, connections }) => ({ points, connections }))).toEqual(scores);
      expect(scores).toEqual([...scores].sort((a, b) => b.points - a.points || b.connections - a.connections));
      expect(live.people.every((person) => person.avatarMode === "monito" && person.avatar)).toBe(true);
    },
  );

  test("replays at 120s with stable people, fresh link IDs and current timestamps", () => {
    const a = demoScenario(START + 6_000);
    const b = demoScenario(START + DEMO_CYCLE_MS + 6_000);
    expect(b.cycle).toBe(a.cycle + 1);
    expect(b.elapsedMs).toBe(a.elapsedMs);
    expect(b.cast).toEqual(a.cast);
    expect(b.live.people).toEqual(a.live.people);
    expect(b.live.counters).toEqual(a.live.counters);
    const oldIds = new Set(a.live.connections.map((link) => link.id));
    expect(b.live.connections.some((link) => oldIds.has(link.id))).toBe(false);
    expect(Date.parse(b.live.connections.at(-1)?.at ?? "")).toBe(Date.parse(a.live.connections.at(-1)?.at ?? "") + DEMO_CYCLE_MS);
    expect(demoScenario(START + DEMO_CYCLE_MS - 1).live.counters.connections).toBe(279);
    expect(demoScenario(START + DEMO_CYCLE_MS).live.counters.connections).toBe(240);
  });

  test("existing board ranking, feed and connection celebrations consume the snapshot", () => {
    const a = demoScenario(START).live;
    const b = demoScenario(START + DEMO_CONNECTION_MS).live;
    expect(boardRows(b)).toHaveLength(150);
    expect(feed(b, 4).length).toBeGreaterThan(0);
    expect(eventsSince(seenOf(a), b).some((event) => event.kind === "connection")).toBe(true);
  });

  test("caller mutations cannot change later responses or corrupt scores", () => {
    const a = demoScenario(START);
    const expected = demoScenario(START);
    a.cast.splice(0);
    a.live.connections.splice(0);
    const person = a.live.people[0];
    if (person) person.avatar.shirt = "#000000";
    expect(demoScenario(START)).toEqual(expected);
  });

  test.each([NaN, Infinity, -Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER])("rejects invalid clock %s", (now) => {
    expect(() => demoScenario(now)).toThrow(RangeError);
  });
});
