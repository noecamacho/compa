// Pure layout of the Skyline view: an isometric city where every person is a building whose floors are points.
// Leaders stand at the back centre so nothing hides them; the painter's order is back row first.
import type { LiveSnapshotT } from "@/lib/api/schemas";

export const BUILDINGS_MAX = 72;
export const MAX_FLOORS = 18;
export const MIN_FLOORS = 1;

export type Building = { id: string; name: string; rank: number; col: number; row: number; floors: number; windows: number; hue: number };

const fraction = (value: number): number => value - Math.floor(value);

// Floors from points relative to the leader, who reaches MAX_FLOORS; a newcomer with nothing still gets a ground floor.
export const floorsOf = (points: number, leaderPoints: number): number => (leaderPoints <= 0 ? MIN_FLOORS : Math.max(MIN_FLOORS, Math.round((points / leaderPoints) * MAX_FLOORS)));

// A square grid; rank 1 at the back middle, the rest spiralling out towards the front corners.
export function gridSize(count: number): number {
  return Math.max(2, Math.ceil(Math.sqrt(count)));
}

export function placeOf(rank: number, size: number): { col: number; row: number } {
  const index = rank - 1;
  const row = Math.floor(index / size);
  const offset = index % size;
  // Alternate left and right of the middle so the leaders cluster in the centre of each row.
  const middle = Math.floor(size / 2);
  const col = offset % 2 === 0 ? middle + Math.ceil(offset / 2) : middle - Math.ceil(offset / 2);
  return { col: ((col % size) + size) % size, row };
}

export function buildings(snapshot: LiveSnapshotT): Building[] {
  const top = snapshot.people.slice(0, BUILDINGS_MAX);
  const leader = top[0]?.points ?? 0;
  const size = gridSize(top.length);
  return top.map((person, index) => ({
    id: person.id,
    name: person.name,
    rank: index + 1,
    ...placeOf(index + 1, size),
    floors: floorsOf(person.points, leader),
    windows: Math.min(6, person.connections),
    hue: 220 + fraction(index * 0.618) * 120,
  }));
}

export type Iso = { originX: number; originY: number; tile: number };

// Isometric projection of a grid cell corner (col,row at height z, in floors) to canvas pixels.
export function project(col: number, row: number, z: number, iso: Iso, floorHeight: number): [number, number] {
  const x = iso.originX + (col - row) * iso.tile;
  const y = iso.originY + (col + row) * iso.tile * 0.5 - z * floorHeight;
  return [x, y];
}
