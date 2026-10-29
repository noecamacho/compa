// Number and time formatting for the screens (Mexican Spanish: 1,265).
import { time } from "./copy/es";

const numberFormat = new Intl.NumberFormat("es-MX");

export const formatPoints = (points: number): string => numberFormat.format(points);

export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60_000));
  if (minutes < 60) return time.minutesAgo(minutes);
  return time.hoursAgo(Math.round(minutes / 60));
}

export const formatClock = (seconds: number): string => time.clock(Math.max(0, Math.round(seconds)));

export function formatHour(iso: string, timeZone = "America/Mexico_City"): string {
  return new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(new Date(iso));
}

export const firstName = (name: string): string => name.split(" ")[0] ?? name;
