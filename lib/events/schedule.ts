// Event time zone and schedule (data model M20): stored as `events.timezone` and `events.schedule` (jsonb), validated here.
import { z } from "zod";

export const DEFAULT_TIMEZONE = "America/Mexico_City";
export const MAX_SCHEDULE_ENTRIES = 40;

// Any zone the runtime's IANA database knows ("America/Mexico_City", "Europe/Madrid", "UTC").
export function isTimeZone(value: string): boolean {
  if (!value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const TimeZone = z.string().trim().min(1).max(64).refine(isTimeZone, { message: "Unknown IANA time zone" });

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24 h)");

// One block of the day in the event's time zone: the doors (no title) or an agenda item ("Keynote").
export const ScheduleEntry = z
  .object({
    date: isoDay,
    start: clock,
    end: clock,
    title: z.string().trim().max(80).optional(),
  })
  .refine((entry) => entry.end > entry.start, { path: ["end"], message: "end must be after start; split overnight blocks in two" });

export type ScheduleEntry = z.infer<typeof ScheduleEntry>;

export const Schedule = z.array(ScheduleEntry).max(MAX_SCHEDULE_ENTRIES);

// The calendar day of an instant in a time zone, as YYYY-MM-DD ("en-CA" formats that way).
export const dayIn = (instant: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);

type Window = { startsAt: Date; endsAt: Date; timezone: string };

// Indexes of entries whose day falls outside the event window, in the event's own time zone.
export function entriesOutsideWindow(schedule: readonly ScheduleEntry[], window: Window): number[] {
  const first = dayIn(window.startsAt, window.timezone);
  const last = dayIn(window.endsAt, window.timezone);
  return schedule.flatMap((entry, index) => (entry.date < first || entry.date > last ? [index] : []));
}

export const sortSchedule = (schedule: readonly ScheduleEntry[]): ScheduleEntry[] =>
  [...schedule].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
