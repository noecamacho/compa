// What changed between two live snapshots, as events a visualization can celebrate: a check-in, an accepted
// connection, points scored, a move up the ranking. Only real data moves anything: the first snapshot seeds and emits
// nothing, and a snapshot that changed nothing yields no events (docs/research/live-dataviz.md).
import type { LiveSnapshotT } from "@/lib/api/schemas";

type Link = LiveSnapshotT["connections"][number];

export type LiveEvent =
  | { kind: "checkin"; key: string; id: string; name: string }
  | { kind: "connection"; key: string; id: string; a: string; b: string; aName: string; bName: string; link: Link["kind"] }
  | { kind: "points"; key: string; id: string; name: string; gained: number }
  | { kind: "rank"; key: string; id: string; name: string; from: number; to: number };

type Known = { id: string; points: number; rank: number };

export type Seen = { links: Set<string>; people: Map<string, Known> };

// Only a climb into the top this many places is an event: a move from 812 to 790 says nothing on a big screen.
export const RANK_SPOTLIGHT = 5;

export const seenOf = (snapshot: LiveSnapshotT): Seen => ({
  links: new Set(snapshot.connections.map((link) => link.id)),
  people: new Map(snapshot.people.map((person, index): [string, Known] => [person.id, { id: person.id, points: person.points, rank: index + 1 }])),
});

// Events in `next` that `seen` did not know, oldest first: check-ins, then connections, points, then rank climbs.
export function eventsSince(seen: Seen | null, next: LiveSnapshotT): LiveEvent[] {
  if (!seen) return [];
  const names = new Map(next.people.map((person) => [person.id, person.name]));
  const events: LiveEvent[] = [];
  next.people.forEach((person, index) => {
    const known = seen.people.get(person.id);
    if (!known) {
      events.push({ kind: "checkin", key: `checkin:${person.id}`, id: person.id, name: person.name });
      return;
    }
    const gained = person.points - known.points;
    if (gained > 0) events.push({ kind: "points", key: `points:${person.id}:${person.points}`, id: person.id, name: person.name, gained });
    const rank = index + 1;
    if (rank < known.rank && rank <= RANK_SPOTLIGHT) events.push({ kind: "rank", key: `rank:${person.id}:${rank}`, id: person.id, name: person.name, from: known.rank, to: rank });
  });
  for (const link of next.connections) {
    if (seen.links.has(link.id)) continue;
    const aName = names.get(link.a);
    const bName = names.get(link.b);
    if (!aName || !bName) continue;
    events.push({ kind: "connection", key: `link:${link.id}`, id: link.id, a: link.a, b: link.b, aName, bName, link: link.kind });
  }
  return events;
}

// A rush of hundreds of events in one poll would take minutes to announce one by one: keep the newest few, counting
// the rest in `dropped` so a view can still say "and 212 more".
export const MAX_EVENTS_PER_POLL = 6;

export function trimEvents(events: LiveEvent[], limit = MAX_EVENTS_PER_POLL): { events: LiveEvent[]; dropped: number } {
  if (events.length <= limit) return { events, dropped: 0 };
  // Connections say the most (two names); keep those first, newest first.
  const links = events.filter((event) => event.kind === "connection");
  const others = events.filter((event) => event.kind !== "connection");
  const kept = [...links.slice(-limit), ...others].slice(0, limit);
  return { events: kept, dropped: events.length - kept.length };
}
