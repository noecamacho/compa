// Pure layout of the Garden view: the top people are flowers whose stems grow with points, everyone else is a blade of
// grass. Positions are deterministic per rank, so a flower never jumps when the snapshot refreshes.
import type { LiveSnapshotT } from "@/lib/api/schemas";

export const FLOWERS = 28;
export const GRASS_MAX = 220;
const MIN_STEM = 0.22;

export type Flower = { id: string; name: string; rank: number; x: number; stem: number; petals: number; hue: number; points: number };

const fraction = (value: number): number => value - Math.floor(value);

// Rank 1 near the middle, the rest fanning out left and right, with a golden-ratio wobble so rows do not look ruled.
export function flowerX(rank: number, count: number): number {
  const side = rank % 2 === 0 ? 1 : -1;
  const step = Math.ceil((rank - 1) / 2) / Math.max(1, Math.ceil((count - 1) / 2));
  return 0.5 + side * step * 0.46 + (fraction(rank * 0.618) - 0.5) * 0.03;
}

// Stem height as a share of the stage: the leader reaches the top, nobody falls under a stub.
export const stemOf = (points: number, leaderPoints: number): number => (leaderPoints <= 0 ? MIN_STEM : Math.max(MIN_STEM, 0.2 + 0.7 * (points / leaderPoints) ** 2));

export function flowers(snapshot: LiveSnapshotT): Flower[] {
  const top = snapshot.people.slice(0, FLOWERS);
  const leader = top[0]?.points ?? 0;
  return top.map((person, index) => ({
    id: person.id,
    name: person.name,
    rank: index + 1,
    x: flowerX(index + 1, top.length),
    stem: stemOf(person.points, leader),
    petals: 5 + (index % 3),
    hue: fraction(index * 0.618) * 360,
    points: person.points,
  }));
}

// How many grass blades to draw for the people who are not flowers.
export const grassCount = (snapshot: LiveSnapshotT): number => Math.min(GRASS_MAX, Math.max(0, snapshot.people.length - FLOWERS));
