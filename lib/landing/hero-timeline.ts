// The landing hero's story, as pure functions of time: two monitos meet, one scans the other's QR, they talk about a
// topic, a thread joins them and they earn points. Six beats loop; the scene (components/landing/hero-scene.ts) only
// draws what these functions return, so the choreography is testable without WebGL.

export type LinkKind = "new" | "reconnection";
export type Beat = { a: number; b: number; kind: LinkKind; topic: number };
export type Spot = { x: number; z: number };
export type Span = readonly [start: number, end: number];

export const CYCLE_SECONDS = 6.6;

// Cast seats on the floor (x across, z toward the camera): two loose rows so the crowd reads as a room, not a line.
export const HOMES: readonly Spot[] = [
  { x: -3.9, z: -0.5 },
  { x: -2.3, z: 0.9 },
  { x: -0.8, z: -0.9 },
  { x: 0.8, z: 0.8 },
  { x: 2.4, z: -0.8 },
  { x: 3.9, z: 0.6 },
];

// Who meets whom. The fourth beat is a reencuentro: the first pair meets again (+20, sky thread).
export const BEATS: readonly Beat[] = [
  { a: 1, b: 3, kind: "new", topic: 0 },
  { a: 4, b: 5, kind: "new", topic: 1 },
  { a: 0, b: 2, kind: "new", topic: 2 },
  { a: 3, b: 1, kind: "reconnection", topic: 0 },
  { a: 2, b: 4, kind: "new", topic: 1 },
  { a: 5, b: 3, kind: "new", topic: 2 },
];

export const LOOP_SECONDS = CYCLE_SECONDS * BEATS.length;

// Seconds inside one beat.
export const PHASES = {
  walkIn: [0, 1.2],
  scan: [1.2, 2.2],
  scanned: [1.7, 2.2],
  talkA: [2.2, 3.8],
  talkB: [2.9, 4.0],
  thread: [3.7, 4.4],
  cheer: [3.9, 4.4],
  points: [3.9, 6.1],
  walkOut: [4.8, 6.6],
} as const satisfies Record<string, Span>;

// The network fades during the tail of the last beat, so every loop starts on a clean floor.
export const NETWORK_FADE: Span = [4.8, 6.4];
export const POINTS: Record<LinkKind, number> = { new: 50, reconnection: 20 };

const MEET_GAP = 0.95;
const MEET_LIMIT = 2.0;
const LEAN = 0.09;

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
export const lerp = (from: number, to: number, k: number): number => from + (to - from) * k;
export const progress = (t: number, [start, end]: Span): number => clamp01((t - start) / (end - start));
export const within = (t: number, [start, end]: Span): boolean => t >= start && t < end;
export const easeInOutCubic = (k: number): number => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
export const easeOutCubic = (k: number): number => 1 - (1 - k) ** 3;
// Overshoots a little, then settles: the "pop" of a sticker landing.
export const easeOutBack = (k: number): number => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2;

export type Moment = { loop: number; index: number; beat: Beat; t: number };

export function momentAt(seconds: number): Moment {
  const total = Math.max(0, seconds);
  const loop = Math.floor(total / LOOP_SECONDS);
  const inLoop = total - loop * LOOP_SECONDS;
  const index = Math.min(BEATS.length - 1, Math.floor(inLoop / CYCLE_SECONDS));
  return { loop, index, beat: BEATS[index] as Beat, t: inLoop - index * CYCLE_SECONDS };
}

const homeOf = (i: number): Spot => HOMES[i] ?? { x: 0, z: 0 };

// The pair meets between their seats, pulled toward the middle so both bubbles fit on a phone.
export function meetingSpots(beat: Beat): { a: Spot; b: Spot } {
  const home = { a: homeOf(beat.a), b: homeOf(beat.b) };
  const mid = { x: Math.max(-MEET_LIMIT, Math.min(MEET_LIMIT, (home.a.x + home.b.x) / 2)), z: (home.a.z + home.b.z) / 2 + 0.35 };
  const side = home.a.x <= home.b.x ? -1 : 1;
  return { a: { x: mid.x + side * MEET_GAP, z: mid.z }, b: { x: mid.x - side * MEET_GAP, z: mid.z } };
}

// Idle drift: a small, slow wander around the seat so nobody stands frozen.
export function drifted(i: number, seconds: number): Spot {
  const home = homeOf(i);
  return { x: home.x + Math.sin(seconds * 0.45 + i * 1.3) * 0.14, z: home.z + Math.cos(seconds * 0.37 + i * 2.1) * 0.1 };
}

export type Role = "a" | "b" | "idle";

export function roleOf(i: number, beat: Beat): Role {
  if (i === beat.a) return "a";
  if (i === beat.b) return "b";
  return "idle";
}

export type Actor = { x: number; z: number; walking: boolean; lean: number; hop: number };

// Idle monitos glance left or right now and then; the sign flips at uneven times per person.
function glance(i: number, seconds: number): number {
  return Math.sin(seconds * 0.31 + i * 1.7) + Math.sin(seconds * 0.17 + i) * 0.6 > 0 ? 1 : -1;
}

// A quick hop: the scanner when the QR reads, both when the points land.
function hopAt(role: Role, t: number): number {
  if (role === "idle") return 0;
  if (within(t, PHASES.cheer)) return Math.sin(Math.PI * progress(t, PHASES.cheer)) * 0.55;
  if (role === "a" && within(t, PHASES.scanned)) return Math.sin(Math.PI * progress(t, PHASES.scanned)) * 0.3;
  return 0;
}

export function actorAt(i: number, seconds: number): Actor {
  const { beat, t } = momentAt(seconds);
  const role = roleOf(i, beat);
  const home = drifted(i, seconds);
  if (role === "idle") return { ...home, walking: false, lean: glance(i, seconds) * LEAN * 0.5, hop: 0 };
  const meet = meetingSpots(beat)[role];
  const k = easeInOutCubic(progress(t, PHASES.walkIn)) * (1 - easeInOutCubic(progress(t, PHASES.walkOut)));
  const walking = within(t, PHASES.walkIn) || within(t, PHASES.walkOut);
  const toward = Math.sign(meet.x - home.x) || 1;
  const lean = within(t, PHASES.walkOut) ? -toward : toward;
  return { x: lerp(home.x, meet.x, k), z: lerp(home.z, meet.z, k), walking, lean: lean * LEAN, hop: hopAt(role, t) };
}

export type LinkState = { key: string; a: number; b: number; kind: LinkKind; draw: number; opacity: number };

export const pairKey = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`);

// Threads so far in this loop. A reencuentro redraws the pair's existing thread in its own color.
export function linksAt(seconds: number): LinkState[] {
  const { index, t } = momentAt(seconds);
  const opacity = index === BEATS.length - 1 ? 1 - progress(t, NETWORK_FADE) : 1;
  const links = new Map<string, LinkState>();
  BEATS.slice(0, index + 1).forEach((beat, i) => {
    const draw = i < index ? 1 : progress(t, PHASES.thread);
    if (draw <= 0) return;
    const key = pairKey(beat.a, beat.b);
    links.set(key, { key, a: beat.a, b: beat.b, kind: beat.kind, draw, opacity });
  });
  return [...links.values()];
}

// Pop-in, hold, pop-out scale for a sticker shown during `span` (0 when hidden).
export function popScale(t: number, span: Span, inSeconds = 0.35, outSeconds = 0.2): number {
  if (!within(t, span)) return 0;
  const grow = easeOutBack(clamp01((t - span[0]) / inSeconds));
  const shrink = clamp01((span[1] - t) / outSeconds);
  return grow * easeOutCubic(shrink);
}
