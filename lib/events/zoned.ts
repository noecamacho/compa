// Wall-clock time in an event's time zone <-> UTC, for the admin form's `datetime-local` inputs (M20).
import { isTimeZone } from "./schedule";

const PARTS = { hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" } as const;

function wallClock(instant: Date, timeZone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat("en-US", { ...PARTS, timeZone }).formatToParts(instant);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

// How far the zone's wall clock is ahead of UTC at that instant.
function offsetMs(instant: number, timeZone: string): number {
  const at = Math.floor(instant / 1000) * 1000;
  const c = wallClock(new Date(at), timeZone);
  return Date.UTC(c.year ?? 0, (c.month ?? 1) - 1, c.day ?? 1, c.hour ?? 0, c.minute ?? 0, c.second ?? 0) - at;
}

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

// "2026-10-29T10:00" in America/Mexico_City → 2026-10-29T16:00:00Z. Null for malformed input or an unknown zone,
// which the admin form holds while someone is still typing the zone name.
export function zonedToUtc(local: string, timeZone: string): Date | null {
  const match = LOCAL.exec(local);
  if (!match || !isTimeZone(timeZone)) return null;
  const [, y, m, d, h, min] = match.map(Number);
  const guess = Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0);
  // Two passes settle the offset across a DST change.
  const first = guess - offsetMs(guess, timeZone);
  return new Date(guess - offsetMs(first, timeZone));
}

const two = (value: number | undefined) => String(value ?? 0).padStart(2, "0");

export function utcToZoned(iso: string, timeZone: string): string {
  const c = wallClock(new Date(iso), timeZone);
  return `${c.year}-${two(c.month)}-${two(c.day)}T${two(c.hour)}:${two(c.minute)}`;
}
