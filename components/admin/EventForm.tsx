"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { AdminEventBody, type AdminEventT, type EventStatusT } from "@/lib/api/admin-schemas";
import { ApiClientError, apiCall } from "@/lib/api/client";
import { CreatedEvent } from "@/lib/api/schemas";
import { copyFor } from "@/lib/copy";
import { MAX_SCHEDULE_ENTRIES, type ScheduleEntry } from "@/lib/events/schedule";
import type { Locale } from "@/lib/i18n";
import { EVENT_STATUSES } from "@/lib/roles";
import { AdminField, AdminInput } from "./AdminField";
import { MobileActionBar } from "./AdminParts";
import { EventPreview } from "./EventPreview";
import { Notice } from "./Notice";
import { DETAILS, bodyFrom, initialState, validate, type FormState } from "./eventFormState";

type Props = { locale: Locale; event?: AdminEventT };

const COMMON_ZONES = ["America/Mexico_City", "America/Monterrey", "America/Bogota", "America/New_York", "America/Los_Angeles", "Europe/Madrid", "UTC"];
const DRAFT_KEY = "compa:admin:new-event-draft";

function errorText(error: unknown, copy: ReturnType<typeof copyFor>["admin"]["form"]): string {
  if (!(error instanceof ApiClientError)) return copy.failed;
  if (error.code === "slug_taken") return copy.slugTaken;
  const fields = Object.entries(error.fields ?? {}).map(([field, messages]) => `${field}: ${messages.join(", ")}`);
  return fields.length ? `${copy.failed} ${fields.join(" · ")}` : copy.failed;
}

// Best effort: storage can be blocked or full, and a missing draft is never an error.
const readDraft = (): FormState | null => {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as FormState) : null;
  } catch {
    return null;
  }
};
const writeDraft = (state: FormState | null) => {
  try {
    if (state) window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(state));
    else window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to do: the form still works without a draft.
  }
};

function SaveButton({ busy, label, className }: { busy: boolean; label: string; className?: string }) {
  return (
    <Button type="submit" variant="primary" disabled={busy} className={className}>
      {label}
    </Button>
  );
}

