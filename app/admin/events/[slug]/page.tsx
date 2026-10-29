import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { z } from "zod";
import { AdminShell } from "@/components/admin/AdminShell";
import { ATTENDEE_FILTERS, AttendeeTable, type AttendeeParams } from "@/components/admin/AttendeeTable";
import { DangerZone } from "@/components/admin/EventActions";
import { EventForm } from "@/components/admin/EventForm";
import { EventHeader } from "@/components/admin/EventHeader";
import { EventOverview } from "@/components/admin/EventOverview";
import { EventOrganizers } from "@/components/admin/EventPeople";
import { QrPanel, QrPrintSheet } from "@/components/admin/QrPanel";
import { Tabs } from "@/components/admin/Tabs";
import { Muted } from "@/components/ui/Text";
import { phaseOf, type EventPhaseT } from "@/lib/admin/event-phase";
import { formatCount } from "@/lib/admin/format";
import { parsePageParams, type RawSearchParams } from "@/lib/admin/page-params";
import { ATTENDEE_SORTS, AdminAttendeeList, AdminEventBody, OrganizerList, type AdminEventT } from "@/lib/api/admin-schemas";
import { apiGet, apiGetOrNull, apiGetSafe } from "@/lib/api/server-fetch";
import type { Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { adminCopy, requireAdminPage } from "@/lib/server/admin-page";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

const TABS = ["overview", "people", "organizers", "settings", "qr"] as const;
type Tab = (typeof TABS)[number];
const PAGE_SIZE = 50;

// Never throws: a bad key falls back to its default (edge case 1).
const DetailParams = z.object({
  tab: z.enum(TABS).default("overview"),
  q: z.string().trim().max(80).optional(),
  filter: z.enum(ATTENDEE_FILTERS).default("all"),
  sort: z.enum(ATTENDEE_SORTS).default("checkedInAt"),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const QR_COLORS = { dark: "#1E1B2E", light: "#FFFFFF" };

// The People tab's query for the attendees API (spec §7.4): the UI's one filter maps to `test` or `source`.
function attendeeQuery({ q, filter, sort, dir, page }: AttendeeParams): string {
  const query = new URLSearchParams({ sort, page: String(page), pageSize: String(PAGE_SIZE) });
  if (q) query.set("q", q);
  if (dir) query.set("dir", dir);
  if (filter === "test") query.set("test", "only");
  if (filter === "admin") query.set("source", "admin");
  return query.toString();
}

// /admin/events/<slug> (spec §5.3): header, `?tab=` link tabs, one tab's content (only its data is fetched) and, from
// 1280 px, a sticky QR column that replaces the QR tab.
export default async function AdminEventPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = parsePageParams(DetailParams, await searchParams);
  const path = `/api/admin/events/${encodeURIComponent(slug)}`;
  const found = await apiGetOrNull(path, AdminEventBody);
  if (!found) notFound();
  const { event } = found;
  const [admin, { locale, copy }, qrSvg] = await Promise.all([
    requireAdminPage(),
    adminCopy(),
    QRCode.toString(event.joinUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: QR_COLORS }),
  ]);
  const now = new Date();
  const phase = phaseOf(event, now);
  const tab: Tab = query.tab;
  const content = await TabContent({ tab, query, path, event, phase, locale, copy, qrSvg, now });
  const counts = event.counts;
  const qr = { locale, name: event.name, slug: event.slug, joinUrl: event.joinUrl, svg: qrSvg };
  return (
    <AdminShell copy={copy} locale={locale} admin={admin} active="events">
      <div className="grid grid-cols-1 gap-5 md:gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_420px] 2xl:gap-12">
        <div className="flex min-w-0 flex-col gap-4 md:gap-5">
          <EventHeader copy={copy} locale={locale} event={event} phase={phase} />
          <Tabs
            label={copy.ui.detail.sections}
            active={tab}
            tabs={[
              { key: "overview", label: copy.ui.tabs.overview, href: `/admin/events/${event.slug}` },
              // Second on a phone (door use), last on a tablet, gone at xl where the QR column shows it.
              { key: "qr", label: copy.ui.tabs.qr, href: `/admin/events/${event.slug}?tab=qr`, className: "md:order-last xl:hidden" },
              { key: "people", label: copy.ui.tabs.people, href: `/admin/events/${event.slug}?tab=people`, count: formatCount(locale, counts.attendees) },
              { key: "organizers", label: copy.ui.tabs.organizers, href: `/admin/events/${event.slug}?tab=organizers`, count: formatCount(locale, counts.organizers) },
              { key: "settings", label: copy.ui.tabs.settings, href: `/admin/events/${event.slug}?tab=settings` },
            ]}
          />
          {content}
        </div>
        <aside className="hidden xl:sticky xl:top-6 xl:block xl:max-h-[calc(100dvh-48px)] xl:overflow-y-auto xl:pr-1 xl:pb-1">
          <QrPanel {...qr} variant="side" stats={{ attendees: counts.attendees, connections: counts.connections, pending: counts.pending }} />
        </aside>
      </div>
      <QrPrintSheet name={event.name} joinUrl={event.joinUrl} svg={qrSvg} />
    </AdminShell>
  );
}

type ContentProps = {
  tab: Tab;
  query: z.output<typeof DetailParams>;
  path: string;
  event: AdminEventT;
  phase: EventPhaseT;
  locale: Locale;
  copy: Dictionary["admin"];
  qrSvg: string;
  now: Date;
};

async function TabContent({ tab, query, path, event, phase, locale, copy, qrSvg, now }: ContentProps) {
  if (tab === "people") return <PeopleTab query={query} path={path} event={event} locale={locale} now={now} />;
  if (tab === "organizers") return <EventOrganizers locale={locale} slug={event.slug} organizers={(await apiGet(`${path}/organizers`, OrganizerList)).organizers} />;
  if (tab === "settings") return <SettingsTab event={event} phase={phase} locale={locale} copy={copy} />;
  const overview = await OverviewTab({ path, event, phase, locale, copy });
  if (tab === "overview") return overview;
  // ?tab=qr kept at xl (a shared link): the column already shows the QR, so the overview fills the main area.
  return (
    <>
      <div className="xl:hidden">
        <QrPanel locale={locale} name={event.name} slug={event.slug} joinUrl={event.joinUrl} svg={qrSvg} variant="tab" />
      </div>
      <div className="hidden xl:block">{overview}</div>
    </>
  );
}

async function OverviewTab({ path, event, phase, locale, copy }: Pick<ContentProps, "path" | "event" | "phase" | "locale" | "copy">) {
  // Only the whole-event counts are needed; a failure drops to "—" instead of the error page.
  const people = await apiGetSafe(`${path}/attendees?pageSize=1`, AdminAttendeeList);
  return <EventOverview copy={copy} locale={locale} event={event} phase={phase} testUsers={people?.counts.testUsers ?? null} />;
}

async function PeopleTab({ query, path, event, locale, now }: Pick<ContentProps, "query" | "path" | "event" | "locale" | "now">) {
  const people: AttendeeParams = { q: query.q || undefined, filter: query.filter, sort: query.sort, dir: query.dir, page: query.page };
  const list = await apiGet(`${path}/attendees?${attendeeQuery(people)}`, AdminAttendeeList);
  return (
    <AttendeeTable
      locale={locale}
      slug={event.slug}
      timeZone={event.timezone}
      now={now.toISOString()}
      attendees={list.attendees}
      total={list.total}
      counts={{ attendees: list.counts.attendees, testUsers: list.counts.testUsers }}
      params={people}
      pageSize={PAGE_SIZE}
    />
  );
}

function SettingsTab({ event, phase, locale, copy }: Pick<ContentProps, "event" | "phase" | "locale" | "copy">) {
  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <Muted className="text-[13px] font-bold">{copy.ui.detail.concurrent}</Muted>
      <EventForm key={`${event.startsAt}-${event.endsAt}-${event.status}`} locale={locale} event={event} />
      <DangerZone locale={locale} slug={event.slug} phase={phase} />
    </div>
  );
}
