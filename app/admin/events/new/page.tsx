import { AdminShell, AdminTitle } from "@/components/admin/AdminShell";
import { EventForm } from "@/components/admin/EventForm";
import { adminCopy } from "@/lib/server/admin-page";

export default async function NewEventPage() {
  const { locale, copy } = await adminCopy();
  return (
    <AdminShell copy={copy} active="events">
      <AdminTitle>{copy.form.createTitle}</AdminTitle>
      <EventForm locale={locale} />
    </AdminShell>
  );
}
