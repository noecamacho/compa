import type { Locale } from "../i18n";

// Dates, times and counts of the admin console (spec §6.3). Event times always read in the event's own zone.
const TAG: Record<Locale, string> = { es: "es-MX", en: "en-US" };
const UNKNOWN_ZONE = "UTC (?)";

const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
const DAY: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
const DAY_TIME: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", ...TIME };
const YMD: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" };

// An unknown stored zone makes Intl throw a RangeError; fall back to UTC and flag it rather than crash a list (edge case 14).
function zoneOrUtc(timeZone: string): { timeZone: string; known: boolean } {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return { timeZone, known: true };
  } catch {
    return { timeZone: "UTC", known: false };
  }
}

const format = (locale: Locale, date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(TAG[locale], { ...options, timeZone }).format(date);

const zoneName = (locale: Locale, date: Date, timeZone: string) =>
  new Intl.DateTimeFormat(TAG[locale], { timeZone, timeZoneName: "short" }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? timeZone;

export const localeTag = (locale: Locale): string => TAG[locale];

// One date or time in the event's zone, never throwing on a bad stored zone (edge case 14).
export const inZone = (locale: Locale, iso: string, timeZone: string, options: Intl.DateTimeFormatOptions): string =>
  format(locale, new Date(iso), zoneOrUtc(timeZone).timeZone, options);

export function zoneAbbreviation(locale: Locale, iso: string, timeZone: string): string {
  const zone = zoneOrUtc(timeZone);
  return zone.known ? zoneName(locale, new Date(iso), zone.timeZone) : "?";
}

// "Thu, Oct 29 · 10:00–22:00 CST", or both dates when the event ends on another local day: "Oct 29, 10:00 – Oct 30, 02:00 CST".
export function eventWhen(locale: Locale, startsAt: string, endsAt: string, timeZone: string): string {
  const { timeZone: zone, known } = zoneOrUtc(timeZone);
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const abbreviation = known ? zoneName(locale, start, zone) : UNKNOWN_ZONE;
  const sameDay = format("en", start, zone, YMD) === format("en", end, zone, YMD);
  if (sameDay) return `${format(locale, start, zone, DAY)} · ${format(locale, start, zone, TIME)}–${format(locale, end, zone, TIME)} ${abbreviation}`;
  return `${format(locale, start, zone, DAY_TIME)} – ${format(locale, end, zone, DAY_TIME)} ${abbreviation}`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86400],
  ["month", 30 * 86400],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

// "in 3 hours", "yesterday", "now". `now` comes from the request so the server and the client agree (spec §6.2).
export function relative(locale: Locale, iso: string, now: Date): string {
  const seconds = (new Date(iso).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(TAG[locale], { numeric: "auto" });
  const unit = UNITS.find(([, size]) => Math.abs(seconds) >= size);
  if (!unit) return rtf.format(0, "second");
  return rtf.format(Math.round(seconds / unit[1]), unit[0]);
}

// "1,340"; "—" when the number is missing (a failed stats call renders a dash, never the error page).
export const formatCount = (locale: Locale, value: number | null | undefined): string => (value == null ? "—" : new Intl.NumberFormat(TAG[locale]).format(value));
