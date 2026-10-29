// Scripted activity for the projected live board (/e/<code>/live): deterministic snapshot sequences for every
// scenario the big screen must survive (docs/research/live-dataviz.md). Playwright serves the frames to the board's
// poll; unit tests and prototypes read them directly. No database, no LinkedIn: everything is generated here.
import { LIVE_LINK_LIMIT } from "../live/live-model";
import { CONNECTION_POINTS } from "../points";
import type { ConnectionKindT, LiveSnapshotT } from "../api/schemas";

export const SCENARIOS = [
  "zero",
  "upcoming",
  "oneAttendee",
  "trickle",
  "quiet",
  "rush",
  "ended",
  "afterEvent",
  "thousands",
  "longNames",
  "missingPhotos",
  "ties",
  "reconnects",
] as const;
export type ScenarioName = (typeof SCENARIOS)[number];

type Phase = "upcoming" | "running" | "ended";

type Spec = {
  people: number;
  // Accepted connections already on the board when the first frame is served.
  links: number;
  // Connections accepted between consecutive frames (one frame per poll, 3 s apart).
  perFrame: number;
  frames: number;
  phase: Phase;
  reconnectionShare: number;
  // How far back the existing connections are spread, in minutes before the first frame.
  spreadMinutes: number;
  // The event window relative to the first frame, in minutes.
  window: [number, number];
  // Minutes since the last connection when the first frame is served.
  idleMinutes?: number;
  name?: (index: number) => string;
  photo?: (index: number) => string | null;
  // Every person ends on the same points: tie-breaks fall to connections and check-in order.
  ties?: boolean;
};

export const SCENARIO_START = "2026-10-29T19:00:00.000Z";
export const FRAME_MS = 3000;
export const SCENARIO_CODE = "livedemo2026";

const FIRST = ["Ana", "Luis", "Sofía", "Diego", "Valeria", "Rodrigo", "Paola", "Ximena", "Carlos", "Mariana", "Emilio", "Renata", "Iván", "Lucía", "Andrés", "Camila"];
const LAST = ["García", "López", "Hernández", "Martínez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Cruz", "Morales"];
const LONG_NAMES = [
  "María Fernanda de los Ángeles Villaseñor-Castañeda",
  "Jean-Baptiste Emmanuel Zorg-Wolfeschlegelsteinhausen",
  "Guadalupe Xóchitl Ixchel Netzahualcóyotl Ramírez",
  "Bartholomew Maximilian Montgomery-Fitzgerald III",
];

// Mulberry32: small, fast and the same sequence on every run.
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (value: number, width: number) => value.toString(16).padStart(width, "0").slice(-width);

// A valid v4-shaped uuid derived from a namespace digit and a counter, so ids are stable and readable in failures.
export const scenarioId = (space: number, index: number): string => `${hex(space, 8)}-0000-4000-8000-${hex(index, 12)}`;

const defaultName = (index: number) => `${FIRST[index % FIRST.length]} ${LAST[Math.floor(index / FIRST.length) % LAST.length]}`;

const SPECS: Record<ScenarioName, Spec> = {
  zero: { people: 0, links: 0, perFrame: 0, frames: 3, phase: "running", reconnectionShare: 0, window: [-120, 120], spreadMinutes: 0 },
  upcoming: { people: 0, links: 0, perFrame: 0, frames: 2, phase: "upcoming", reconnectionShare: 0, window: [30, 240], spreadMinutes: 0 },
  oneAttendee: { people: 1, links: 0, perFrame: 0, frames: 3, phase: "running", reconnectionShare: 0, window: [-120, 120], spreadMinutes: 0 },
  trickle: { people: 24, links: 10, perFrame: 0.34, frames: 9, phase: "running", reconnectionShare: 0.2, window: [-120, 120], spreadMinutes: 25 },
  quiet: { people: 40, links: 30, perFrame: 0, frames: 4, phase: "running", reconnectionShare: 0.2, window: [-120, 120], spreadMinutes: 90, idleMinutes: 14 },
  rush: { people: 150, links: 240, perFrame: 6, frames: 10, phase: "running", reconnectionShare: 0.25, window: [-120, 120], spreadMinutes: 12 },
  ended: { people: 120, links: 300, perFrame: 0, frames: 2, phase: "ended", reconnectionShare: 0.25, window: [-240, -10], spreadMinutes: 120 },
  afterEvent: { people: 120, links: 300, perFrame: 0, frames: 2, phase: "ended", reconnectionShare: 0.25, window: [-840, -540], spreadMinutes: 600 },
  thousands: { people: 2500, links: 4000, perFrame: 25, frames: 4, phase: "running", reconnectionShare: 0.25, window: [-120, 120], spreadMinutes: 60 },
  longNames: {
    people: 12,
    links: 14,
    perFrame: 1,
    frames: 4,
    phase: "running",
    reconnectionShare: 0.2,
    spreadMinutes: 10,
    window: [-120, 120],
    name: (index) => LONG_NAMES[index % LONG_NAMES.length] ?? defaultName(index),
  },
  missingPhotos: {
    people: 20,
    links: 18,
    perFrame: 1,
    frames: 4,
    phase: "running",
    reconnectionShare: 0.2,
    spreadMinutes: 10,
    window: [-120, 120],
    // Every third person has no photo, every fifth has an expired LinkedIn URL that fails to load.
    photo: (index) => (index % 3 === 0 ? null : index % 5 === 0 ? "https://media.licdn.invalid/expired.jpg" : "/brand/compa-mark.png"),
  },
  ties: { people: 10, links: 0, perFrame: 0, frames: 2, phase: "running", reconnectionShare: 0, window: [-120, 120], spreadMinutes: 0, ties: true },
  reconnects: { people: 30, links: 20, perFrame: 1, frames: 6, phase: "running", reconnectionShare: 0.9, window: [-120, 120], spreadMinutes: 15 },
};

