// Pure math of the "Wave" live visualization: an ECG-style trace in a fixed ring buffer. Every sample is one tick of a
// scrolling line; connections become heartbeat spikes, and a soft breathing baseline keeps it alive when the room is quiet.
import type { LiveSnapshotT } from "@/lib/api/schemas";

export const SAMPLES = 384;
export const SAMPLE_RATE = 48;
// The history shown on the line when the board opens: the last few minutes, squeezed into the buffer's width.
export const HISTORY_MS = 5 * 60_000;
const HISTORY_SLOTS = 20;

export const NONE = 0;
export const NEW = 1;
export const RECONNECTION = 2;
export type Kind = typeof NONE | typeof NEW | typeof RECONNECTION;

// One P-QRS-T beat, in units of a full-height spike.
const BEAT = [0, 0.1, 0.18, 0.1, 0, -0.12, 0.55, 1, -0.3, -0.1, 0, 0.14, 0.26, 0.14, 0.04, 0] as const;

// A lone connection is a clear blip; a crowd landing together saturates at the full height.
export const spikeAmp = (count: number): number => 0.4 + 0.6 * (1 - Math.exp(-(Math.max(1, count) - 1) / 3));

// Breathing plus a little jitter, in spike units, as a function of seconds.
export const baseline = (seconds: number): number =>
  0.03 * Math.sin(seconds * 1.57) + 0.02 * Math.sin(seconds * 4.1 + 1.3) + 0.012 * Math.sin(seconds * 9.7 + 0.4);

// Frame-rate independent easing of `current` toward `target`.
export const approach = (current: number, target: number, dt: number, rate: number): number => current + (target - current) * (1 - Math.exp(-dt * rate));

export type Slot = { count: number; kind: Kind };

// Connections per slot over the last `windowMs`, oldest slot first; a slot is pink only when most of its links are reconnections.
export function slotCounts(links: LiveSnapshotT["connections"], nowMs: number, windowMs: number, slots: number): Slot[] {
  const counts = new Array<number>(slots).fill(0);
  const reconnections = new Array<number>(slots).fill(0);
  for (const link of links) {
    const age = nowMs - Date.parse(link.at);
    if (age < 0 || age >= windowMs) continue;
    const slot = slots - 1 - Math.floor((age / windowMs) * slots);
    counts[slot] = (counts[slot] ?? 0) + 1;
    if (link.kind === "reconnection") reconnections[slot] = (reconnections[slot] ?? 0) + 1;
  }
  return counts.map((count, slot) => ({ count, kind: (reconnections[slot] ?? 0) * 2 > count ? RECONNECTION : NEW }));
}

export const idsOf = (links: LiveSnapshotT["connections"]): Set<string> => new Set(links.map((link) => link.id));

export type Fresh = { news: number; reconnections: number };

// Connections whose ids were not in the previous snapshot. The first snapshot (no `seen`) has no arrivals.
export function freshLinks(seen: ReadonlySet<string> | null, links: LiveSnapshotT["connections"]): Fresh {
  const fresh = { news: 0, reconnections: 0 };
  if (!seen) return fresh;
  for (const link of links) {
    if (seen.has(link.id)) continue;
    if (link.kind === "new") fresh.news++;
    else fresh.reconnections++;
  }
  return fresh;
}

export type Started = { amp: number; kind: Kind };

export class Heartbeat {
  private readonly values = new Float32Array(SAMPLES);
  private readonly kinds = new Uint8Array(SAMPLES);
  private oldest = 0;
  private clock = 0;
  private carry = 0;
  private pendingNew = 0;
  private pendingReconnection = 0;
  private beatStep = -1;
  private beatAmp = 0;
  private beatKind: Kind = NONE;

  // Sample `index` counted from the oldest (0) to the newest (SAMPLES - 1).
  valueAt(index: number): number {
    return this.values[(this.oldest + index) % SAMPLES] ?? 0;
  }

  kindAt(index: number): Kind {
    return (this.kinds[(this.oldest + index) % SAMPLES] ?? NONE) as Kind;
  }

  // How far the line has slid toward the next sample, 0 to 1: draw at (index - offset) for smooth scrolling.
  get offset(): number {
    return this.carry;
  }

  // Queue spikes for connections that just landed.
  add(kind: Kind, count: number): void {
    if (kind === NEW) this.pendingNew += count;
    if (kind === RECONNECTION) this.pendingReconnection += count;
  }

  // Replace the whole trace with the baseline and one spike per busy history slot. `fromStart` draws the baseline from
  // time zero, so a calm (reduced-motion) reseed of the same data paints the same picture.
  seed(slots: readonly Slot[], fromStart = false): void {
    if (fromStart) this.clock = 0;
    this.oldest = 0;
    this.carry = 0;
    this.pendingNew = 0;
    this.pendingReconnection = 0;
    this.beatStep = -1;
    for (let index = 0; index < SAMPLES; index++) {
      this.values[index] = baseline(this.clock + index / SAMPLE_RATE);
      this.kinds[index] = NONE;
    }
    this.clock += SAMPLES / SAMPLE_RATE;
    const stride = SAMPLES / slots.length;
    for (const [slot, { count, kind }] of slots.entries()) {
      if (count > 0) this.stamp(Math.floor(slot * stride + (stride - BEAT.length) / 2), spikeAmp(count), kind);
    }
  }

  // Slide the line by `dt` seconds; returns the beat that began on the right edge, if any.
  advance(dt: number): Started | null {
    this.carry += dt * SAMPLE_RATE;
    let started: Started | null = null;
    while (this.carry >= 1) {
      this.carry -= 1;
      started = this.step() ?? started;
    }
    return started;
  }

  private stamp(from: number, amp: number, kind: Kind): void {
    for (const [step, shape] of BEAT.entries()) {
      const index = from + step;
      this.values[index] = (this.values[index] ?? 0) + shape * amp;
      this.kinds[index] = kind;
    }
  }

  private begin(): Started | null {
    const total = this.pendingNew + this.pendingReconnection;
    if (this.beatStep >= 0 || total === 0) return null;
    this.beatKind = this.pendingReconnection > this.pendingNew ? RECONNECTION : NEW;
    this.beatAmp = spikeAmp(total);
    this.beatStep = 0;
    this.pendingNew = 0;
    this.pendingReconnection = 0;
    return { amp: this.beatAmp, kind: this.beatKind };
  }

  private step(): Started | null {
    const started = this.begin();
    const beating = this.beatStep >= 0;
    const lift = beating ? (BEAT[this.beatStep] ?? 0) * this.beatAmp : 0;
    this.values[this.oldest] = baseline(this.clock) + lift;
    this.kinds[this.oldest] = beating ? this.beatKind : NONE;
    this.oldest = (this.oldest + 1) % SAMPLES;
    this.clock += 1 / SAMPLE_RATE;
    if (beating) this.beatStep = this.beatStep + 1 >= BEAT.length ? -1 : this.beatStep + 1;
    return started;
  }
}

export type WaveLayout = { pad: number; baseY: number; amp: number; histTop: number; histBottom: number; lineWidth: number };

export function waveLayout(width: number, height: number): WaveLayout {
  const pad = Math.max(12, width * 0.03);
  return { pad, baseY: height * 0.42, amp: height * 0.25, histTop: height * 0.68, histBottom: height - pad, lineWidth: Math.max(3, width / 320) };
}

export const historySlots = (snapshot: LiveSnapshotT): Slot[] => slotCounts(snapshot.connections, Date.parse(snapshot.generatedAt), HISTORY_MS, HISTORY_SLOTS);
