// Which live visualization the big screen shows, and when it moves on (docs/research/live-dataviz-decision.md).
// Every load starts on a different one than the last load showed; the stage then rotates on a timer.
// `?viz=<id>` pins one for a projector; `?rotate=<seconds>` changes the period, `?rotate=0` stops rotating.
import { z } from "zod";

export const VIZ_IDS = ["loom", "orbit", "race", "wave"] as const;
export type VizId = (typeof VIZ_IDS)[number];

export const DEFAULT_ROTATE_SECONDS = 30;
const MIN_ROTATE_SECONDS = 5;
const MAX_ROTATE_SECONDS = 600;

// URL state is untrusted: anything malformed falls back to the defaults instead of breaking the screen.
const VizQuery = z.object({
  viz: z.enum(VIZ_IDS).optional().catch(undefined),
  rotate: z.coerce.number().int().min(0).max(MAX_ROTATE_SECONDS).optional().catch(undefined),
});

// `explicit`: the URL set the period, which then holds even under reduced motion.
export type Rotation = { pinned: VizId | null; seconds: number; explicit: boolean };

export function rotationFrom(search: string): Rotation {
  const params = Object.fromEntries(new URLSearchParams(search));
  const { viz, rotate } = VizQuery.parse(params);
  const seconds = rotate === undefined ? DEFAULT_ROTATE_SECONDS : rotate === 0 ? 0 : Math.max(MIN_ROTATE_SECONDS, rotate);
  return { pinned: viz ?? null, seconds: viz ? 0 : seconds, explicit: rotate !== undefined };
}

export const isVizId = (value: unknown): value is VizId => VIZ_IDS.some((id) => id === value);

// A random visualization other than the one the last load showed; `random` is in [0, 1).
export function firstViz(last: VizId | null, random: number, available: readonly VizId[] = VIZ_IDS): VizId {
  const choices = available.filter((id) => id !== last);
  const pool = choices.length > 0 ? choices : available;
  return pool[Math.min(pool.length - 1, Math.floor(random * pool.length))] ?? "loom";
}

// The next one in a fixed order, skipping any that cannot run here (no WebGL for the loom); a current one that was
// just dropped hands over to the first that can.
export function nextViz(current: VizId, available: readonly VizId[] = VIZ_IDS): VizId {
  const index = available.indexOf(current);
  return available[(index + 1) % available.length] ?? current;
}
