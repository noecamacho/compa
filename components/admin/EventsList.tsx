import Link from "next/link";
import { Icon } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { phaseOf, type EventPhaseT } from "@/lib/admin/event-phase";
import { eventWhen, formatCount, relative } from "@/lib/admin/format";
import type { AdminEventT } from "@/lib/api/admin-schemas";
import type { Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { CardList, Cell, DataTable, Row, type Column, type TableSort } from "./AdminParts";
import { EventRowMenu, PageCheck, RowCheck, type ListEvent } from "./EventsClient";
import { StatusPill, TestPill } from "./StatusPill";

type Props = { events: AdminEventT[]; copy: Dictionary["admin"]; locale: Locale; now: Date };

export const toListEvent = (event: AdminEventT, now: Date): ListEvent => ({ id: event.id, slug: event.slug, name: event.name, phase: phaseOf(event, now), joinUrl: event.joinUrl });

const placeOf = (event: AdminEventT) => [event.venueName, event.city].filter(Boolean).join(", ") || "—";

// Second line of "When": how far away the event is, or when a running one ends (spec §5.1).
function whenRelative(copy: Dictionary["admin"], locale: Locale, event: AdminEventT, phase: EventPhaseT, now: Date): string {
  if (phase === "running") return copy.ui.eventList.endsRel(relative(locale, event.endsAt, now));
  const anchor = phase === "upcoming" || phase === "draft" ? event.startsAt : event.endsAt;
  return relative(locale, anchor, now);
}

function Badges({ event, phase, copy }: { event: AdminEventT; phase: EventPhaseT; copy: Dictionary["admin"] }) {
  return (
    <span className="flex flex-wrap items-start gap-1.5">
      <StatusPill phase={phase} copy={copy} />
      {event.isTest && <TestPill label={copy.events.test} />}
    </span>
  );
}

// The name is a stretched link: the whole row or card opens the event, while the checkbox and ⋯ sit above it (z-10).
function NameLink({ event, copy, className }: { event: AdminEventT; copy: Dictionary["admin"]; className: string }) {
  return (
    <Link
      href={`/admin/events/${event.slug}`}
      aria-label={`${copy.events.open}: ${event.name}`}
      title={event.name}
      className={`flex min-h-11 items-center rounded-[4px] underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${className}`}
    >
      <span className="line-clamp-2">{event.name}</span>
    </Link>
  );
}

const NUM = "text-right tabular-nums whitespace-nowrap";
const WIDE = "hidden min-[1440px]:table-cell";
const WIDEST = "hidden min-[1800px]:table-cell";

// Columns by width (spec §5.1): md shows the essentials with place as a sub-line and the counts merged; lg adds the
// checkbox, place and split counts; 1440 adds pending and organizers; 1800+ adds code and created.
function columnsFor(copy: Dictionary["admin"]): Column[] {
  const { ui, detail } = copy;
  return [
    { key: "select", label: <PageCheck />, className: "hidden w-12 px-2! lg:table-cell" },
    { key: "event", label: ui.colEvent, sortKey: "name" },
    { key: "status", label: ui.colStatus, sortKey: "status" },
    { key: "when", label: ui.colWhen, sortKey: "startsAt" },
    { key: "place", label: ui.form.place, className: "hidden lg:table-cell" },
    { key: "counts", label: `${ui.sort.attendees} · ${ui.sort.connections}`, sortKey: "attendees", align: "right", className: "lg:hidden" },
    { key: "inside", label: ui.sort.attendees, sortKey: "attendees", align: "right", className: "hidden lg:table-cell" },
    { key: "connections", label: ui.sort.connections, sortKey: "connections", align: "right", className: "hidden lg:table-cell" },
    { key: "pending", label: detail.pending, align: "right", className: WIDE },
    { key: "organizers", label: detail.organizers, align: "right", className: WIDE },
    { key: "code", label: ui.eventList.colCode, className: WIDEST },
    { key: "created", label: ui.sort.createdAt, sortKey: "createdAt", className: WIDEST },
    { key: "menu", label: <span className="sr-only">{ui.colActions}</span>, className: "w-14 px-2!" },
  ];
}

export function EventsTable({ events, copy, locale, now, sort }: Props & { sort: TableSort }) {
  return (
    <DataTable label={copy.events.title} columns={columnsFor(copy)} sort={sort}>
      {events.map((event) => (
        <EventRow key={event.id} event={event} copy={copy} locale={locale} now={now} />
      ))}
    </DataTable>
  );
}

function EventRow({ event, copy, locale, now }: { event: AdminEventT; copy: Dictionary["admin"]; locale: Locale; now: Date }) {
  const item = toListEvent(event, now);
  const count = (value: number) => formatCount(locale, value);
  return (
    <Row>
      <Cell className="hidden px-2! lg:table-cell">
        <RowCheck event={item} />
      </Cell>
      <Cell className="min-w-[160px] font-display text-[16px] leading-[1.2] font-bold">
        <NameLink event={event} copy={copy} className="" />
        <span className="line-clamp-1 font-body text-[13px] font-bold text-muted lg:hidden" title={placeOf(event)}>
          {placeOf(event)}
        </span>
      </Cell>
      <Cell>
        <Badges event={event} phase={item.phase} copy={copy} />
      </Cell>
      <Cell className="min-w-[150px] text-[13px]">
        {eventWhen(locale, event.startsAt, event.endsAt, event.timezone)}
        <span className="mt-0.5 block text-[12px] text-muted">{whenRelative(copy, locale, event, item.phase, now)}</span>
      </Cell>
      <Cell className="hidden text-[13px] lg:table-cell">
        <span className="line-clamp-2" title={placeOf(event)}>
          {placeOf(event)}
        </span>
      </Cell>
      <Cell className={`${NUM} lg:hidden`}>
        {count(event.counts.attendees)} · {count(event.counts.connections)}
      </Cell>
      <Cell className={`${NUM} hidden lg:table-cell`}>{count(event.counts.attendees)}</Cell>
      <Cell className={`${NUM} hidden lg:table-cell`}>{count(event.counts.connections)}</Cell>
      <Cell className={`${NUM} ${WIDE}`}>{count(event.counts.pending)}</Cell>
      <Cell className={`${NUM} ${WIDE}`}>{count(event.counts.organizers)}</Cell>
      <Cell className={`${WIDEST} font-mono text-[13px] whitespace-nowrap`}>{event.accessCode}</Cell>
      <Cell className={`${WIDEST} text-[13px] whitespace-nowrap text-muted`}>{relative(locale, event.createdAt, now)}</Cell>
      <Cell className="px-2!">
        <EventRowMenu event={item} place="row" />
      </Cell>
    </Row>
  );
}

// Phones: one card per event, two columns on a landscape phone (640–767).
export function EventCards({ events, copy, locale, now }: Props) {
  return (
    <CardList className="sm:grid sm:grid-cols-2">
      {events.map((event) => (
        <li key={event.id} className="min-w-0">
          <EventCard event={event} copy={copy} locale={locale} now={now} />
        </li>
      ))}
    </CardList>
  );
}

function EventCard({ event, copy, locale, now }: { event: AdminEventT; copy: Dictionary["admin"]; locale: Locale; now: Date }) {
  const item = toListEvent(event, now);
  const when = eventWhen(locale, event.startsAt, event.endsAt, event.timezone);
  return (
    <Card size="sm" className="relative flex h-full flex-col gap-1 py-3 pr-2 pl-4">
      <div className="flex items-start justify-between gap-2">
        <Badges event={event} phase={item.phase} copy={copy} />
        <EventRowMenu event={item} place="card" />
      </div>
      <NameLink event={event} copy={copy} className="pr-2 font-display text-[18px] leading-[1.2] font-bold" />
      <span className="truncate pr-2 text-[13px] font-extrabold" title={when}>
        {when}
      </span>
      <span className="truncate pr-2 text-[13px] font-bold text-muted" title={placeOf(event)}>
        {placeOf(event)}
      </span>
      <CardStats event={event} copy={copy} locale={locale} />
    </Card>
  );
}

function CardStats({ event, copy, locale }: { event: AdminEventT; copy: Dictionary["admin"]; locale: Locale }) {
  const count = (value: number) => formatCount(locale, value);
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-extrabold tabular-nums">
      <span className="flex items-center gap-1">
        <Icon name="people" size={16} />
        {count(event.counts.attendees)}
        <span className="sr-only">{copy.detail.attendees}</span>
      </span>
      <span className="flex items-center gap-1">
        <Icon name="link" size={16} />
        {count(event.counts.connections)}
        <span className="sr-only">{copy.detail.connections}</span>
      </span>
      <span>{copy.ui.kpi.pending(event.counts.pending)}</span>
    </span>
  );
}
