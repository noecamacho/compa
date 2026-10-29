import { AdminShell } from "@/components/admin/AdminShell";
import { TestUsersPanel } from "@/components/admin/TestUsersPanel";
import { Muted } from "@/components/ui/Text";
import { parsePageParams, type RawSearchParams } from "@/lib/admin/page-params";
import { AdminEventList, TestUserList, TestUserQuery } from "@/lib/api/admin-schemas";
import { apiGet, apiGetSafe } from "@/lib/api/server-fetch";
import { adminCopy, requireAdminPage } from "@/lib/server/admin-page";

type Props = { searchParams: Promise<RawSearchParams> };

// Only the prefix comes from the URL; an invalid one (`?handlePrefix=ABC`) is ignored, never the error page.
const PageParams = TestUserQuery.pick({ handlePrefix: true });

// /admin/test-users: the real-mode test harness by hand (docs/testing/real-mode.md, spec §5.5).
export default async function AdminTestUsersPage({ searchParams }: Props) {
  const { handlePrefix } = parsePageParams(PageParams, await searchParams);
  const listQuery = handlePrefix ? `?${new URLSearchParams({ handlePrefix })}` : "";
  const [admin, { locale, copy }, list, events] = await Promise.all([
    requireAdminPage(),
    adminCopy(),
    apiGet(`/api/admin/test-users${listQuery}`, TestUserList),
    // Only the check-in select needs these; if they fail the generator still works without a check-in.
    apiGetSafe("/api/admin/events?test=only&pageSize=200", AdminEventList),
  ]);
  // Mock mode ignores `test=only`; the filter keeps the select honest there too.
  const testEvents = (events?.events ?? []).filter((event) => event.isTest).map(({ slug, name }) => ({ slug, name }));
  return (
    <AdminShell copy={copy} locale={locale} admin={admin} active="testUsers" title={copy.tests.title}>
      <Muted className="-mt-2 max-w-[640px] font-bold md:-mt-4">{copy.tests.intro}</Muted>
      <TestUsersPanel locale={locale} users={list.users} testEvents={testEvents} me={{ id: admin.id, handle: admin.handle }} now={new Date().toISOString()} handlePrefix={handlePrefix} />
    </AdminShell>
  );
}
