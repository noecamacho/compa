// Pure layout and math for the Orbit live visualization: ring assignment, chords, comet paths, labels and hit testing.
// Everything that depends on the ranking is computed once per snapshot; the canvas only rotates the angles each frame.
import type { LiveSnapshotT } from "@/lib/api/schemas";

export const INNER_RING_SIZE = 10;
export const CHORD_LIMIT = 150;
// Fractions of the half-width / half-height each ring spans; the first `ringCount` are used.
export const RING_FRACTIONS = [0.36, 0.55, 0.73, 0.88, 1] as const;
// Radians per second, inner ring fastest, so the whole view always turns.
export const RING_SPEEDS = [0.2, 0.13, 0.09, 0.065, 0.045] as const;

const MIN_RINGS = 3;
const RING_TWIST = 1.7;
const CHORD_PULL = 0.55;

export type Dot = { id: string; name: string; index: number; phase: number; x: number; y: number };
export type Chord = { id: string; a: Dot; b: Dot; reconnection: boolean };
export type OrbitLayout = { dots: Dot[]; rings: Dot[][]; byId: Map<string, Dot>; chords: Chord[] };

// 3 rings for a small room (the top 10 plus two outer rings), up to 5 for a crowd, so 2,500 dots stay readable.
export function ringCountFor(people: number): number {
  const outer = people - INNER_RING_SIZE;
  if (outer > 400) return 5;
  return outer > 80 ? 4 : MIN_RINGS;
}

// The top ten sit on the inner ring; the rest fill the outer rings in proportion to their circumference.
export function ringSizes(people: number, rings: number): number[] {
  const inner = Math.min(INNER_RING_SIZE, people);
  const rest = people - inner;
  const weights = RING_FRACTIONS.slice(1, rings);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const sizes = [inner];
  let given = 0;
  let cumulative = 0;
  for (const weight of weights) {
    cumulative += weight;
    const upTo = Math.round((rest * cumulative) / total);
    sizes.push(upTo - given);
    given = upTo;
  }
  return sizes;
}

export function buildLayout(snapshot: LiveSnapshotT): OrbitLayout {
  const ringCount = ringCountFor(snapshot.people.length);
  const sizes = ringSizes(snapshot.people.length, ringCount);
  const dots = snapshot.people.map((person, index): Dot => ({ id: person.id, name: person.name, index, phase: 0, x: 0, y: 0 }));
  const rings: Dot[][] = [];
  let start = 0;
  for (const [ring, size] of sizes.entries()) {
    const members = dots.slice(start, start + size);
    members.forEach((dot, slot) => (dot.phase = (slot / size) * Math.PI * 2 + ring * RING_TWIST));
    rings.push(members);
    start += size;
  }
  const byId = new Map(dots.map((dot) => [dot.id, dot]));
  return { dots, rings, byId, chords: buildChords(snapshot.connections, byId) };
}

function buildChords(connections: LiveSnapshotT["connections"], byId: Map<string, Dot>): Chord[] {
  const chords: Chord[] = [];
  for (const link of connections.slice(-CHORD_LIMIT)) {
    const a = byId.get(link.a);
    const b = byId.get(link.b);
    if (a && b) chords.push({ id: link.id, a, b, reconnection: link.kind === "reconnection" });
  }
  return chords;
}

export type Point = { x: number; y: number };

// Chords and comets bow toward the sun, so the links read as a web around it rather than straight spokes.
export function chordControl(a: Point, b: Point, center: Point): Point {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return { x: mx + (center.x - mx) * CHORD_PULL, y: my + (center.y - my) * CHORD_PULL };
}

export function curvePoint(a: Point, control: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
  };
}

export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// O(n) scan: only runs on a tap, never per frame.
export function nearestDot(dots: readonly Dot[], x: number, y: number, radius: number): Dot | null {
  let best: Dot | null = null;
  let bestDistance = radius;
  for (const dot of dots) {
    const distance = Math.hypot(dot.x - x, dot.y - y);
    if (distance > bestDistance) continue;
    best = dot;
    bestDistance = distance;
  }
  return best;
}

export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? "";

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function ellipsize(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars - 1))}…`;
}

export type Mote = { x: number; y: number; speed: number; size: number; phase: number; sky: boolean };

// Deterministic starfield dust, in unit coordinates; `speed` is the share of the width crossed per second.
export function makeDust(count: number): Mote[] {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand(),
    speed: 0.004 + rand() * 0.008,
    size: 1 + rand() * 2.2,
    phase: rand() * Math.PI * 2,
    sky: rand() < 0.4,
  }));
}
