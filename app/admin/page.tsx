import Link from "next/link";
import { AdminShell, AdminTitle } from "@/components/admin/AdminShell";
import { CardList, Cell, DataTable, EmptyState, FilterTabs, MobileActionBar, Row } from "@/components/admin/AdminParts";
import { StatusPill, TestPill } from "@/components/admin/StatusPill";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import { AdminEventList, type AdminEventT } from "@/lib/api/admin-schemas";
import { apiGet } from "@/lib/api/server-fetch";
import { formatTime, type Dictionary } from "@/lib/copy";
import { adminCopy } from "@/lib/server/admin-page";

type Props = { searchParams: Promise<{ archived?: string }> };

const dateIn = (locale: string, iso: string, timeZone: string) =>
  new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", { day: "numeric", month: "short", year: "numeric", timeZone }).format(new Date(iso));

const whenOf = (locale: "es" | "en", event: AdminEventT) =>
  `${dateIn(locale, event.startsAt, event.timezone)} · ${formatTime(locale, event.startsAt, event.timezone)}–${formatTime(locale, event.endsAt, event.timezone)}`;

const whereOf = (event: AdminEventT) => [event.venueName, event.city].filter(Boolean).join(", ") || event.timezone;

function EventBadges({ event, copy }: { event: AdminEventT; copy: Dictionary["admin"] }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <StatusPill status={event.status} copy={copy} />
      {event.isTest && <TestPill label={copy.events.test} />}
    </span>
  );
}

// /admin: every event, newest first (backlog T-023). A table from 768 px, stacked cards on a phone.
export default async function AdminEventsPage({ searchParams }: Props) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";
  const [{ locale, copy }, list] = await Promise.all([adminCopy(), apiGet(`/api/admin/events?archived=${showArchived ? 1 : 0}`, AdminEventList)]);
  const create = (
    <ButtonLink href="/admin/events/new" variant="primary" height={46} className="w-auto!">
      {copy.events.create}
    </ButtonLink>
  );
  return (
    <AdminShell copy={copy} active="events">
      <AdminTitle right={<span className="hidden md:block">{create}</span>}>{copy.events.title}</AdminTitle>
      <FilterTabs
        label={copy.events.title}
        active={showArchived ? "archived" : "active"}
        options={[
          { key: "active", label: copy.events.hideArchived, href: "/admin" },
          { key: "archived", label: copy.events.showArchived, href: "/admin?archived=1" },
        ]}
      />
      {list.events.length === 0 && (
        <EmptyState
          title={showArchived ? copy.ui.emptyArchived : copy.ui.emptyEventsTitle}
          body={showArchived ? undefined : copy.ui.emptyEventsBody}
        />
      )}
      {list.events.length > 0 && (
        <>
          <DataTable label={copy.events.title} columns={[copy.ui.colEvent, copy.ui.colStatus, copy.ui.colWhen, copy.ui.colPeople]}>
            {list.events.map((event) => (
              <Row key={event.id}>
                <Cell className="font-display text-[17px] leading-[1.2] font-bold">
                  <Link href={`/admin/events/${event.slug}`} aria-label={`${copy.events.open}: ${event.name}`} className="underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:underline">
                    {event.name}
                  </Link>
                  <span className="mt-1 block text-[13px] font-bold text-muted">{whereOf(event)}</span>
                </Cell>
                <Cell>
                  <EventBadges event={event} copy={copy} />
                </Cell>
                <Cell>{whenOf(locale, event)}</Cell>
                <Cell className="whitespace-nowrap">{copy.events.counts(event.counts.attendees, event.counts.connections)}</Cell>
              </Row>
            ))}
          </DataTable>
          <CardList>
            {list.events.map((event) => (
              <li key={event.id}>
                <Card href={`/admin/events/${event.slug}`} className="flex flex-col gap-2 px-4 py-4" ariaLabel={`${copy.events.open}: ${event.name}`}>
                  <EventBadges event={event} copy={copy} />
                  <span className="font-display text-[20px] leading-[1.15] font-bold">{event.name}</span>
                  <Muted className="text-[13px] font-bold">
                    {whenOf(locale, event)} · {whereOf(event)}
                  </Muted>
                  <span className="text-[13px] font-extrabold">{copy.events.counts(event.counts.attendees, event.counts.connections)}</span>
                </Card>
              </li>
            ))}
          </CardList>
        </>
      )}
      <MobileActionBar>
        <ButtonLink href="/admin/events/new" variant="primary" height={50}>
          {copy.events.create}
        </ButtonLink>
      </MobileActionBar>
    </AdminShell>
  );
}
