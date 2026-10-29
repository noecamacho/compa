// Pure reads of a live snapshot for the projected board: the room's mood, its pulse, the activity feed and the
// ranking with ties. The snapshot's own `generatedAt` is the clock, so a projector with a wrong clock still agrees.
import type { LiveSnapshotT } from "@/lib/api/schemas";

// The snapshot carries at most this many connections, the newest; counters still count them all. Past it the loom is
// a dense weave anyway, and a 4,000-link payload cost 1 MB and a quarter second of main thread per poll. Read by lib/server/live.ts.
// shortcut: the pulse undercounts if more than this many land within its 30 minutes; send per-minute counts then.
export const LIVE_LINK_LIMIT = 1000;

// Ranking rows on the big screen: five stay readable from 10 m next to the feed (more clip at 1920×1080).
export const LIVE_BOARD_ROWS = 5;

export type Mood = "upcoming" | "empty" | "quiet" | "steady" | "rush" | "ended";

export const PULSE_MINUTES = 30;
const RECENT_MINUTES = 5;
// No accepted connection for this long while the event runs: the room went quiet.
const QUIET_MINUTES = 10;
// A rush is at least this many connections in five minutes, or one per three people in the room.
const RUSH_FLOOR = 12;
const RUSH_SHARE = 1 / 3;

const MINUTE = 60_000;

const nowOf = (snapshot: LiveSnapshotT): number => Date.parse(snapshot.generatedAt);

export function recentCount(snapshot: LiveSnapshotT, minutes = RECENT_MINUTES): number {
  const since = nowOf(snapshot) - minutes * MINUTE;
  return snapshot.connections.filter((link) => Date.parse(link.at) > since).length;
}

export function moodOf(snapshot: LiveSnapshotT): Mood {
  if (snapshot.event.phase === "upcoming") return "upcoming";
  if (snapshot.event.phase === "ended") return "ended";
  const last = snapshot.connections.at(-1);
  if (!last) return "empty";
  if (nowOf(snapshot) - Date.parse(last.at) > QUIET_MINUTES * MINUTE) return "quiet";
  const rushAt = Math.max(RUSH_FLOOR, Math.ceil(snapshot.people.length * RUSH_SHARE));
  return recentCount(snapshot) >= rushAt ? "rush" : "steady";
}

// Accepted connections per minute over the last half hour, oldest minute first; the last bar is the current minute.
// After the close it shows the event's last half hour, so the wrap-up screen still has its heartbeat hours later.
export function pulse(snapshot: LiveSnapshotT, minutes = PULSE_MINUTES): number[] {
  const now = snapshot.event.phase === "ended" ? Math.min(nowOf(snapshot), Date.parse(snapshot.event.endsAt)) : nowOf(snapshot);
  const bars = new Array<number>(minutes).fill(0);
  for (const link of snapshot.connections) {
    const age = Math.floor((now - Date.parse(link.at)) / MINUTE);
    if (age < 0 || age >= minutes) continue;
    const slot = minutes - 1 - age;
    bars[slot] = (bars[slot] ?? 0) + 1;
  }
  return bars;
}

export type FeedItem = { id: string; a: string; b: string; kind: LiveSnapshotT["connections"][number]["kind"]; at: string };

// The latest connections, newest first, with the names on screen. Never anything said between them (p. 13).
export function feed(snapshot: LiveSnapshotT, limit: number): FeedItem[] {
  const names = new Map(snapshot.people.map((person) => [person.id, person.name]));
  const items: FeedItem[] = [];
  for (let index = snapshot.connections.length - 1; index >= 0 && items.length < limit; index--) {
    const link = snapshot.connections[index];
    const a = link && names.get(link.a);
    const b = link && names.get(link.b);
    if (!link || !a || !b) continue;
    items.push({ id: link.id, a, b, kind: link.kind, at: link.at });
  }
  return items;
}

export type BoardRow = LiveSnapshotT["people"][number] & { rank: number };

// People arrive ranked (points, connections, check-in). Equal points and connections share a place (1, 1, 3):
// check-in order still breaks the tie for the order on screen, but nobody is shown as "behind" an equal.
export function boardRows(snapshot: LiveSnapshotT): BoardRow[] {
  const rows: BoardRow[] = [];
  for (const [index, person] of snapshot.people.entries()) {
    const previous = rows.at(-1);
    const tied = previous && previous.points === person.points && previous.connections === person.connections;
    rows.push({ rank: tied ? previous.rank : index + 1, ...person });
  }
  return rows;
}

// Whole minutes left while an event runs, only inside its last ten (the closing call); null otherwise.
export function closingMinutes(snapshot: LiveSnapshotT): number | null {
  if (snapshot.event.phase !== "running") return null;
  const left = Math.ceil((Date.parse(snapshot.event.endsAt) - nowOf(snapshot)) / MINUTE);
  return left > 0 && left <= 10 ? left : null;
}

// Snapshots can arrive out of order (a CDN serving a stale copy): never step the board back in time.
export const isNewer = (next: LiveSnapshotT, current: LiveSnapshotT): boolean => Date.parse(next.generatedAt) >= Date.parse(current.generatedAt);