type Link = { id: string; a: number; b: number; kind: ConnectionKindT; at: number };

function pickPair(random: () => number, people: number, taken: Set<string>): [number, number] | null {
  for (let attempt = 0; attempt < 40; attempt++) {
    const a = Math.floor(random() * people);
    const b = Math.floor(random() * people);
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (a === b || taken.has(key)) continue;
    taken.add(key);
    return [a, b];
  }
  return null;
}

function snapshotAt(spec: Spec, links: Link[], now: number, start: number): LiveSnapshotT {
  const points = new Array<number>(spec.people).fill(0);
  const degree = new Array<number>(spec.people).fill(0);
  for (const link of links) {
    for (const end of [link.a, link.b]) {
      points[end] = (points[end] ?? 0) + CONNECTION_POINTS[link.kind];
      degree[end] = (degree[end] ?? 0) + 1;
    }
  }
  const order = Array.from({ length: spec.people }, (_, index) => index).sort(
    (x, y) => (points[y] ?? 0) - (points[x] ?? 0) || (degree[y] ?? 0) - (degree[x] ?? 0) || x - y,
  );
  const people = order.map((index) => ({
    id: scenarioId(1, index),
    name: (spec.name ?? defaultName)(index),
    photoUrl: spec.photo?.(index) ?? null,
    points: spec.ties ? 100 : (points[index] ?? 0),
    connections: degree[index] ?? 0,
  }));
  // Mirrors the server: the newest LIVE_LINK_LIMIT links travel, the counters count them all.
  const connections = links.slice(-LIVE_LINK_LIMIT).map((link) => ({ id: link.id, a: scenarioId(1, link.a), b: scenarioId(1, link.b), kind: link.kind, at: new Date(link.at).toISOString() }));
  const reconnections = links.filter((link) => link.kind === "reconnection").length;
  return {
    event: {
      code: SCENARIO_CODE,
      name: "Codex Build Day Guadalajara",
      isRunning: spec.phase === "running",
      phase: spec.phase,
      startsAt: new Date(start + spec.window[0] * 60_000).toISOString(),
      endsAt: new Date(start + spec.window[1] * 60_000).toISOString(),
    },
    people,
    connections,
    counters: { checkedIn: spec.people, connections: links.length, newCount: links.length - reconnections, reconnections },
    generatedAt: new Date(now).toISOString(),
  };
}

// Frames of one scenario, oldest first: frame i is what the board's i-th poll receives.
export function scenarioFrames(name: ScenarioName, seed = 7): LiveSnapshotT[] {
  const spec = SPECS[name];
  const random = rng(seed);
  const start = Date.parse(SCENARIO_START);
  const taken = new Set<string>();
  const links: Link[] = [];
  const add = (at: number) => {
    const pair = pickPair(random, spec.people, taken);
    if (!pair) return;
    const kind: ConnectionKindT = random() < spec.reconnectionShare ? "reconnection" : "new";
    links.push({ id: scenarioId(2, links.length), a: pair[0], b: pair[1], kind, at });
  };
  // Existing connections bunch toward the present (or the close), like a room warming up.
  const anchor = Math.min(start, start + spec.window[1] * 60_000) - (spec.idleMinutes ?? 0) * 60_000;
  for (let index = 0; index < spec.links; index++) add(anchor - spec.spreadMinutes * 60_000 * (1 - Math.sqrt(index / Math.max(1, spec.links))));
  const frames: LiveSnapshotT[] = [];
  let owed = 0;
  for (let frame = 0; frame < spec.frames; frame++) {
    const now = start + frame * FRAME_MS;
    owed += frame === 0 ? 0 : spec.perFrame;
    for (; owed >= 1; owed--) add(now - random() * FRAME_MS);
    frames.push(snapshotAt(spec, links, now, start));
  }
  return frames;
}
