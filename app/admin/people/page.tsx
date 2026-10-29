import Link from "next/link";
import { AdminShell, AdminTitle } from "@/components/admin/AdminShell";
import { TestPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Pill } from "@/components/ui/Pill";
import { Muted } from "@/components/ui/Text";
import { AdminUserList, UserSearchQuery } from "@/lib/api/admin-schemas";
import { apiGet } from "@/lib/api/server-fetch";
import { adminCopy } from "@/lib/server/admin-page";

type Props = { searchParams: Promise<{ q?: string; test?: string }> };

const FILTERS = ["include", "exclude", "only"] as const;

// /admin/people: search everyone by name, handle, email or company. A plain GET form, so it works without JavaScript.
export default async function AdminPeoplePage({ searchParams }: Props) {
  const query = UserSearchQuery.parse(await searchParams);
  const params = new URLSearchParams({ test: query.test, limit: "50", ...(query.q ? { q: query.q } : {}) });
  const [{ copy }, list] = await Promise.all([adminCopy(), apiGet(`/api/admin/users?${params}`, AdminUserList)]);
  return (
    <AdminShell copy={copy} active="people">
      <AdminTitle>{copy.people.title}</AdminTitle>
      <form method="get" className="flex flex-col gap-3 md:flex-row md:items-end">
        <Field id="people-q" name="q" label={copy.people.searchLabel} defaultValue={query.q ?? ""} className="md:flex-1" />
        <input type="hidden" name="test" value={query.test} />
        <Button type="submit" variant="primary" height={44} className="md:w-auto md:px-8">
          {copy.people.search}
        </Button>
      </form>
      <nav className="flex flex-wrap gap-2" aria-label={copy.people.title}>
        {FILTERS.map((filter) => (
          <Link
            key={filter}
            href={`/admin/people?${new URLSearchParams({ test: filter, ...(query.q ? { q: query.q } : {}) })}`}
            aria-current={filter === query.test ? "page" : undefined}
            className={`box-border flex h-11 items-center rounded-chip px-4 text-[14px] font-extrabold border-ink ${filter === query.test ? "bg-sun" : "bg-white"}`}
          >
            {copy.people.filter[filter]}
          </Link>
        ))}
      </nav>
      {list.users.length === 0 && <Muted className="font-bold">{copy.people.empty}</Muted>}
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
        {list.users.map((user) => (
          <li key={user.id}>
            <Card size="sm" className="flex h-full flex-col gap-1 px-4 py-3">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-display text-[17px] font-bold">{user.name}</span>
                {user.role === "super_admin" && <Pill tone="sun" shadow={false}>{copy.people.superAdmin}</Pill>}
                {user.isTest && <TestPill label={copy.events.test} />}
              </span>
              <Muted className="text-[13px] font-bold break-all">
                @{user.handle}
                {user.email ? ` · ${user.email}` : ""}
              </Muted>
              <Muted className="text-[13px] font-bold">{[user.headline, user.company, user.city].filter(Boolean).join(" · ")}</Muted>
            </Card>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
