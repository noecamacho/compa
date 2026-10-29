import { describe, expect, test } from "bun:test";
import { scenarioFrames } from "@/lib/testing/live-scenarios";
import { eventsSince, seenOf, trimEvents, type LiveEvent } from "./events";

const frames = scenarioFrames("rush");
const first = frames[0]!;
const second = frames[1]!;

describe("eventsSince", () => {
  test("the first snapshot emits nothing", () => {
    expect(eventsSince(null, first)).toEqual([]);
  });

  test("an unchanged snapshot emits nothing", () => {
    expect(eventsSince(seenOf(first), first)).toEqual([]);
  });

  test("new links and their points become events with names", () => {
    const events = eventsSince(seenOf(first), second);
    const links = events.filter((event) => event.kind === "connection");
    expect(links.length).toBe(second.connections.length - first.connections.length);
    for (const link of links) {
      expect(link.aName.length).toBeGreaterThan(0);
      expect(link.bName.length).toBeGreaterThan(0);
    }
    expect(events.some((event) => event.kind === "points")).toBe(true);
  });

  test("a person missing from the last snapshot is a check-in; a climb into the top five is a rank event", () => {
    const seen = seenOf(first);
    const newcomer = { id: "00000000-0000-4000-8000-00000000ffff", name: "Zoe", photoUrl: null, points: 0, connections: 0 };
    const last = first.people.at(-1)!;
    const climber = { ...last, points: 10_000 };
    const next = { ...first, people: [climber, ...first.people.slice(0, -1), newcomer] };
    const events = eventsSince(seen, next);
    expect(events).toContainEqual({ kind: "checkin", key: `checkin:${newcomer.id}`, id: newcomer.id, name: "Zoe" });
    const rank = events.find((event) => event.kind === "rank");
    expect(rank).toMatchObject({ id: last.id, to: 1, from: first.people.length });
  });
});

describe("trimEvents", () => {
  test("keeps connections first and counts the rest", () => {
    const link = (index: number): LiveEvent => ({ kind: "connection", key: `l${index}`, id: `l${index}`, a: "a", b: "b", aName: "A", bName: "B", link: "new" });
    const points = (index: number): LiveEvent => ({ kind: "points", key: `p${index}`, id: `p${index}`, name: "P", gained: 1 });
    const events = [points(0), points(1), link(0), link(1), link(2), link(3), link(4), link(5), link(6), link(7)];
    const trimmed = trimEvents(events, 4);
    expect(trimmed.events.map((event) => event.key)).toEqual(["l4", "l5", "l6", "l7"]);
    expect(trimmed.dropped).toBe(6);
  });
});
