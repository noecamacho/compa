import type { z } from "zod";
import type { ConnectionKindT, Event, LiveSnapshotT } from "../api/schemas";
import { CONNECTION_POINTS } from "../points";
import { demoCast, type DemoPerson } from "./cast";

export const DEMO_CYCLE_MS = 120_000;
export const DEMO_CONNECTION_MS = 3_000;
export const DEMO_EVENT_CODE = "compademo2026";
export const DEMO_EVENT_SLUG = "compa-demo";
const BASE_CONNECTIONS = 240;

export type DemoEvent = z.infer<typeof Event> & { id: string; code: string; timezone: string };
export type DemoLivePerson = LiveSnapshotT["people"][number] & Pick<DemoPerson, "avatar" | "avatarMode">;
export type DemoLiveSnapshot = Omit<LiveSnapshotT, "people"> & { people: DemoLivePerson[] };
export type DemoScenario = {
  cycle: number;
  elapsedMs: number;
  event: DemoEvent;
  cast: DemoPerson[];
  live: DemoLiveSnapshot;
};

function connectionsAt(cast: DemoPerson[], cycle: number, startsAt: number, elapsedMs: number): LiveSnapshotT["connections"] {
  const count = BASE_CONNECTIONS + Math.floor(elapsedMs / DEMO_CONNECTION_MS);
  return Array.from({ length: count }, (_, index) => {
    const a = cast[index % cast.length];
    const b = cast[(index + 1 + Math.floor(index / cast.length)) % cast.length];
    if (!a || !b) throw new Error("Demo connections require a nonempty cast");
    return {
      // Cycle-scoped IDs let the board recognize new activity after a replay resets.
      id: `${index.toString(16).padStart(8, "0")}-0002-4000-8000-${cycle.toString(16).padStart(12, "0")}`,
      a: a.id, b: b.id,
      kind: index % 4 === 0 ? "reconnection" : "new",
      at: new Date(startsAt + (index - BASE_CONNECTIONS + 1) * DEMO_CONNECTION_MS).toISOString(),
    };
  });
}

function awardPoints(people: Map<string, DemoLivePerson>, id: string, kind: ConnectionKindT): void {
  const person = people.get(id);
  if (!person) throw new Error("Demo connection references an unknown person");
  person.points += CONNECTION_POINTS[kind];
  person.connections++;
}

function scoredPeople(cast: DemoPerson[], connections: LiveSnapshotT["connections"]): DemoLivePerson[] {
  const people = cast.map((person) => ({
    id: person.id, name: person.name, photoUrl: person.photoUrl,
    avatar: person.avatar, avatarMode: person.avatarMode, points: 0, connections: 0,
  }));
  const byId = new Map(people.map((person) => [person.id, person]));
  for (const connection of connections) {
    awardPoints(byId, connection.a, connection.kind);
    awardPoints(byId, connection.b, connection.kind);
  }
  // Stable sort preserves cast/check-in order when both score and degree tie.
  return people.sort((a, b) => b.points - a.points || b.connections - a.connections);
}

/** Pure shared-room state. Pass the same Unix milliseconds in every route of one request. */
export function demoScenario(nowMs: number): DemoScenario {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new RangeError("Expected nonnegative integer Unix milliseconds");
  const cycle = Math.floor(nowMs / DEMO_CYCLE_MS);
  const elapsedMs = nowMs % DEMO_CYCLE_MS;
  const cycleStart = nowMs - elapsedMs;
  const cast = demoCast();
  const connections = connectionsAt(cast, cycle, cycleStart, elapsedMs);
  const reconnections = connections.filter((connection) => connection.kind === "reconnection").length;
  const event: DemoEvent = {
    id: "de000003-0000-4000-8000-000000000000", slug: DEMO_EVENT_SLUG,
    code: DEMO_EVENT_CODE, name: "COMPA Community Night", timezone: "America/Mexico_City",
    startsAt: new Date(cycleStart - 30 * 60_000).toISOString(),
    endsAt: new Date(cycleStart + 90 * 60_000).toISOString(), isRunning: true,
  };
  return {
    cycle, elapsedMs, event, cast,
    live: {
      event: { code: event.code, name: event.name, isRunning: true, phase: "running", startsAt: event.startsAt, endsAt: event.endsAt },
      people: scoredPeople(cast, connections), connections,
      counters: { checkedIn: cast.length, connections: connections.length, newCount: connections.length - reconnections, reconnections },
      generatedAt: new Date(nowMs).toISOString(),
    },
  };
}
