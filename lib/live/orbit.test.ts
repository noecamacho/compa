import { describe, expect, test } from "bun:test";
import type { LiveSnapshotT } from "@/lib/api/schemas";
import { scenarioFrames } from "@/lib/testing/live-scenarios";
import { buildLayout, CHORD_LIMIT, chordControl, curvePoint, easeInOut, ellipsize, firstName, initials, makeDust, nearestDot, ringCountFor, ringSizes } from "./orbit";

const snapshotOf = (people: number): LiveSnapshotT => {
  const frame = scenarioFrames("rush").at(-1);
  if (!frame) throw new Error("no frames");
  const ids = Array.from({ length: people }, (_, index) => `p${index}`);
  const connections = ids.slice(1).map((id, index) => ({ id: `c${index}`, a: "p0", b: id, kind: "new" as const, at: frame.generatedAt }));
  return { ...frame, people: ids.map((id) => ({ id, name: `Person ${id}`, photoUrl: null, points: 0, connections: 0 })), connections };
};

describe("rings", () => {
  test.each([0, 1, 10, 11, 60, 200, 2500])("%i people fill the rings exactly, ten at most on the inner one", (people) => {
    const sizes = ringSizes(people, ringCountFor(people));
    expect(sizes.reduce((sum, size) => sum + size, 0)).toBe(people);
    expect(sizes[0]).toBe(Math.min(10, people));
    expect(sizes.every((size) => size >= 0)).toBe(true);
  });

  test("ring count grows from 3 to 5 with the crowd", () => {
    expect([ringCountFor(0), ringCountFor(100), ringCountFor(2500)]).toEqual([3, 4, 5]);
  });

  test("outer rings hold more people the further out they are", () => {
    const sizes = ringSizes(2500, 5);
    expect(sizes.slice(1)).toEqual([...sizes.slice(1)].sort((a, b) => a - b));
  });
});

describe("buildLayout", () => {
  test("ranks the top ten on ring 0 and indexes everyone", () => {
    const layout = buildLayout(snapshotOf(40));
    expect(layout.rings[0]?.map((dot) => dot.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(layout.byId.get("p39")?.index).toBe(39);
  });

  test("an empty room still has empty rings to turn", () => {
    const layout = buildLayout(snapshotOf(0));
    expect(layout.rings).toHaveLength(3);
    expect(layout.chords).toHaveLength(0);
  });

  test("keeps only the newest chords and skips links to unknown people", () => {
    const base = snapshotOf(300);
    const strangers = { id: "x", a: "ghost", b: "p1", kind: "new" as const, at: base.generatedAt };
    const layout = buildLayout({ ...base, connections: [...base.connections, strangers] });
    expect(layout.chords).toHaveLength(CHORD_LIMIT - 1);
    expect(layout.chords.at(-1)?.id).toBe("c298");
  });
});

describe("curves", () => {
  test("a comet starts at A and ends at B", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 0 };
    const control = chordControl(a, b, { x: 50, y: 80 });
    expect(curvePoint(a, control, b, 0)).toEqual(a);
    expect(curvePoint(a, control, b, 1)).toEqual(b);
    expect(curvePoint(a, control, b, 0.5).y).toBeGreaterThan(0);
  });

  test("easing is monotonic from 0 to 1", () => {
    expect([easeInOut(0), easeInOut(0.5), easeInOut(1)]).toEqual([0, 0.5, 1]);
  });
});

describe("hit testing", () => {
  const dots = buildLayout(snapshotOf(3)).dots;
  dots.forEach((dot, index) => Object.assign(dot, { x: index * 100, y: 0 }));

  test("picks the nearest dot within the radius", () => {
    expect(nearestDot(dots, 108, 6, 16)?.id).toBe("p1");
  });

  test("empty space picks nothing", () => {
    expect(nearestDot(dots, 50, 50, 16)).toBeNull();
  });
});

describe("labels", () => {
  test("first names, initials and ellipsis", () => {
    expect(firstName("  Ana María López ")).toBe("Ana");
    expect(initials("ana maría lópez")).toBe("AM");
    expect(initials("")).toBe("");
    expect(ellipsize("Bartholomew", 6)).toBe("Barth…");
    expect(ellipsize("Ana", 6)).toBe("Ana");
  });
});

describe("dust", () => {
  test("is deterministic and in unit coordinates", () => {
    const dust = makeDust(48);
    expect(dust).toEqual(makeDust(48));
    expect(dust.every((mote) => mote.x >= 0 && mote.x < 1 && mote.y >= 0 && mote.y < 1)).toBe(true);
  });
});
