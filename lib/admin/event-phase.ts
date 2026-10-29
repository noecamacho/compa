// An event's derived phase (admin spec §6.2): the stored status plus the window. Pure, shared by the API and the console.
// lib/server/admin-events.ts `phaseFilter` is the same rule in SQL; keep the two in step.
import type { EventStatus } from "../roles";

// Display and sort order.
export const EVENT_PHASES = ["running", "upcoming", "draft", "ended", "archived"] as const;
export type EventPhaseT = (typeof EVENT_PHASES)[number];

type Instant = Date | string;
type Phased = { status: EventStatus; startsAt: Instant; endsAt: Instant };

const ms = (instant: Instant): number => new Date(instant).getTime();

// Only `live` depends on the clock: before the start it is upcoming, inside [start, end) running, after it ended.
export function phaseOf(e: Phased, now: Date): EventPhaseT {
  if (e.status !== "live") return e.status;
  const t = now.getTime();
  if (t < ms(e.startsAt)) return "upcoming";
  return t < ms(e.endsAt) ? "running" : "ended";
}
