"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { AdminEventBody, type AdminEventT, type EventStatusT } from "@/lib/api/admin-schemas";
import { ApiClientError, apiCall } from "@/lib/api/client";
import { CreatedEvent } from "@/lib/api/schemas";
import { copyFor } from "@/lib/copy";
import { DEFAULT_TIMEZONE, type ScheduleEntry } from "@/lib/events/schedule";
import { utcToZoned, zonedToUtc } from "@/lib/events/zoned";
import type { Locale } from "@/lib/i18n";
import { EVENT_STATUSES } from "@/lib/roles";

type Props = { locale: Locale; event?: AdminEventT };

const COMMON_ZONES = ["America/Mexico_City", "America/Monterrey", "America/Bogota", "America/New_York", "America/Los_Angeles", "Europe/Madrid", "UTC"];
const DETAILS = ["venueName", "address", "city", "country", "websiteUrl"] as const;
type Detail = (typeof DETAILS)[number];

type State = {
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

const HOUR_MS = 3_600_000;

function initialState(event: AdminEventT | undefined): State {
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

function bodyFrom(state: State) {
  const startsAt = zonedToUtc(state.startsAt, state.timezone)?.toISOString() ?? state.startsAt;
  const endsAt = zonedToUtc(state.endsAt, state.timezone)?.toISOString() ?? state.endsAt;
  const details = Object.fromEntries(DETAILS.map((key) => [key, orNull(state.details[key])]));
  const schedule = state.schedule.map(({ title, ...entry }) => (title?.trim() ? { ...entry, title: title.trim() } : entry));
  return { name: state.name, description: orNull(state.description), ...details, timezone: state.timezone, startsAt, endsAt, status: state.status, isTest: state.isTest, schedule };
}

function errorText(error: unknown, copy: ReturnType<typeof copyFor>["admin"]["form"]): string {
  if (!(error instanceof ApiClientError)) return copy.failed;
  if (error.code === "slug_taken") return copy.slugTaken;
  const fields = Object.entries(error.fields ?? {}).map(([field, messages]) => `${field}: ${messages.join(", ")}`);
  return fields.length ? `${copy.failed} ${fields.join(" · ")}` : copy.failed;
}

const INPUT = "box-border block w-full rounded-[12px] bg-white px-3 font-body text-[14px] font-bold text-ink outline-none border-ink focus:shadow-[0_0_0_4px_#6BE4A3]";

function Labelled({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[5px]">
      <label htmlFor={id} className="text-[12px] font-extrabold">
        {label}
      </label>
      {children}
    </div>
  );
}

// Create and edit share one form; times are typed in the event's own time zone (lib/events/zoned.ts).
export function EventForm({ locale, event }: Props) {
  const copy = copyFor(locale).admin;
  const f = copy.form;
  const router = useRouter();
  const [state, setState] = useState<State>(() => initialState(event));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const set = (patch: Partial<State>) => setState((current) => ({ ...current, ...patch }));
  const setEntry = (index: number, patch: Partial<ScheduleEntry>) =>
    set({ schedule: state.schedule.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)) });
  const firstDay = state.startsAt.slice(0, 10);

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (event) {
        await apiCall("PATCH", `/api/admin/events/${event.slug}`, AdminEventBody, bodyFrom(state));
        setMessage(f.saved);
        router.refresh();
      } else {
        const created = await apiCall("POST", "/api/admin/events", CreatedEvent, { ...bodyFrom(state), slug: state.slug });
        router.push(`/admin/events/${created.event.slug}`);
      }
    } catch (error) {
      setMessage(errorText(error, f));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 px-4 py-5 md:px-6">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <SectionLabel>{event ? f.editTitle : f.createTitle}</SectionLabel>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field id="event-name" label={f.name} value={state.name} onChange={(e) => set({ name: e.target.value })} required maxLength={120} />
          {!event && (
            <Field id="event-slug" label={f.slug} value={state.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} required pattern="[a-z0-9-]{2,48}" />
          )}
          {DETAILS.map((key) => (
            <Field
              key={key}
              id={`event-${key}`}
              label={f[key]}
              type={key === "websiteUrl" ? "url" : "text"}
              value={state.details[key]}
              onChange={(e) => set({ details: { ...state.details, [key]: e.target.value } })}
            />
          ))}
          <Field id="event-timezone" label={f.timezone} list="event-zones" value={state.timezone} onChange={(e) => set({ timezone: e.target.value })} required />
          <datalist id="event-zones">
            {COMMON_ZONES.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
          <Field id="event-starts" label={f.startsAt} type="datetime-local" value={state.startsAt} onChange={(e) => set({ startsAt: e.target.value })} required />
          <Field id="event-ends" label={f.endsAt} type="datetime-local" value={state.endsAt} onChange={(e) => set({ endsAt: e.target.value })} required />
          <Labelled id="event-status" label={f.status}>
            <select id="event-status" className={`${INPUT} h-11`} value={state.status} onChange={(e) => set({ status: e.target.value as EventStatusT })}>
              {EVENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {copy.status[status]}
                </option>
              ))}
            </select>
          </Labelled>
          <label className="flex min-h-11 items-center gap-3 text-[14px] font-extrabold">
            <input type="checkbox" className="h-5 w-5 accent-[#1E1B2E]" checked={state.isTest} onChange={(e) => set({ isTest: e.target.checked })} />
            {f.isTest}
          </label>
        </div>
        <Labelled id="event-description" label={f.description}>
          <textarea id="event-description" className={`${INPUT} min-h-24 py-2`} maxLength={2000} value={state.description} onChange={(e) => set({ description: e.target.value })} />
        </Labelled>
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="text-[12px] font-extrabold">{f.schedule}</legend>
          <Muted className="text-[12px] font-bold">{f.scheduleHint}</Muted>
          {state.schedule.map((entry, index) => (
            <div key={index} className="grid grid-cols-2 items-end gap-2 md:grid-cols-[1fr_1fr_1fr_2fr_auto]">
              <Field id={`entry-${index}-date`} label={f.entryDate} type="date" value={entry.date} onChange={(e) => setEntry(index, { date: e.target.value })} required />
              <Field id={`entry-${index}-start`} label={f.entryStart} type="time" value={entry.start} onChange={(e) => setEntry(index, { start: e.target.value })} required />
              <Field id={`entry-${index}-end`} label={f.entryEnd} type="time" value={entry.end} onChange={(e) => setEntry(index, { end: e.target.value })} required />
              <Field id={`entry-${index}-title`} label={f.entryTitle} value={entry.title ?? ""} maxLength={80} onChange={(e) => setEntry(index, { title: e.target.value })} />
              <Button height={44} className="w-auto" onClick={() => set({ schedule: state.schedule.filter((_, i) => i !== index) })}>
                {f.removeEntry}
              </Button>
            </div>
          ))}
          <Button height={44} className="w-auto self-start" onClick={() => set({ schedule: [...state.schedule, { date: firstDay, start: "10:00", end: "18:00" }] })}>
            {f.addEntry}
          </Button>
        </fieldset>
        {message && (
          <p role="status" className="m-0 text-[13px] font-extrabold">
            {message}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={busy} className="md:w-auto md:self-end md:px-8">
          {busy ? f.saving : event ? f.save : f.create}
        </Button>
      </form>
    </Card>
  );
}
