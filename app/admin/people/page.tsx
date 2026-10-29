import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { CardList, Cell, DataTable, EmptyState, FilterTabs, Row } from "@/components/admin/AdminParts";
import { TestPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Muted } from "@/components/ui/Text";
import { AdminUserList, UserSearchQuery, type AdminUserT } from "@/lib/api/admin-schemas";
import { apiGet } from "@/lib/api/server-fetch";
import { adminCopy, requireAdminPage } from "@/lib/server/admin-page";
import type { Dictionary } from "@/lib/copy";

type Props = { searchParams: Promise<{ q?: string; test?: string }> };

const FILTERS = ["include", "exclude", "only"] as const;

const profileOf = (user: AdminUserT) => [user.headline, user.company, user.city].filter(Boolean).join(" · ");

function UserBadges({ user, copy }: { user: AdminUserT; copy: Dictionary["admin"] }) {
  return (
    <>
      {user.role === "super_admin" && (
        <Pill tone="sun" shadow={false}>
          {copy.people.superAdmin}
        </Pill>
      )}
      {user.isTest && <TestPill label={copy.events.test} />}
    </>
  );
}

// /admin/people: search everyone by name, handle, email or company. A plain GET form, so it works without JavaScript.
export default async function AdminPeoplePage({ searchParams }: Props) {
  const query = UserSearchQuery.parse(await searchParams);
  const params = new URLSearchParams({ test: query.test, limit: "50", ...(query.q ? { q: query.q } : {}) });
  const [admin, { locale, copy }, list] = await Promise.all([requireAdminPage(), adminCopy(), apiGet(`/api/admin/users?${params}`, AdminUserList)]);
  return (
    <AdminShell copy={copy} locale={locale} admin={admin} active="people" title={copy.people.title}>
      <form method="get" role="search" className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex min-w-0 flex-col gap-[5px] md:flex-1">
          <label htmlFor="people-q" className="text-[13px] font-extrabold md:text-[12px]">
            {copy.people.searchLabel}
          </label>
          <input
            id="people-q"
            name="q"
            type="search"
            defaultValue={query.q ?? ""}
            enterKeyHint="search"
            className="box-border block h-11 w-full rounded-[12px] bg-white px-3 font-body text-[16px] font-bold text-ink outline-none border-ink transition-shadow duration-200 focus:shadow-[0_0_0_4px_#6BE4A3] md:text-[14px]"
          />
        </div>
        <input type="hidden" name="test" value={query.test} />
        <Button type="submit" variant="primary" height={44} className="md:w-auto! md:px-8">
          {copy.people.search}
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          label={copy.people.title}
          active={query.test}
          options={FILTERS.map((filter) => ({ key: filter, label: copy.people.filter[filter], href: `/admin/people?${new URLSearchParams({ test: filter, ...(query.q ? { q: query.q } : {}) })}` }))}
        />
        <p role="status" className="m-0 text-[13px] font-extrabold text-muted">
          {copy.ui.resultCount(list.users.length)}
        </p>
      </div>
      {list.users.length === 0 && (
        <EmptyState
          title={copy.people.empty}
          action={
            query.q || query.test !== "include" ? (
              <Link href="/admin/people" className="inline-flex min-h-11 items-center text-[14px] font-extrabold underline">
                {copy.people.filter.include}
              </Link>
            ) : undefined
          }
        />
      )}
      {list.users.length > 0 && (
        <>
          <DataTable label={copy.people.title} columns={[
              { key: "person", label: copy.ui.colPerson },
              { key: "contact", label: copy.ui.colContact },
              { key: "profile", label: copy.ui.colProfile },
            ]}>
            {list.users.map((user) => (
              <Row key={user.id}>
                <Cell>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[16px] font-bold">{user.name}</span>
                    <UserBadges user={user} copy={copy} />
                  </span>
                </Cell>
                <Cell className="max-w-[320px] text-muted">
                  <span className="block truncate" title={`@${user.handle}`}>
                    @{user.handle}
                  </span>
                  {user.email && (
                    <span className="block truncate" title={user.email}>
                      {user.email}
                    </span>
                  )}
                </Cell>
                <Cell className="text-muted">{profileOf(user)}</Cell>
              </Row>
            ))}
          </DataTable>
          <CardList>
            {list.users.map((user) => (
              <li key={user.id}>
                <Card size="sm" className="flex flex-col gap-1 px-4 py-3">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[17px] font-bold">{user.name}</span>
                    <UserBadges user={user} copy={copy} />
                  </span>
                  <Muted className="truncate text-[13px] font-bold" title={`@${user.handle}`}>
                    @{user.handle}
                  </Muted>
                  {user.email && (
                    <Muted className="truncate text-[13px] font-bold" title={user.email}>
                      {user.email}
                    </Muted>
                  )}
                  <Muted className="text-[13px] font-bold">{profileOf(user)}</Muted>
                </Card>
              </li>
            ))}
          </CardList>
        </>
      )}
    </AdminShell>
  );
}
