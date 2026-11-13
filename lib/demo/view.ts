// D2: the shared room as one visitor sees it. Their accepted connections join the clock-driven graph, so their points,
// their place and their link on the big screen move with what they do, and nobody else's room changes.
import type { LiveSnapshotT } from "../api/schemas";
import { LIVE_LOOK_ROWS } from "../live/live-model";
import { CONNECTION_POINTS } from "../points";
import type { DemoPerson } from "./cast";
import { demoScenario, type DemoLivePerson, type DemoScenario } from "./scenario";
import { acceptedAt, demoConnectionId, isAccepted, kindOf, linkPoints, visitorCard, type VisitorLink, type VisitorState } from "./visitor";

type LiveLink = LiveSnapshotT["connections"][number];

export type DemoView = {
  now: number;
  room: DemoScenario;
  visitor: VisitorState;
  me: DemoPerson;
  // Cast and visitor in leaderboard order, with the visitor's connections counted.
  people: DemoLivePerson[];
  // Every accepted connection, oldest first.
  links: LiveLink[];
  // Cast and visitor by id.
  byId: Map<string, DemoPerson>;
};

const livePersonOf = (person: DemoPerson): DemoLivePerson => ({
  id: person.id, name: person.name, photoUrl: person.photoUrl,
  avatar: person.avatar, avatarMode: person.avatarMode, points: 0, connections: 0,
});

function visitorLiveLink(link: VisitorLink, me: DemoPerson, other: DemoPerson): LiveLink {
  const [a, b] = link.direction === "sent" ? [me.id, other.id] : [other.id, me.id];
  return { id: demoConnectionId(link.person), a, b, kind: kindOf(link), at: new Date(acceptedAt(link)).toISOString() };
}

function score(people: Map<string, DemoLivePerson>, id: string, points: number): void {
  const person = people.get(id);
  if (!person) return;
  person.points += points;
  person.connections++;
}

export function demoView(visitor: VisitorState, now: number): DemoView {
  const room = demoScenario(now);
  const me = visitorCard(visitor);
  const accepted = visitor.links.filter((link) => isAccepted(link, now));
  const people = new Map(room.live.people.map((person) => [person.id, { ...person }]));
  people.set(me.id, livePersonOf(me));
  const extra: LiveLink[] = [];
  for (const link of accepted) {
    const other = room.cast[link.person];
    if (!other) continue;
    score(people, me.id, linkPoints(link).total);
    score(people, other.id, CONNECTION_POINTS[kindOf(link)]);
    extra.push(visitorLiveLink(link, me, other));
  }
  // Stable sort: ties keep check-in order, and the visitor checked in last.
  const ranked = [...people.values()].sort((a, b) => b.points - a.points || b.connections - a.connections);
  const links = [...room.live.connections, ...extra].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const byId = new Map([...room.cast, me].map((person) => [person.id, person]));
  return { now, room, visitor, me, people: ranked, links, byId };
}

// Like the real snapshot (lib/server/live.ts), only the rows the board draws carry their monito.
const boardPerson = ({ avatar, avatarMode, ...person }: DemoLivePerson, index: number): LiveSnapshotT["people"][number] =>
  index < LIVE_LOOK_ROWS ? { ...person, avatar, avatarMode } : person;

export function demoSnapshot(view: DemoView): LiveSnapshotT {
  const reconnections = view.links.filter((link) => link.kind === "reconnection").length;
  return {
    ...view.room.live,
    people: view.people.map(boardPerson),
    connections: view.links,
    counters: { checkedIn: view.people.length, connections: view.links.length, newCount: view.links.length - reconnections, reconnections },
  };
}

// Rank among people with points, as on the boards; null before the first point.
export function standingOf(view: DemoView, id: string): { rank: number | null; points: number } {
  const onBoard = view.people.filter((person) => person.points > 0);
  const index = onBoard.findIndex((person) => person.id === id);
  const points = view.people.find((person) => person.id === id)?.points ?? 0;
  return { rank: index >= 0 ? index + 1 : null, points };
}
