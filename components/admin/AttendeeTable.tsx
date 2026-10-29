"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Muted } from "@/components/ui/Text";
import { formatCount, relative } from "@/lib/admin/format";
import { sortDirection, type SortDir } from "@/lib/admin/sort";
import { hrefWith, type UrlParams } from "@/lib/admin/url";
import { AddedAttendee, type AdminAttendeeT } from "@/lib/api/admin-schemas";
import { apiCall } from "@/lib/api/client";
import { NoBody } from "@/lib/api/route-spec";
import { copyFor, type Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { CardList, Cell, DataTable, EmptyState, FilterTabs, Row, type Column } from "./AdminParts";
import { writeErrors } from "./EventActions";
import { Notice } from "./Notice";
import { Pagination } from "./Pagination";
import { PickDialog } from "./PickDialog";
import { Pill } from "@/components/ui/Pill";
import { ToolbarSelect } from "./ToolbarSelect";
import { UserPicker } from "./UserPicker";
import { useAdminAction } from "./useAdminAction";

export const ATTENDEE_FILTERS = ["all", "test", "admin"] as const;
export type AttendeeFilter = (typeof ATTENDEE_FILTERS)[number];
type AttendeeSort = "checkedInAt" | "name" | "points" | "connections";

export type AttendeeParams = { q?: string; filter: AttendeeFilter; sort: AttendeeSort; dir?: SortDir; page: number };

type Props = {
  locale: Locale;
  slug: string;
  timeZone: string;
  // From the request, so the server and the client print the same "12 min ago" (spec §6.2).
  now: string;
  attendees: AdminAttendeeT[];
  total: number;
  counts: { attendees: number; testUsers: number };
  params: AttendeeParams;
  pageSize: number;
};

const DEFAULTS: UrlParams = { filter: "all", sort: "checkedInAt" };
const SORTS: AttendeeSort[] = ["checkedInAt", "name", "points", "connections"];
// Email and Company only where the content column is wide enough beside the QR column (≈1800 px, not 2xl: at 1536 the
// column is ~720 px and the table would clip). Cells are px-3 so the base columns fit that ~720 px column.
const WIDE = "hidden min-[1800px]:table-cell";
const TIGHT = "px-3!";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

// People tab (spec §5.3): toolbar, sortable table (cards on a phone), pagination of 50, check-in through a dialog and
// removal behind a confirm that names the person and their connections. Every write ends in router.refresh().
export function AttendeeTable({ locale, slug, timeZone, now, attendees, total, counts, params, pageSize }: Props) {
  const full = copyFor(locale).admin;
  const t = full.ui.detail;
  const path = `/admin/events/${slug}`;
  const current: UrlParams = { tab: "people", q: params.q, filter: params.filter, sort: params.sort, dir: params.dir, page: String(params.page) };
  const href = (patch: UrlParams) => hrefWith(path, current, patch, DEFAULTS);
  const { busy, error, notice, run, dialog } = useAdminAction(full.detail.failed);
  const [picking, setPicking] = useState(false);
  const base = `/api/admin/events/${slug}`;

  async function checkIn(userId: string) {
    const ok = await run(() => apiCall("POST", `${base}/attendees`, AddedAttendee, { userId }), {
      done: full.ui.done.checkedIn,
      errors: writeErrors(full.ui, { test_user_not_allowed: t.testNotAllowed }),
    });
    if (ok) setPicking(false);
    return ok;
  }

  const remove = ({ user, connections }: AdminAttendeeT) =>
    run(() => apiCall("DELETE", `${base}/attendees/${user.id}`, NoBody), {
      confirm: { title: full.ui.dialogs.removeAttendee.title(user.name), body: t.removeBody(connections), confirmLabel: full.ui.dialogs.removeAttendee.confirm, cancelLabel: full.ui.cancel, danger: true },
      done: full.ui.dialogs.removeAttendee.done,
      errors: writeErrors(full.ui, { attendee_not_found: t.alreadyRemoved }),
    });

  const checkInButton = (
    <Button height={44} variant="primary" className="w-auto! shrink-0 px-4 text-[15px] shadow-hard-2!" disabled={busy} onClick={() => setPicking(true)}>
      <Icon name="plus" size={18} />
      {t.checkIn}
    </Button>
  );
  const rows = { full, locale, now, timeZone, busy, remove };

  return (
    <div className="flex flex-col gap-4">
      {counts.attendees === 0 ? (
        <EmptyState title={t.emptyPeople} body={t.emptyPeopleBody} action={checkInButton} />
      ) : (
        <>
          <Toolbar copy={full} locale={locale} params={params} path={path} href={href} counts={counts} action={checkInButton} total={total} pageSize={pageSize} />
          <Results {...rows} attendees={attendees} total={total} params={params} href={href} />
          <Pagination page={params.page} pageSize={pageSize} total={total} hrefFor={(page) => href({ page: String(page) })} copy={full.ui.list} />
        </>
      )}
      <Notice tone="error">{picking ? null : error}</Notice>
      <Notice tone="success">{notice}</Notice>
      <PickDialog open={picking} onClose={() => setPicking(false)} title={t.checkIn} closeLabel={t.close}>
        <UserPicker locale={locale} id="attendee-search" actionLabel={full.attendees.add} hint={full.attendees.addHint} onPick={(user) => checkIn(user.id)} />
        <Notice tone="error">{error}</Notice>
      </PickDialog>
      {dialog}
    </div>
  );
}

type ToolbarProps = {
  copy: Dictionary["admin"];
  locale: Locale;
  params: AttendeeParams;
  path: string;
  href: (patch: UrlParams) => string;
  counts: Props["counts"];
  action: ReactNode;
  total: number;
  pageSize: number;
};

// A GET form like ListToolbar, laid out for a content column rather than the full page: search + action, then filter
// chips + sort, then the result line. Works without JS; the sort select submits on change.
function Toolbar({ copy, locale, params, path, href, counts, action, total, pageSize }: ToolbarProps) {
  const t = copy.ui.detail;
  const from = total === 0 ? 0 : (params.page - 1) * pageSize + 1;
  const to = Math.min(total, params.page * pageSize);
  const chipCount: Partial<Record<AttendeeFilter, number>> = { all: counts.attendees, test: counts.testUsers };
  return (
    <form method="get" action={path} role="search" className="flex flex-col gap-3">
      <input type="hidden" name="tab" value="people" />
      {params.filter !== "all" && <input type="hidden" name="filter" value={params.filter} />}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[min(100%,240px)] flex-1">
          <label htmlFor="people-q" className="sr-only">
            {t.searchPeople}
          </label>
          <input
            id="people-q"
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder={t.searchPeople}
            enterKeyHint="search"
            maxLength={80}
            className="box-border block h-11 w-full rounded-[12px] bg-white pr-12 pl-3 font-body text-[16px] font-bold text-ink outline-none border-ink transition-shadow duration-200 placeholder:text-muted focus:shadow-[0_0_0_4px_#6BE4A3] md:text-[14px]"
          />
          <button type="submit" aria-label={copy.people.search} title={copy.people.search} className="absolute top-0 right-0 flex size-11 cursor-pointer items-center justify-center rounded-r-[12px] text-ink hover:bg-sun-soft">
            <Icon name="search" size={20} />
          </button>
        </div>
        {action}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          label={t.filterLabel}
          active={params.filter}
          options={(["all", "test", "admin"] as const).map((key) => ({
            key,
            label: t.filters[key],
            href: href({ filter: key }),
            count: chipCount[key] === undefined ? undefined : formatCount(locale, chipCount[key]),
          }))}
        />
        <ToolbarSelect name="sort" label={t.sortLabel} value={params.sort} options={SORTS.map((key) => ({ value: key, label: t.sorts[key] }))} />
      </div>
      {total > 0 && (
        <p role="status" className="m-0 text-[13px] font-extrabold text-muted tabular-nums">
          {copy.ui.list.range(from, to, total)}
        </p>
      )}
    </form>
  );
}

type RowsProps = {
  full: Dictionary["admin"];
  locale: Locale;
  now: string;
  timeZone: string;
  busy: boolean;
  remove: (attendee: AdminAttendeeT) => Promise<boolean>;
};

function Results({ attendees, total, params, href, ...rows }: RowsProps & { attendees: AdminAttendeeT[]; total: number; params: AttendeeParams; href: (patch: UrlParams) => string }) {
  const { full } = rows;
  const t = full.ui.detail;
  if (total === 0)
    return (
      <EmptyState
        title={full.ui.list.noMatch(params.q ?? "")}
        action={
          <Link href={href({ q: undefined, filter: "all", sort: "checkedInAt", dir: undefined })} className="inline-flex min-h-11 items-center text-[14px] font-extrabold underline">
            {full.ui.list.clearFilters}
          </Link>
        }
      />
    );
  if (attendees.length === 0) return null;
  const columns: Column[] = [
    { key: "person", label: full.ui.colPerson, sortKey: "name", className: TIGHT },
    { key: "checkedInAt", label: t.checkedIn, sortKey: "checkedInAt", className: TIGHT },
    { key: "points", label: t.points, sortKey: "points", align: "right", className: TIGHT },
    { key: "connections", label: full.detail.connections, sortKey: "connections", align: "right", className: TIGHT },
    { key: "email", label: t.email, className: `${WIDE} ${TIGHT}` },
    { key: "company", label: t.company, className: `${WIDE} ${TIGHT}` },
    { key: "actions", label: full.ui.colActions, className: `${TIGHT} text-transparent select-none` },
  ];
  const sort = { key: params.sort, dir: sortDirection(params.sort, params.dir), hrefFor: (key: string, dir: SortDir | undefined) => href({ sort: key, dir }) };
  return (
    <>
      <DataTable label={full.attendees.title} columns={columns} sort={sort}>
        {attendees.map((attendee) => (
          <AttendeeRow key={attendee.user.id} attendee={attendee} {...rows} />
        ))}
      </DataTable>
      <CardList>
        {attendees.map((attendee) => (
          <AttendeeCard key={attendee.user.id} attendee={attendee} {...rows} />
        ))}
      </CardList>
    </>
  );
}

function exactTime(locale: Locale, iso: string, timeZone: string): string {
  const options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
  try {
    return new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", { ...options, timeZone }).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString();
  }
}

function Person({ user, test }: { user: AdminAttendeeT["user"]; test: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span aria-hidden className={`box-border flex size-9 shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold border-ink ${user.isTest ? "bg-gum-soft" : "bg-sky-soft"}`} style={{ borderWidth: 2 }}>
        {initials(user.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-extrabold" title={user.name}>
          {user.name}
        </span>
        {/* The TEST pill rides on the handle line so the name keeps the width (tables beside the QR column are tight). */}
        <span className="flex min-w-0 items-center gap-2">
          <Muted className="truncate text-[12px] font-bold" title={`@${user.handle}`}>
            @{user.handle}
          </Muted>
          {user.isTest && (
            <Pill tone="gum-soft" shadow={false} height={20} className="shrink-0 px-[7px]! text-[10px]!">
              {test}
            </Pill>
          )}
        </span>
      </span>
    </span>
  );
}

function RemoveButton({ attendee, full, busy, remove }: { attendee: AdminAttendeeT } & Pick<RowsProps, "full" | "busy" | "remove">) {
  return (
    <Button height={44} className="w-auto! px-4 text-[14px] shadow-hard-2!" disabled={busy} aria-label={full.ui.detail.removeFor(attendee.user.name)} onClick={() => remove(attendee)}>
      {full.attendees.remove}
    </Button>
  );
}

function AttendeeRow({ attendee, full, locale, now, timeZone, busy, remove }: RowsProps & { attendee: AdminAttendeeT }) {
  const { user, checkedInAt, points, connections, addedByAdmin } = attendee;
  const t = full.ui.detail;
  return (
    <Row>
      <Cell className={`${TIGHT} max-w-[220px]`}>
        <Person user={user} test={full.events.test} />
      </Cell>
      <Cell className={`${TIGHT} whitespace-nowrap`}>
        <time dateTime={checkedInAt} title={exactTime(locale, checkedInAt, timeZone)} className="block">
          {relative(locale, checkedInAt, new Date(now))}
        </time>
        <Muted className="block text-[12px] font-bold">
          {t.source}: {addedByAdmin ? t.sources.admin : t.sources.self}
        </Muted>
      </Cell>
      <Cell className={`${TIGHT} text-right tabular-nums`}>{formatCount(locale, points)}</Cell>
      <Cell className={`${TIGHT} text-right tabular-nums`}>{formatCount(locale, connections)}</Cell>
      <Cell className={`${WIDE} ${TIGHT} max-w-[220px] truncate`}>
        <span title={user.email ?? undefined}>{user.email ?? "—"}</span>
      </Cell>
      <Cell className={`${WIDE} ${TIGHT} max-w-[180px] truncate`}>{user.company ?? "—"}</Cell>
      <Cell className={`${TIGHT} text-right`}>
        <RemoveButton attendee={attendee} full={full} busy={busy} remove={remove} />
      </Cell>
    </Row>
  );
}

function AttendeeCard({ attendee, full, locale, now, busy, remove }: RowsProps & { attendee: AdminAttendeeT }) {
  const { user, checkedInAt, points, connections, addedByAdmin } = attendee;
  const t = full.ui.detail;
  const facts = [relative(locale, checkedInAt, new Date(now)), `${formatCount(locale, points)} ${t.points.toLowerCase()}`, `${formatCount(locale, connections)} ${full.detail.connections.toLowerCase()}`, addedByAdmin ? t.sources.admin : t.sources.self];
  return (
    <li>
      <Card size="sm" className="flex flex-col gap-3 px-4 py-3">
        <Person user={user} test={full.events.test} />
        <Muted className="text-[13px] font-bold">{facts.join(" · ")}</Muted>
        <span className="flex justify-end">
          <RemoveButton attendee={attendee} full={full} busy={busy} remove={remove} />
        </span>
      </Card>
    </li>
  );
}
