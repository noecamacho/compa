import { Card } from "@/components/ui/Card";
import { Muted } from "@/components/ui/Text";
import { eventWhen } from "@/lib/admin/format";
import type { EventPhaseT } from "@/lib/admin/event-phase";
import type { AdminEventT } from "@/lib/api/admin-schemas";
import type { Dictionary } from "@/lib/copy";
import type { ScheduleEntry } from "@/lib/events/schedule";
import type { Locale } from "@/lib/i18n";
import { KpiStrip } from "./KpiStrip";

type Props = { copy: Dictionary["admin"]; locale: Locale; event: AdminEventT; phase: EventPhaseT; testUsers: number | null };

const TAG: Record<Locale, string> = { es: "es-MX", en: "en-US" };

// Formatting stays in the event's zone (spec §6.3); an unknown stored zone falls back to UTC instead of throwing.
function inZone(locale: Locale, iso: string, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(TAG[locale], { ...options, timeZone }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat(TAG[locale], { ...options, timeZone: "UTC" }).format(new Date(iso));
  }
}

function zoneAbbreviation(locale: Locale, iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat(TAG[locale], { timeZone, timeZoneName: "short" }).formatToParts(new Date(iso)).find((part) => part.type === "timeZoneName")?.value ?? "?";
  } catch {
    return "?";
  }
}

// A schedule date is a plain calendar day ("2026-10-29"), so it is formatted at UTC noon to never shift a day.
const dayLabel = (locale: Locale, date: string) => new Intl.DateTimeFormat(TAG[locale], { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

function byDay(schedule: ScheduleEntry[]): [string, ScheduleEntry[]][] {
  const sorted = [...schedule].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  const days = new Map<string, ScheduleEntry[]>();
  sorted.forEach((entry) => days.set(entry.date, [...(days.get(entry.date) ?? []), entry]));
  return [...days.entries()];
}

// A blank sub line keeps every tile's number on the same baseline (the strip spaces label, number and sub apart).
const BLANK = " ";

// Overview tab (spec §5.3): KPI tiles, the details list, the schedule by day, and the description.
export function EventOverview({ copy, locale, event, phase, testUsers }: Props) {
  const t = copy.ui.detail;
  const { attendees, connections, pending, organizers } = event.counts;
  const perPerson = attendees > 0 ? new Intl.NumberFormat(TAG[locale], { maximumFractionDigits: 1 }).format(connections / attendees) : null;
  const open = phase === "running" || phase === "upcoming";
  const endTime = inZone(locale, event.endsAt, event.timezone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <KpiStrip
        label={copy.detail.counts}
        locale={locale}
        columns="md:grid-cols-3 lg:grid-cols-5"
        tiles={[
          { key: "inside", label: copy.detail.attendees, value: attendees, sub: BLANK },
          { key: "connections", label: copy.detail.connections, value: connections, sub: perPerson ? t.perPerson(perPerson) : BLANK },
          { key: "pending", label: copy.detail.pending, value: pending, sub: open ? t.pendingUntil(endTime) : BLANK },
          { key: "organizers", label: copy.detail.organizers, value: organizers, sub: BLANK },
          { key: "test", label: t.testUsers, value: testUsers, sub: t.hiddenFromLive },
        ]}
      />
      <div className="grid grid-cols-1 items-start gap-5 md:gap-6 lg:grid-cols-2">
        <Details copy={copy} locale={locale} event={event} />
        <Schedule copy={copy} locale={locale} event={event} />
      </div>
      {event.description && (
        <Card className="flex flex-col gap-2 px-5 py-5">
          <h2 className="m-0 font-display text-[20px] font-bold">{t.about}</h2>
          <p className="m-0 text-[15px] leading-[1.5] font-bold whitespace-pre-line [overflow-wrap:anywhere]">{event.description}</p>
        </Card>
      )}
    </div>
  );
}

function Details({ copy, locale, event }: Omit<Props, "phase" | "testUsers">) {
  const t = copy.ui.detail;
  const rows: [string, string | null][] = [
    [copy.form.venueName, event.venueName],
    [copy.form.address, event.address],
    [copy.form.city, event.city],
    [copy.form.country, event.country],
    [copy.form.websiteUrl, event.websiteUrl],
    [t.timezone, `${event.timezone} (${zoneAbbreviation(locale, event.startsAt, event.timezone)})`],
    [t.slug, event.slug],
    [t.created, inZone(locale, event.createdAt, event.timezone, { day: "numeric", month: "short", year: "numeric" })],
  ];
  return (
    <Card className="flex min-w-0 flex-col gap-3 px-5 py-5">
      <h2 className="m-0 font-display text-[20px] font-bold">{t.details}</h2>
      <dl className="m-0 grid grid-cols-[minmax(84px,auto)_minmax(0,1fr)] gap-x-4 gap-y-3">
        {rows
          .filter((row): row is [string, string] => Boolean(row[1]))
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="pt-[2px] text-[12px] font-extrabold text-muted">{label}</dt>
              <dd className="m-0 min-w-0 text-[14px] font-extrabold [overflow-wrap:anywhere]">{label === copy.form.websiteUrl ? <WebsiteLink url={value} /> : value}</dd>
            </div>
          ))}
      </dl>
    </Card>
  );
}

const WebsiteLink = ({ url }: { url: string }) => (
  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ink lg:min-h-0">
    {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
  </a>
);

function Schedule({ copy, locale, event }: Omit<Props, "phase" | "testUsers">) {
  const t = copy.ui.detail;
  const days = byDay(event.schedule);
  return (
    <Card className="flex min-w-0 flex-col gap-3 px-5 py-5">
      <h2 className="m-0 font-display text-[20px] font-bold">{copy.form.schedule}</h2>
      {days.length === 0 && (
        <>
          <p className="m-0 text-[14px] font-extrabold">{eventWhen(locale, event.startsAt, event.endsAt, event.timezone)}</p>
          <Muted className="text-[13px] font-bold">{t.scheduleWindow}</Muted>
        </>
      )}
      {days.map(([date, entries]) => (
        <section key={date} className="flex flex-col gap-2">
          <h3 className="m-0 font-display text-[16px] font-bold">{dayLabel(locale, date)}</h3>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {entries.map((entry) => (
              <li key={`${entry.start}-${entry.end}-${entry.title ?? ""}`} className="flex items-start gap-3">
                <span className="shrink-0 rounded-full bg-sky-soft px-[10px] py-[3px] text-[12px] font-extrabold tabular-nums border-ink" style={{ borderWidth: 2 }}>
                  {entry.start}–{entry.end}
                </span>
                <span className="min-w-0 pt-[3px] text-[14px] font-extrabold [overflow-wrap:anywhere]">{entry.title ?? ""}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </Card>
  );
}
