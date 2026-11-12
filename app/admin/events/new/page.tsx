import { AdminShell } from "@/components/admin/AdminShell";
import { EventForm } from "@/components/admin/EventForm";
import { adminCopy, requireAdminPage } from "@/lib/server/admin-page";
import { pageTitle } from "@/lib/server/locale";

export const generateMetadata = pageTitle("adminNewEvent");

export default async function NewEventPage() {
  const [admin, { locale, copy }] = await Promise.all([requireAdminPage(), adminCopy()]);
  return (
    <AdminShell copy={copy} locale={locale} admin={admin} active="events" title={copy.form.createTitle} width="form">
      <EventForm locale={locale} />
    </AdminShell>
  );
}
