import Link from "next/link";
import { eventWhen } from "@/lib/admin/format";
import type { EventPhaseT } from "@/lib/admin/event-phase";
import type { AdminEventT } from "@/lib/api/admin-schemas";
import type { Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { EventHeaderActions } from "./EventActions";
import { StatusPill, TestPill } from "./StatusPill";

type Props = { copy: Dictionary["admin"]; locale: Locale; event: AdminEventT; phase: EventPhaseT };

// Breadcrumb, name, phase + TEST, "when · where" in the event's zone, and the actions (spec §5.3). Not sticky: on a
// phone the tabs below it are what stays in reach.
export function EventHeader({ copy, locale, event, phase }: Props) {
  const place = [event.venueName, event.city].filter(Boolean).join(", ");
  return (
    <header className="flex flex-col gap-2">
      <nav aria-label={copy.ui.detail.breadcrumb}>
        <ol className="m-0 flex min-w-0 list-none items-center gap-2 p-0 text-[13px] font-extrabold">
          <li className="shrink-0">
            <Link href="/admin" className="inline-flex min-h-11 items-center text-muted underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink lg:min-h-6">
              {copy.events.title}
            </Link>
          </li>
          <li aria-hidden className="text-muted">
            /
          </li>
          <li aria-current="page" className="min-w-0 truncate" title={event.name}>
            {event.name}
          </li>
        </ol>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-[300px] flex-col gap-2">
          <h1 title={event.name} className="m-0 line-clamp-2 font-display text-[28px] leading-[1.1] font-bold [overflow-wrap:anywhere] md:line-clamp-none md:text-[34px]">
            {event.name}
          </h1>
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill phase={phase} copy={copy} />
            {event.isTest && <TestPill label={copy.events.test} />}
          </span>
          <p className="m-0 text-[14px] leading-snug font-extrabold [overflow-wrap:anywhere]">
            {eventWhen(locale, event.startsAt, event.endsAt, event.timezone)}
            {place && ` · ${place}`}
          </p>
        </div>
        <EventHeaderActions locale={locale} slug={event.slug} name={event.name} joinUrl={event.joinUrl} liveUrl={`${event.joinUrl}/live`} phase={phase} />
      </div>
    </header>
  );
}
