import Link from "next/link";
import { AdminShell, AdminTitle } from "@/components/admin/AdminShell";
import { StatusPill, TestPill } from "@/components/admin/StatusPill";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import { AdminEventList } from "@/lib/api/admin-schemas";
import { apiGet } from "@/lib/api/server-fetch";
import { formatTime } from "@/lib/copy";
import { adminCopy } from "@/lib/server/admin-page";

type Props = { searchParams: Promise<{ archived?: string }> };

const dateIn = (locale: string, iso: string, timeZone: string) =>
  new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", { day: "numeric", month: "short", year: "numeric", timeZone }).format(new Date(iso));

// /admin: every event, newest first (backlog T-023).
export default async function AdminEventsPage({ searchParams }: Props) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";
  const [{ locale, copy }, list] = await Promise.all([adminCopy(), apiGet(`/api/admin/events?archived=${showArchived ? 1 : 0}`, AdminEventList)]);
  return (
    <AdminShell copy={copy} active="events">
      <AdminTitle
        right={
          <div className="flex items-center gap-3">
            <Link href={showArchived ? "/admin" : "/admin?archived=1"} className="text-[13px] font-extrabold underline">
              {showArchived ? copy.events.hideArchived : copy.events.showArchived}
            </Link>
            <ButtonLink href="/admin/events/new" variant="primary" height={46} className="w-auto">
              {copy.events.create}
            </ButtonLink>
          </div>
        }
      >
        {copy.events.title}
      </AdminTitle>
      {list.events.length === 0 && <Muted className="font-bold">{copy.events.empty}</Muted>}
      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
        {list.events.map((event) => (
          <li key={event.id}>
            <Card href={`/admin/events/${event.slug}`} className="flex h-full flex-col gap-2 px-4 py-4" ariaLabel={`${copy.events.open}: ${event.name}`}>
              <span className="flex flex-wrap items-center gap-2">
                <StatusPill status={event.status} copy={copy} />
                {event.isTest && <TestPill label={copy.events.test} />}
              </span>
              <span className="font-display text-[20px] leading-[1.15] font-bold">{event.name}</span>
              <Muted className="text-[13px] font-bold">
                {dateIn(locale, event.startsAt, event.timezone)} · {formatTime(locale, event.startsAt, event.timezone)}–{formatTime(locale, event.endsAt, event.timezone)} ·{" "}
                {[event.venueName, event.city].filter(Boolean).join(", ") || event.timezone}
              </Muted>
              <span className="mt-auto text-[13px] font-extrabold">{copy.events.counts(event.counts.attendees, event.counts.connections)}</span>
            </Card>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
