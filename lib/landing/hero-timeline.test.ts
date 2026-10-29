import { describe, expect, test } from "bun:test";
import {
  BEATS,
  CYCLE_SECONDS,
  HOMES,
  LOOP_SECONDS,
  PHASES,
  actorAt,
  easeOutBack,
  linksAt,
  meetingSpots,
  momentAt,
  popScale,
  progress,
  roleOf,
} from "./hero-timeline";

const at = (index: number, t: number) => index * CYCLE_SECONDS + t;

describe("momentAt", () => {
  test("splits time into loop, beat and seconds inside the beat", () => {
    expect(momentAt(at(2, 3.5))).toMatchObject({ loop: 0, index: 2, t: 3.5 });
    expect(momentAt(LOOP_SECONDS + at(1, 0.25))).toMatchObject({ loop: 1, index: 1, t: 0.25 });
  });

  test("clamps negative time to the start", () => {
    expect(momentAt(-5)).toMatchObject({ loop: 0, index: 0, t: 0 });
  });
});

describe("easing", () => {
  test("progress clamps to 0..1", () => {
    expect(progress(0, [1, 2])).toBe(0);
    expect(progress(1.5, [1, 2])).toBe(0.5);
    expect(progress(9, [1, 2])).toBe(1);
  });

  test("easeOutBack starts at 0, overshoots and ends at 1", () => {
    expect(easeOutBack(0)).toBeCloseTo(0);
    expect(easeOutBack(0.6)).toBeGreaterThan(1);
    expect(easeOutBack(1)).toBeCloseTo(1);
  });

  test("popScale is 0 outside its span and 1 while holding", () => {
    expect(popScale(0.5, [1, 3])).toBe(0);
    expect(popScale(2, [1, 3])).toBeCloseTo(1);
    expect(popScale(3, [1, 3])).toBe(0);
  });
});

describe("the pair", () => {
  test("every beat pairs two different people from the cast", () => {
    for (const beat of BEATS) {
      expect(beat.a).not.toBe(beat.b);
      expect(HOMES[beat.a]).toBeDefined();
      expect(HOMES[beat.b]).toBeDefined();
    }
  });

  test("a reencuentro only repeats a pair that already met", () => {
    BEATS.forEach((beat, i) => {
      if (beat.kind !== "reconnection") return;
      const met = BEATS.slice(0, i).some((before) => new Set([before.a, before.b, beat.a, beat.b]).size === 2);
      expect(met).toBe(true);
    });
  });

  test("they meet facing each other near the middle", () => {
    const { a, b } = meetingSpots({ a: 4, b: 5, kind: "new", topic: 0 });
    expect(a.x).toBeLessThan(b.x);
    expect(Math.abs((a.x + b.x) / 2)).toBeLessThanOrEqual(2.0);
  });

  test("they walk to the meeting spot and back to their seats", () => {
    const beat = BEATS[0];
    if (!beat) throw new Error("no beats");
    const meet = meetingSpots(beat).a;
    const talking = actorAt(beat.a, at(0, PHASES.talkA[0]));
    expect(talking.x).toBeCloseTo(meet.x, 5);
    const back = actorAt(beat.a, at(0, CYCLE_SECONDS - 0.5));
    expect(Math.abs(back.x - (HOMES[beat.a]?.x ?? 0))).toBeLessThan(0.2);
    expect(actorAt(beat.a, at(0, 1.8)).walking).toBe(true);
  });

  test("bystanders never walk or hop", () => {
    const bystander = HOMES.findIndex((_, i) => roleOf(i, BEATS[0] ?? { a: 0, b: 0, kind: "new", topic: 0 }) === "idle");
    for (let t = 0; t < CYCLE_SECONDS; t += 0.25) {
      const actor = actorAt(bystander, t);
      expect(actor.walking).toBe(false);
      expect(actor.hop).toBe(0);
    }
  });

  test("both hop when the points land", () => {
    const beat = BEATS[0];
    if (!beat) throw new Error("no beats");
    const mid = (PHASES.cheer[0] + PHASES.cheer[1]) / 2;
    expect(actorAt(beat.a, mid).hop).toBeGreaterThan(0.3);
    expect(actorAt(beat.b, mid).hop).toBeGreaterThan(0.3);
  });
});

describe("linksAt", () => {
  test("no thread before the first pair connects", () => {
    expect(linksAt(at(0, PHASES.thread[0]))).toHaveLength(0);
  });

  test("the thread draws in, then stays as the network grows", () => {
    const drawing = linksAt(at(0, (PHASES.thread[0] + PHASES.thread[1]) / 2));
    expect(drawing).toHaveLength(1);
    expect(drawing[0]?.draw).toBeGreaterThan(0);
    expect(drawing[0]?.draw).toBeLessThan(1);
    expect(linksAt(at(2, CYCLE_SECONDS - 1)).map((link) => link.draw)).toEqual([1, 1, 1]);
  });

  test("a reencuentro recolors the existing thread instead of adding one", () => {
    const links = linksAt(at(3, CYCLE_SECONDS - 1));
    expect(links).toHaveLength(3);
    expect(links.find((link) => link.key === "1-3")?.kind).toBe("reconnection");
  });

  test("the network fades out before the loop restarts", () => {
    const last = BEATS.length - 1;
    expect(linksAt(at(last, 8)).every((link) => link.opacity === 1)).toBe(true);
    expect(linksAt(at(last, CYCLE_SECONDS - 0.1)).every((link) => link.opacity === 0)).toBe(true);
    expect(linksAt(LOOP_SECONDS + 1)).toHaveLength(0);
  });
});
