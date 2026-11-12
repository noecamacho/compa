// Number and time formatting for the screens (Mexican Spanish: 1,265; US English: 1,265).
import { copyFor, formatNumber } from "./copy";
import type { Locale } from "./i18n";

export const formatPoints = (locale: Locale, points: number): string => formatNumber(locale, points);

export function timeAgo(locale: Locale, iso: string, now: Date = new Date()): string {
  const { time, datesAndPeople } = copyFor(locale);
  const elapsed = Math.max(0, now.getTime() - Date.parse(iso));
  if (!Number.isFinite(elapsed)) return datesAndPeople.unknownDate;
  if (elapsed >= 7 * 86_400_000) return formatDate(locale, iso);
  if (elapsed >= 86_400_000) return datesAndPeople.daysAgo(Math.floor(elapsed / 86_400_000));
  const minutes = Math.round(elapsed / 60_000);
  if (minutes < 60) return time.minutesAgo(minutes);
  return time.hoursAgo(Math.min(23, Math.round(minutes / 60)));
}

export const formatClock = (locale: Locale, seconds: number): string => copyFor(locale).time.clock(Math.max(0, Math.round(seconds)));

// 24-hour clock in Spanish, 12-hour in English, as each audience reads it.
export function formatHour(locale: Locale, iso: string, timeZone = "America/Mexico_City"): string {
  const options: Intl.DateTimeFormatOptions = locale === "es" ? { hour: "2-digit", minute: "2-digit", hour12: false, timeZone } : { hour: "numeric", minute: "2-digit", timeZone };
  return new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", options).format(new Date(iso));
}

export function formatDate(locale: Locale, iso: string, timeZone = "America/Mexico_City"): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return copyFor(locale).datesAndPeople.unknownDate;
  return new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", { day: "numeric", month: "short", year: "numeric", timeZone }).format(date);
}

export function formatDateTime(locale: Locale, iso: string, timeZone = "America/Mexico_City"): string {
  if (!Number.isFinite(Date.parse(iso))) return copyFor(locale).datesAndPeople.unknownDate;
  return `${formatDate(locale, iso, timeZone)} · ${formatHour(locale, iso, timeZone)}`;
}

export const firstName = (name: string): string => name.split(" ")[0] ?? name;
