import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState, FilterTabs, type TableSort } from "@/components/admin/AdminParts";
import { EventsProvider } from "@/components/admin/EventsClient";
import { EventCards, EventsTable, toListEvent } from "@/components/admin/EventsList";
import { KpiStrip, type KpiTile } from "@/components/admin/KpiStrip";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { ToolbarSelect } from "@/components/admin/ToolbarSelect";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/Button";
import { EVENT_PHASES } from "@/lib/admin/event-phase";
import { EVENT_LIST_DEFAULTS, PAGE_SIZES, TEST_SCOPES, eventListState, eventsApiQuery, type EventListState, type EventSortT } from "@/lib/admin/events-query";
import { formatCount } from "@/lib/admin/format";
import type { RawSearchParams } from "@/lib/admin/page-params";
import { sortDirection, type SortDir } from "@/lib/admin/sort";
import { hrefWith, type UrlParams } from "@/lib/admin/url";
import { AdminEventList, AdminStats, EVENT_SORTS, type AdminStatsT } from "@/lib/api/admin-schemas";
import { apiGet, apiGetSafe } from "@/lib/api/server-fetch";
import type { Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { adminCopy, requireAdminPage } from "@/lib/server/admin-page";

type Props = { searchParams: Promise<RawSearchParams> };
type Copy = Dictionary["admin"];

const PATH = "/admin";
const link = (url: UrlParams, patch: UrlParams) => hrefWith(PATH, url, patch, EVENT_LIST_DEFAULTS);

const notArchived = (stats: AdminStatsT) => stats.events.running + stats.events.upcoming + stats.events.draft + stats.events.ended;

// KPI strip (spec §5.1): a failed stats call shows "—" in every tile, never the error page (edge case 32).
function kpiTiles(copy: Copy, stats: AdminStatsT | null): KpiTile[] {
  const { kpi } = copy.ui;
  const sub = (text: (s: AdminStatsT) => string) => (stats ? text(stats) : undefined);
  return [
    { key: "running", label: kpi.running, value: stats?.events.running ?? null, sub: sub((s) => kpi.ofLive(s.events.running + s.events.upcoming)), href: "/admin?phase=running", live: Boolean(stats?.events.running) },
    { key: "upcoming", label: kpi.upcoming, value: stats?.events.upcoming ?? null, href: "/admin?phase=upcoming" },
    { key: "checkIns", label: kpi.checkIns, value: stats?.checkIns.total ?? null, sub: sub((s) => kpi.last24h(s.checkIns.last24h)) },
    { key: "connections", label: kpi.connections, value: stats?.connections.accepted ?? null, sub: sub((s) => kpi.pending(s.connections.pending)) },
    { key: "drafts", label: kpi.drafts, value: stats?.events.draft ?? null, href: "/admin?phase=draft", className: "hidden 2xl:flex" },
    { key: "people", label: kpi.people, value: stats?.people.total ?? null, sub: sub((s) => copy.attendees.testCount(s.people.test)), href: "/admin/people", className: "hidden 2xl:flex" },
  ];
}

// All · Running · Upcoming · Drafts · Ended · Archived, with counts from the stats (spec §5.1).
function phaseChips(copy: Copy, locale: Locale, state: EventListState, stats: AdminStatsT | null) {
  const count = (value: number | undefined) => (value === undefined ? undefined : formatCount(locale, value));
  const all = { key: "all", label: copy.ui.eventList.all, href: link(state.url, { phase: undefined }), count: count(stats ? notArchived(stats) : undefined) };
  // EVENT_PHASES is already in chip order: running, upcoming, draft, ended, archived.
  const phases = EVENT_PHASES.map((phase) => ({
    key: phase,
    label: phase === "draft" ? copy.ui.kpi.drafts : copy.ui.phase[phase],
    href: link(state.url, { phase }),
    count: count(stats?.events[phase]),
  }));
  return <FilterTabs label={copy.ui.sort.status} active={state.phase ?? "all"} options={[all, ...phases]} />;
}

// The phone sort select (headers sort from md): each key at its default direction, plus the current order if it differs.
function orderOptions(copy: Copy, state: EventListState) {
  const arrow = (dir: SortDir) => (dir === "asc" ? "↑" : "↓");
  const option = (sort: EventSortT, dir: SortDir) => ({ value: `${sort}:${dir}`, label: `${copy.ui.sort[sort]} ${arrow(dir)}` });
  const defaults = EVENT_SORTS.map((sort) => option(sort, sortDirection(sort)));
  const current = option(state.sort, state.effectiveDir);
  return defaults.some((item) => item.value === current.value) ? defaults : [current, ...defaults];
}

function Toolbar({ copy, locale, state, stats, result }: { copy: Copy; locale: Locale; state: EventListState; stats: AdminStatsT | null; result: string }) {
  const list = copy.ui.eventList;
  return (
    <ListToolbar
      action={PATH}
      params={state.url}
      owned={["test", "sort", "dir"]}
      searchLabel={list.searchLabel}
      placeholder={list.searchPlaceholder}
      submitLabel={list.searchSubmit}
      chips={phaseChips(copy, locale, state, stats)}
      selects={
        <>
          <ToolbarSelect name="test" label={list.testLabel} value={state.test} options={TEST_SCOPES.map((scope) => ({ value: scope, label: list.testScope[scope] }))} />
          <ToolbarSelect name="order" label={list.sortLabel} value={`${state.sort}:${state.effectiveDir}`} options={orderOptions(copy, state)} className="md:hidden" />
        </>
      }
      result={result}
    />
  );
}

function NoMatch({ copy, state }: { copy: Copy; state: EventListState }) {
  const clear = link(state.url, { q: undefined, phase: undefined, test: undefined });
  return (
    <EmptyState
      title={copy.ui.list.noMatch(state.q ?? "")}
      body={copy.ui.eventList.noMatchBody}
      action={
        <ButtonLink href={clear} variant="primary" height={44} className="w-auto! px-5 text-[15px]">
          {copy.ui.list.clearFilters}
        </ButtonLink>
      }
    />
  );
}

// /admin: KPI strip, toolbar, sortable table (cards on a phone) and pagination (spec §5.1). Every filter, the sort and the
// page live in the URL; a bad param falls back to its default rather than the error page.
export default async function AdminEventsPage({ searchParams }: Props) {
  const state = eventListState(await searchParams);
  const [admin, { locale, copy }, list, stats] = await Promise.all([
    requireAdminPage(),
    adminCopy(),
    apiGet(`/api/admin/events?${eventsApiQuery(state)}`, AdminEventList),
    apiGetSafe("/api/admin/stats", AdminStats),
  ]);
  const now = new Date();
  const create = (
    <ButtonLink href="/admin/events/new" variant="primary" height={44} className="w-auto! px-4 text-[15px]">
      <Icon name="plus" size={18} />
      {/* Icon-only on the smallest phones so the top-bar title keeps room; the label stays for screen readers. */}
      <span className="max-[400px]:sr-only">{copy.events.create}</span>
    </ButtonLink>
  );
  const shell = { copy, locale, admin, active: "events" as const, title: copy.events.title, primary: create, live: Boolean(stats?.events.running) };
  const counts = stats ? { events: notArchived(stats), people: stats.people.total, testUsers: stats.people.test } : undefined;
  // First run: nothing anywhere, so no wall of zeros and no toolbar (edge case 33). Without stats we cannot know that
  // archived events exist, so keep the toolbar and its Archived chip reachable.
  const firstRun = list.total === 0 && !state.filtered && (stats ? notArchived(stats) + stats.events.archived === 0 : false);
  if (firstRun) {
    return (
      <AdminShell {...shell}>
        <EmptyState title={copy.ui.emptyEventsTitle} body={copy.ui.emptyEventsBody} action={create} />
      </AdminShell>
    );
  }
  const from = (list.page - 1) * list.pageSize + 1;
  const result = list.events.length ? copy.ui.list.range(from, from + list.events.length - 1, list.total) : copy.ui.resultCount(list.total);
  const sort: TableSort = { key: state.sort, dir: state.effectiveDir, hrefFor: (key, dir) => link(state.url, { sort: key, dir }) };
  const events = list.events;
  return (
    <AdminShell {...shell} counts={counts}>
      <KpiStrip label={copy.ui.tabs.overview} locale={locale} tiles={kpiTiles(copy, stats)} />
      {/* The sticky table header parks under the sticky toolbar (two rows below 1280, one from 1280). */}
      <div className="flex flex-col gap-4 [--admin-sticky-top:137px] xl:[--admin-sticky-top:81px]">
        <Toolbar copy={copy} locale={locale} state={state} stats={stats} result={result} />
        {list.total === 0 && <NoMatch copy={copy} state={state} />}
        <EventsProvider key={link(state.url, {})} locale={locale} events={events.map((event) => toListEvent(event, now))}>
          {events.length > 0 && <EventsTable events={events} copy={copy} locale={locale} now={now} sort={sort} />}
          {events.length > 0 && <EventCards events={events} copy={copy} locale={locale} now={now} />}
          {list.total > 0 && (
            <Pagination
              page={list.page}
              pageSize={list.pageSize}
              total={list.total}
              hrefFor={(page) => link(state.url, { page: String(page) })}
              copy={copy.ui.list}
              pageSizes={{ sizes: [...PAGE_SIZES], hrefFor: (size) => link(state.url, { pageSize: String(size) }) }}
            />
          )}
        </EventsProvider>
      </div>
    </AdminShell>
  );
}
