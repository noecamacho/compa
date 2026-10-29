import Link from "next/link";
import { z } from "zod";
import { AdminShell } from "@/components/admin/AdminShell";
import { CardList, Cell, DataTable, EmptyState, FilterTabs, Row, type Column } from "@/components/admin/AdminParts";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { PeopleActionsProvider, PersonMenu } from "@/components/admin/PeopleActions";
import { PersonAvatar } from "@/components/admin/PersonAvatar";
import { TestPill } from "@/components/admin/StatusPill";
import { ToolbarSelect } from "@/components/admin/ToolbarSelect";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { relative } from "@/lib/admin/format";
import { parsePageParams, type RawSearchParams } from "@/lib/admin/page-params";
import { sortDirection } from "@/lib/admin/sort";
import { hrefWith, type UrlParams } from "@/lib/admin/url";
import { AdminUserList, UserSearchQuery, type AdminUserT } from "@/lib/api/admin-schemas";
import { apiGet } from "@/lib/api/server-fetch";
import type { Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { adminCopy, requireAdminPage } from "@/lib/server/admin-page";

type Props = { searchParams: Promise<RawSearchParams> };
type Copy = Dictionary["admin"];

const PATH = "/admin/people";
const TESTS = ["include", "exclude", "only"] as const;
const ROLES = ["any", "super_admin"] as const;
const PAGE_SIZES = [25, 50, 100] as const;
const DEFAULTS: UrlParams = { test: "include", role: "any", sort: "name", limit: "25" };

// The console offers "any" and "super admins"; any other role in the URL falls back to "any" rather than hide a filter.
const PeopleParams = UserSearchQuery.extend({ role: z.enum(ROLES).default("any") });

const profileOf = (user: AdminUserT) => [user.headline, user.company].filter(Boolean).join(" · ");

function PersonBadges({ user, copy }: { user: AdminUserT; copy: Copy }) {
  return (
    <>
      {user.role === "super_admin" && (
        <Pill tone="sun" shadow={false} height={24} className="text-[11px]!">
          {copy.people.superAdmin}
        </Pill>
      )}
      {user.isTest && <TestPill label={copy.events.test} />}
    </>
  );
}

// Avatar, name with its pills, and @handle; long names clamp to two lines and long handles truncate, both with a title.
function PersonCell({ user, copy }: { user: AdminUserT; copy: Copy }) {
  return (
    <span className="flex items-center gap-3">
      <PersonAvatar name={user.name} isTest={user.isTest} />
      <span className="flex min-w-0 flex-col">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span title={user.name} className="line-clamp-2 font-display text-[16px] leading-[1.2] font-bold">
            {user.name}
          </span>
          <PersonBadges user={user} copy={copy} />
        </span>
        <span title={`@${user.handle}`} className="block max-w-[10rem] truncate text-[13px] text-muted max-md:max-w-full">
          @{user.handle}
        </span>
      </span>
    </span>
  );
}

// /admin/people (spec §5.4): search, test and role filters, sort and pages, all in the URL. A table from 768 px, cards below.
export default async function AdminPeoplePage({ searchParams }: Props) {
  const query = parsePageParams(PeopleParams, await searchParams);
  const current: UrlParams = { q: query.q, test: query.test, role: query.role, sort: query.sort, dir: query.dir, page: String(query.page), limit: String(query.limit) };
  const apiParams = new URLSearchParams(Object.entries(current).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const [admin, { locale, copy }, list] = await Promise.all([requireAdminPage(), adminCopy(), apiGet(`/api/admin/users?${apiParams}`, AdminUserList)]);
  const now = new Date();
  const href = (patch: UrlParams) => hrefWith(PATH, current, patch, DEFAULTS);
  const filtered = Boolean(query.q) || query.test !== "include" || query.role !== "any";
  const from = (list.page - 1) * list.pageSize + 1;
  const result = list.users.length > 0 ? copy.ui.list.range(from, from + list.users.length - 1, list.total) : copy.ui.resultCount(list.total);
  const columns: Column[] = [
    { key: "person", label: copy.ui.colPerson, sortKey: "name" },
    { key: "email", label: copy.people.colEmail },
    { key: "profile", label: copy.people.colHeadline, className: "hidden lg:table-cell" },
    { key: "city", label: copy.people.colCity, className: "hidden xl:table-cell" },
    { key: "joined", label: copy.people.colJoined, sortKey: "createdAt", className: "hidden lg:table-cell" },
    { key: "menu", label: <span className="sr-only">{copy.ui.colActions}</span>, className: "w-16" },
  ];
  const sort = { key: query.sort, dir: sortDirection(query.sort, query.dir), hrefFor: (key: string, dir: string | undefined) => href({ sort: key, dir }) };

  return (
    <AdminShell copy={copy} locale={locale} admin={admin} active="people" title={copy.people.title}>
      <ListToolbar
        action={PATH}
        params={Object.fromEntries(Object.entries(current).filter(([key, value]) => value !== DEFAULTS[key]))}
        owned={["role", "sort", "dir"]}
        searchLabel={copy.people.searchLabel}
        submitLabel={copy.people.search}
        chips={<FilterTabs label={copy.people.title} active={query.test} options={TESTS.map((test) => ({ key: test, label: copy.people.filter[test], href: href({ test }) }))} />}
        selects={
          <>
            <ToolbarSelect name="role" label={copy.people.roleLabel} value={query.role} options={ROLES.map((role) => ({ value: role, label: copy.people.roles[role] }))} />
            <ToolbarSelect name="sort" label={copy.people.sortLabel} value={query.sort} options={(["name", "createdAt"] as const).map((key) => ({ value: key, label: copy.people.sorts[key] }))} />
          </>
        }
        result={result}
      />
      <PeopleActionsProvider locale={locale} adminHandle={admin.handle}>
        {list.total === 0 && <NoPeople copy={copy} filtered={filtered} query={query.q} clearHref={href({ q: undefined, test: undefined, role: undefined })} />}
        {list.users.length > 0 && (
          <>
            <DataTable label={copy.people.title} columns={columns} sort={sort}>
              {list.users.map((user) => (
                <PersonRow key={user.id} user={user} copy={copy} locale={locale} now={now} />
              ))}
            </DataTable>
            <CardList>
              {list.users.map((user) => (
                <PersonCard key={user.id} user={user} copy={copy} />
              ))}
            </CardList>
          </>
        )}
      </PeopleActionsProvider>
      <Pagination
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        hrefFor={(page) => href({ page: String(page) })}
        copy={copy.ui.list}
        pageSizes={list.total > PAGE_SIZES[0] ? { sizes: [...PAGE_SIZES], hrefFor: (size) => href({ limit: String(size) }) } : undefined}
      />
    </AdminShell>
  );
}

type RowProps = { user: AdminUserT; copy: Copy; locale: Locale; now: Date };

function PersonRow({ user, copy, locale, now }: RowProps) {
  return (
    <Row>
      <Cell>
        <PersonCell user={user} copy={copy} />
      </Cell>
      <Cell>
        <span title={user.email ?? undefined} className="block max-w-[12rem] truncate xl:max-w-[11rem] 2xl:max-w-[18rem]">
          {user.email ?? "—"}
        </span>
      </Cell>
      <Cell className="hidden lg:table-cell">
        <span title={profileOf(user)} className="line-clamp-2 max-w-[18rem]">
          {profileOf(user) || "—"}
        </span>
      </Cell>
      <Cell className="hidden xl:table-cell">
        <span title={user.city ?? undefined} className="block max-w-[7rem] truncate 2xl:max-w-[12rem]">
          {user.city ?? "—"}
        </span>
      </Cell>
      <Cell className="hidden text-muted lg:table-cell">
        <time dateTime={user.createdAt} title={new Date(user.createdAt).toLocaleString(locale === "es" ? "es-MX" : "en-US")}>
          {relative(locale, user.createdAt, now)}
        </time>
      </Cell>
      <Cell className="text-right">
        <PersonMenu id={`person-row-${user.id}`} person={user} />
      </Cell>
    </Row>
  );
}

function PersonCard({ user, copy }: { user: AdminUserT; copy: Copy }) {
  const profile = [user.headline, user.company, user.city].filter(Boolean).join(" · ");
  return (
    <li>
      <Card size="sm" className="flex flex-col gap-2 py-3 pr-2 pl-4">
        <span className="flex items-start gap-3">
          <span className="min-w-0 flex-1 pt-1">
            <PersonCell user={user} copy={copy} />
          </span>
          <PersonMenu id={`person-card-${user.id}`} person={user} />
        </span>
        {user.email && (
          <span title={user.email} className="block truncate pr-2 text-[14px] font-extrabold">
            {user.email}
          </span>
        )}
        {profile && <span className="pr-2 text-[13px] font-bold text-muted">{profile}</span>}
      </Card>
    </li>
  );
}

type NoPeopleProps = { copy: Copy; filtered: boolean; query: string | undefined; clearHref: string };

// Two different empties (spec §6.5): nobody at all, or nobody for these filters with a way back.
function NoPeople({ copy, filtered, query, clearHref }: NoPeopleProps) {
  if (!filtered) return <EmptyState title={copy.people.noPeople} body={copy.people.noPeopleBody} />;
  return (
    <EmptyState
      title={copy.ui.list.noMatch(query ?? "")}
      action={
        <Link href={clearHref} className="inline-flex min-h-11 items-center text-[14px] font-extrabold underline">
          {copy.ui.list.clearFilters}
        </Link>
      }
    />
  );
}
