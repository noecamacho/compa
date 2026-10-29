// Rules for editing an event from /admin (data model M20). Pure: the handler loads the row, this decides the result.
import type { EventStatus } from "../roles";
import { entriesOutsideWindow, sortSchedule, type ScheduleEntry } from "./schedule";

export type EditableEvent = { startsAt: Date; endsAt: Date; timezone: string; schedule: ScheduleEntry[]; status: EventStatus };

export type EventPatch = {
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  schedule?: ScheduleEntry[];
  status?: EventStatus;
};

export type EditResult = { ok: true; value: EditableEvent } | { ok: false; fields: Record<string, string[]> };

const MINUTE_MS = 60_000;

// "End now": the window closes at once, so pending requests read as expired. An event that has not started
// yet gets a one-minute window ending now, which keeps the `ends_at > starts_at` check true.
export function endNow(event: Pick<EditableEvent, "startsAt" | "endsAt">, now: Date): { startsAt: Date; endsAt: Date; status: "ended" } {
  const endsAt = event.endsAt < now ? event.endsAt : now;
  const startsAt = event.startsAt < endsAt ? event.startsAt : new Date(endsAt.getTime() - MINUTE_MS);
  return { startsAt, endsAt, status: "ended" };
}

function merged(current: EditableEvent, patch: EventPatch, now: Date): EditableEvent {
  const next: EditableEvent = {
    startsAt: patch.startsAt ? new Date(patch.startsAt) : current.startsAt,
    endsAt: patch.endsAt ? new Date(patch.endsAt) : current.endsAt,
    timezone: patch.timezone ?? current.timezone,
    schedule: patch.schedule ?? current.schedule,
    status: patch.status ?? current.status,
  };
  // Marking an event ended closes its window too, unless the window already closed.
  if (patch.status === "ended" && next.endsAt > now) return { ...next, ...endNow(next, now) };
  return next;
}

export function applyEventEdit(current: EditableEvent, patch: EventPatch, now = new Date()): EditResult {
  const next = merged(current, patch, now);
  if (next.endsAt <= next.startsAt) return { ok: false, fields: { endsAt: ["endsAt must be after startsAt"] } };
  const outside = entriesOutsideWindow(next.schedule, next);
  if (outside.length) return { ok: false, fields: { schedule: [`Entries ${outside.join(", ")} fall outside the event dates in ${next.timezone}`] } };
  return { ok: true, value: { ...next, schedule: sortSchedule(next.schedule) } };
}
