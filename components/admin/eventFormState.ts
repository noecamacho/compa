import type { AdminEventT, EventStatusT } from "@/lib/api/admin-schemas";
import type { Dictionary } from "@/lib/copy";
import { DEFAULT_TIMEZONE, isTimeZone, type ScheduleEntry } from "@/lib/events/schedule";
import { utcToZoned, zonedToUtc } from "@/lib/events/zoned";

export const DETAILS = ["venueName", "address", "city", "country", "websiteUrl"] as const;
export type Detail = (typeof DETAILS)[number];

export type FormState = {
  name: string;
  slug: string;
  description: string;
  details: Record<Detail, string>;
  timezone: string;
  startsAt: string;
  endsAt: string;
  status: EventStatusT;
  isTest: boolean;
  schedule: ScheduleEntry[];
};

export type FormErrors = Record<string, string>;

const HOUR_MS = 3_600_000;
const SLUG = /^[a-z0-9-]{2,48}$/;

export function initialState(event: AdminEventT | undefined): FormState {
  const timezone = event?.timezone ?? DEFAULT_TIMEZONE;
  const startsAt = event?.startsAt ?? new Date(Math.ceil(Date.now() / HOUR_MS) * HOUR_MS).toISOString();
  const endsAt = event?.endsAt ?? new Date(Date.parse(startsAt) + 6 * HOUR_MS).toISOString();
  return {
    name: event?.name ?? "",
    slug: event?.slug ?? "",
    description: event?.description ?? "",
    details: Object.fromEntries(DETAILS.map((key) => [key, event?.[key] ?? ""])) as Record<Detail, string>,
    timezone,
    startsAt: utcToZoned(startsAt, timezone),
    endsAt: utcToZoned(endsAt, timezone),
    status: event?.status ?? "live",
    isTest: event?.isTest ?? false,
    schedule: event?.schedule ?? [],
  };
}

const orNull = (text: string) => text.trim() || null;

export function bodyFrom(state: FormState) {
  const startsAt = zonedToUtc(state.startsAt, state.timezone)?.toISOString() ?? state.startsAt;
  const endsAt = zonedToUtc(state.endsAt, state.timezone)?.toISOString() ?? state.endsAt;
  const details = Object.fromEntries(DETAILS.map((key) => [key, orNull(state.details[key])]));
  const schedule = state.schedule.map(({ title, ...entry }) => (title?.trim() ? { ...entry, title: title.trim() } : entry));
  return { name: state.name, description: orNull(state.description), ...details, timezone: state.timezone, startsAt, endsAt, status: state.status, isTest: state.isTest, schedule };
}

const isUrl = (text: string) => URL.canParse(text) && /^https?:$/.test(new URL(text).protocol);

function scheduleErrors(schedule: ScheduleEntry[], copy: Dictionary["admin"]): FormErrors {
  const errors: FormErrors = {};
  schedule.forEach((entry, index) => {
    if (!entry.date) errors[`entry-${index}-date`] = copy.ui.form.required;
    if (!entry.start) errors[`entry-${index}-start`] = copy.ui.form.required;
    if (!entry.end) errors[`entry-${index}-end`] = copy.ui.form.required;
    if (entry.start && entry.end && entry.end <= entry.start) errors[`entry-${index}-end`] = copy.ui.form.entryBeforeStart;
  });
  return errors;
}

// Mirrors the server's zod rules so mistakes show next to the field instead of as one generic "couldn't save".
export function validate(state: FormState, isNew: boolean, copy: Dictionary["admin"]): FormErrors {
  const f = copy.ui.form;
  const errors: FormErrors = {};
  if (!state.name.trim()) errors["event-name"] = f.required;
  if (isNew && !SLUG.test(state.slug)) errors["event-slug"] = state.slug ? f.slugFormat : f.required;
  const url = state.details.websiteUrl.trim();
  if (url && !isUrl(url)) errors["event-websiteUrl"] = f.urlInvalid;
  if (!isTimeZone(state.timezone)) errors["event-timezone"] = state.timezone.trim() ? f.zoneInvalid : f.required;
  if (!state.startsAt) errors["event-starts"] = f.required;
  if (!state.endsAt) errors["event-ends"] = f.required;
  const start = zonedToUtc(state.startsAt, state.timezone);
  const end = zonedToUtc(state.endsAt, state.timezone);
  if (start && end && end <= start) errors["event-ends"] = f.endBeforeStart;
  return { ...errors, ...scheduleErrors(state.schedule, copy) };
}
