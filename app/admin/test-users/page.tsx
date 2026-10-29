import { AdminShell } from "@/components/admin/AdminShell";
import { TestUsersPanel } from "@/components/admin/TestUsersPanel";
import { Muted } from "@/components/ui/Text";
import { AdminEventList, TestUserList } from "@/lib/api/admin-schemas";
import { apiGet } from "@/lib/api/server-fetch";
import { adminCopy, requireAdminPage } from "@/lib/server/admin-page";

// /admin/test-users: the real-mode test harness by hand (docs/testing/real-mode.md).
export default async function AdminTestUsersPage() {
  const [admin, { locale, copy }, list, events] = await Promise.all([requireAdminPage(), adminCopy(), apiGet("/api/admin/test-users", TestUserList), apiGet("/api/admin/events", AdminEventList)]);
  const testEvents = events.events.filter((event) => event.isTest).map(({ slug, name }) => ({ slug, name }));
  return (
    <AdminShell copy={copy} locale={locale} admin={admin} active="testUsers" title={copy.tests.title}>
      <Muted className="max-w-[640px] font-bold">{copy.tests.intro}</Muted>
      <TestUsersPanel locale={locale} users={list.users} testEvents={testEvents} />
    </AdminShell>
  );
}