// Create and edit share one form; times are typed in the event's own time zone (lib/events/zoned.ts).
// Creating also shows a live preview beside the form from 1024 px, and keeps a draft so a reload loses nothing.
export function EventForm({ locale, event }: Props) {
  const full = copyFor(locale).admin;
  const f = full.form;
  const u = full.ui.form;
  const router = useRouter();
  const isNew = !event;
  const [baseline] = useState(() => JSON.stringify(initialState(event)));
  const [state, setState] = useState<FormState>(() => initialState(event));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const dirty = JSON.stringify(state) !== baseline;
  const errors = validate(state, isNew, full);
  const shown = (id: string) => (submitted || touched.has(id) ? (errors[id] ?? null) : null);
  const touch = (id: string) => setTouched((current) => new Set(current).add(id));
  const set = (patch: Partial<FormState>) => setState((current) => ({ ...current, ...patch }));
  const setEntry = (index: number, patch: Partial<ScheduleEntry>) => set({ schedule: state.schedule.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)) });
  const firstDay = state.startsAt.slice(0, 10);
  const field = (id: string) => ({ id, error: shown(id), onBlur: () => touch(id) });

  useEffect(() => {
    if (!isNew) return;
    const draft = readDraft();
    if (!draft) return;
    // sessionStorage only exists after hydration, so the draft cannot seed the initial state without a server/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(draft);
    setDraftRestored(true);
  }, [isNew]);

  useEffect(() => {
    if (isNew) writeDraft(dirty ? state : null);
  }, [isNew, dirty, state]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function discardDraft() {
    setState(JSON.parse(baseline) as FormState);
    setDraftRestored(false);
    setSubmitted(false);
    setTouched(new Set());
  }

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    setSubmitted(true);
    setSaved(null);
    const ids = Object.keys(errors);
    if (ids.length > 0) {
      setMessage(u.fixErrors(ids.length));
      document.getElementById(ids[0] ?? "")?.focus();
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (event) {
        await apiCall("PATCH", `/api/admin/events/${event.slug}`, AdminEventBody, bodyFrom(state));
        setSaved(full.ui.saved);
        router.refresh();
        return;
      }
      const created = await apiCall("POST", "/api/admin/events", CreatedEvent, { ...bodyFrom(state), slug: state.slug });
      writeDraft(null);
      router.push(`/admin/events/${created.event.slug}`);
    } catch (error) {
      setMessage(errorText(error, f));
    } finally {
      setBusy(false);
    }
  }

  const submitLabel = busy ? f.saving : isNew ? f.create : f.save;
  const status = (
    <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-extrabold md:flex-none">
      {dirty && (
        <>
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-sun border-ink" style={{ borderWidth: 2 }} />
          {u.unsaved}
        </>
      )}
    </span>
  );

  return (
    <form onSubmit={submit} noValidate className={`flex flex-col gap-4 ${isNew ? "lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6" : ""}`}>
      <div className="flex flex-col gap-4">
        {draftRestored && (
          <p role="status" className="m-0 flex flex-wrap items-center gap-x-3 rounded-[12px] bg-sun-soft px-3 py-1 text-[14px] font-extrabold border-ink">
            {u.draftRestored}
            <button type="button" onClick={discardDraft} className="min-h-11 cursor-pointer font-extrabold underline">
              {u.discardDraft}
            </button>
          </p>
        )}
        <Card className="flex flex-col gap-6 px-4 py-5 md:px-6">
          <SectionLabel>{isNew ? f.createTitle : f.editTitle}</SectionLabel>
          <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
            <legend className="mb-3 font-display text-[18px] font-bold">{u.basics}</legend>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <AdminInput {...field("event-name")} label={f.name} value={state.name} onChange={(e) => set({ name: e.target.value })} required maxLength={120} autoComplete="off" />
              {isNew && (
                <AdminInput {...field("event-slug")} label={f.slug} hint={u.slugHint} value={state.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} required autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={48} />
              )}
              <AdminField id="event-status" label={f.status}>
                {(aria, className) => (
                  <select id="event-status" className={`${className} h-11`} value={state.status} onChange={(e) => set({ status: e.target.value as EventStatusT })} {...aria}>
                    {EVENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {full.status[status]}
                      </option>
                    ))}
                  </select>
                )}
              </AdminField>
              <label className="flex min-h-11 items-center gap-3 self-end text-[14px] font-extrabold">
                <input type="checkbox" className="h-6 w-6 shrink-0 accent-[#1E1B2E]" checked={state.isTest} onChange={(e) => set({ isTest: e.target.checked })} />
                {f.isTest}
              </label>
            </div>
            <AdminField id="event-description" label={f.description} hint={u.count(state.description.length, 2000)}>
              {(aria, className) => <textarea id="event-description" className={`${className} min-h-24 py-2`} maxLength={2000} value={state.description} onChange={(e) => set({ description: e.target.value })} {...aria} />}
            </AdminField>
          </fieldset>

          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-3 font-display text-[18px] font-bold">{u.place}</legend>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {DETAILS.map((key) => (
                <AdminInput
                  key={key}
                  {...field(`event-${key}`)}
                  label={f[key]}
                  type={key === "websiteUrl" ? "url" : "text"}
                  inputMode={key === "websiteUrl" ? "url" : undefined}
                  value={state.details[key]}
                  onChange={(e) => set({ details: { ...state.details, [key]: e.target.value } })}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-3 font-display text-[18px] font-bold">{u.when}</legend>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <AdminInput {...field("event-timezone")} label={f.timezone} list="event-zones" value={state.timezone} onChange={(e) => set({ timezone: e.target.value })} required autoCapitalize="none" spellCheck={false} />
              <datalist id="event-zones">
                {COMMON_ZONES.map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
              <AdminInput {...field("event-starts")} label={f.startsAt} type="datetime-local" value={state.startsAt} onChange={(e) => set({ startsAt: e.target.value })} required />
              <AdminInput {...field("event-ends")} label={f.endsAt} type="datetime-local" value={state.endsAt} onChange={(e) => set({ endsAt: e.target.value })} required />
            </div>
          </fieldset>

          <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
            <legend className="mb-1 font-display text-[18px] font-bold">{f.schedule}</legend>
            <Muted className="text-[13px] font-bold">{f.scheduleHint}</Muted>
            {state.schedule.length === 0 && <Muted className="text-[13px] font-bold">{u.scheduleEmpty}</Muted>}
            {state.schedule.map((entry, index) => (
              <div key={index} role="group" aria-label={`${f.schedule} ${index + 1}`} className="grid grid-cols-2 items-start gap-3 rounded-[16px] bg-paper px-3 py-3 border-ink md:grid-cols-[1fr_1fr_1fr_2fr_auto]">
                <AdminInput {...field(`entry-${index}-date`)} label={f.entryDate} type="date" value={entry.date} onChange={(e) => setEntry(index, { date: e.target.value })} required />
                <AdminInput {...field(`entry-${index}-start`)} label={f.entryStart} type="time" value={entry.start} onChange={(e) => setEntry(index, { start: e.target.value })} required />
                <AdminInput {...field(`entry-${index}-end`)} label={f.entryEnd} type="time" value={entry.end} onChange={(e) => setEntry(index, { end: e.target.value })} required />
                <div className="col-span-2 md:col-span-1">
                  <AdminInput id={`entry-${index}-title`} label={f.entryTitle} value={entry.title ?? ""} maxLength={80} onChange={(e) => setEntry(index, { title: e.target.value })} />
                </div>
                <Button height={44} className="col-span-2 w-auto! md:col-span-1 md:mt-[22px]" aria-label={`${f.removeEntry} ${index + 1}`} onClick={() => set({ schedule: state.schedule.filter((_, i) => i !== index) })}>
                  {f.removeEntry}
                </Button>
              </div>
            ))}
            <Button
              height={44}
              className="w-auto! self-start"
              disabled={state.schedule.length >= MAX_SCHEDULE_ENTRIES}
              onClick={() => set({ schedule: [...state.schedule, { date: firstDay, start: "10:00", end: "18:00" }] })}
            >
              {f.addEntry}
            </Button>
          </fieldset>

          <Notice tone="error">{message}</Notice>
          <Notice tone="success">{saved}</Notice>
          <div className="hidden items-center justify-end gap-4 md:flex">
            {status}
            <SaveButton busy={busy} label={submitLabel} className="w-auto! px-8" />
          </div>
        </Card>
      </div>
      {isNew && (
        <aside className="hidden lg:sticky lg:top-[96px] lg:block">
          <EventPreview locale={locale} copy={full} state={state} />
        </aside>
      )}
      <MobileActionBar>
        <div className="flex items-center gap-3">
          {status}
          <SaveButton busy={busy} label={submitLabel} className="w-auto! px-6" />
        </div>
      </MobileActionBar>
    </form>
  );
}
