import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { AdminShell, AdminTitle } from "@/components/admin/AdminShell";
import { EventActions } from "@/components/admin/EventActions";
import { EventForm } from "@/components/admin/EventForm";
import { EventPeople } from "@/components/admin/EventPeople";
import { StatusPill, TestPill } from "@/components/admin/StatusPill";
import { Card } from "@/components/ui/Card";
import { SectionLabel, Stat, StatGrid } from "@/components/ui/Text";
import { AdminAttendeeList, AdminEventBody, OrganizerList } from "@/lib/api/admin-schemas";
import { apiGet, apiGetOrNull } from "@/lib/api/server-fetch";
import { adminCopy } from "@/lib/server/admin-page";

type Props = { params: Promise<{ slug: string }> };

// /admin/events/<slug>: QR and join link, lifecycle actions, details form, attendees and organizers (backlog T-023).
export default async function AdminEventPage({ params }: Props) {
  const { slug } = await params;
  const path = `/api/admin/events/${encodeURIComponent(slug)}`;
  const found = await apiGetOrNull(path, AdminEventBody);
  if (!found) notFound();
  const { event } = found;
  const [{ locale, copy }, people, organizers, qrSvg] = await Promise.all([
    adminCopy(),
    apiGet(`${path}/attendees`, AdminAttendeeList),
    apiGet(`${path}/organizers`, OrganizerList),
    QRCode.toString(event.joinUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1E1B2E", light: "#FFFFFF" } }),
  ]);
  const ended = event.status === "ended" || event.status === "archived";
  return (
    <AdminShell copy={copy} active="events">
      <AdminTitle
        right={
          <span className="flex gap-2">
            <StatusPill status={event.status} copy={copy} />
            {event.isTest && <TestPill label={copy.events.test} />}
          </span>
        }
      >
        {event.name}
      </AdminTitle>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
        <Card className="flex flex-col items-center gap-3 px-4 py-4">
          <div role="img" aria-label={copy.detail.qrLabel(event.name)} className="w-full max-w-[220px] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <SectionLabel>{copy.detail.joinUrl}</SectionLabel>
          <code className="text-center text-[13px] font-extrabold break-all">{event.joinUrl}</code>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <StatGrid>
              <Stat value={event.counts.attendees} label={copy.detail.attendees} />
              <Stat value={event.counts.connections} label={copy.detail.connections} />
              <Stat value={event.counts.pending} label={copy.detail.pending} />
            </StatGrid>
          </Card>
          <EventActions locale={locale} slug={event.slug} joinUrl={event.joinUrl} liveUrl={`${event.joinUrl}/live`} ended={ended} archived={event.status === "archived"} />
        </div>
      </div>
      <EventPeople locale={locale} slug={event.slug} attendees={people.attendees} organizers={organizers.organizers} testUsers={people.counts.testUsers} />
      <EventForm key={`${event.startsAt}-${event.endsAt}-${event.status}`} locale={locale} event={event} />
    </AdminShell>
  );
}
