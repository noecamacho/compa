// Pure math for the bar race: who is on the track, how long each bar is, who just scored, how rows slide, and the
// bubbles that keep an idle track moving. Numbers in, numbers out, so the component stays a thin renderer.
import type { BoardRow } from "@/lib/live/live-model";

export const RACE_SIZE = 8;
// Ghost rows shown while nobody has checked in, as shares of the track.
export const GHOST_WIDTHS = [0.9, 0.72, 0.56, 0.42, 0.3] as const;
// Even a zero-point bar keeps a stub, so the row never looks broken.
const MIN_RATIO = 0.04;

export const raceRows = (rows: readonly BoardRow[], limit = RACE_SIZE): BoardRow[] => rows.slice(0, limit);

export function barRatio(points: number, leaderPoints: number): number {
  if (leaderPoints <= 0) return MIN_RATIO;
  return Math.min(1, Math.max(MIN_RATIO, points / leaderPoints));
}

type Scored = { id: string; points: number };

export const pointsById = (people: readonly Scored[]): Map<string, number> => new Map(people.map((person): [string, number] => [person.id, person.points]));

// Rows whose points rose since the previous snapshot. No previous snapshot (first load) or an unseen person is not a gain.
export function gainedIds(previous: ReadonlyMap<string, number> | null, rows: readonly Scored[]): string[] {
  if (!previous) return [];
  return rows.filter((row) => row.points > (previous.get(row.id) ?? Number.POSITIVE_INFINITY)).map((row) => row.id);
}

// FLIP: for every row that moved, how far it must start from its new place (previous top minus new top).
export function flipDeltas(previous: ReadonlyMap<string, number>, next: ReadonlyMap<string, number>): Map<string, number> {
  const deltas = new Map<string, number>();
  for (const [id, top] of next) {
    const before = previous.get(id);
    if (before !== undefined && before !== top) deltas.set(id, before - top);
  }
  return deltas;
}

export const BUBBLE_COUNT = 10;

const fraction = (value: number): number => value - Math.floor(value);

export const bubbleRadius = (index: number): number => 4 + fraction(index * 0.618) * 8;

export const bubbleX = (index: number, seconds: number, width: number): number =>
  (0.05 + fraction(index * 0.381 + 0.13) * 0.9) * width + Math.sin(seconds * 0.7 + index * 1.9) * 14;

// Rises slowly and re-enters from the bottom; each bubble has its own speed and starting offset.
export function bubbleY(index: number, seconds: number, height: number): number {
  const span = height + 40;
  const speed = 14 + fraction(index * 0.737) * 18;
  return height + 20 - ((seconds * speed + fraction(index * 0.29) * span) % span);
}
