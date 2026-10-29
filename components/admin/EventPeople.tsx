"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { AddedAttendee, OrganizerBody, type AdminAttendeeT, type OrganizerT } from "@/lib/api/admin-schemas";
import { apiCall } from "@/lib/api/client";
import { NoBody } from "@/lib/api/route-spec";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { UserPicker } from "./UserPicker";
import { useAdminAction } from "./useAdminAction";

type Props = { locale: Locale; slug: string; attendees: AdminAttendeeT[]; organizers: OrganizerT[]; testUsers: number };

// Attendees and organizers of one event; every write refreshes the server-rendered lists.
export function EventPeople({ locale, slug, attendees, organizers, testUsers }: Props) {
  const copy = copyFor(locale).admin;
  const { busy, error, run } = useAdminAction(copy.detail.failed);
  const base = `/api/admin/events/${slug}`;
  const checkIn = (userId: string) => run(() => apiCall("POST", `${base}/attendees`, AddedAttendee, { userId }));
  const assign = (userId: string) => run(() => apiCall("POST", `${base}/organizers`, OrganizerBody, { userId, role: "organizer" }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
      <Card className="flex flex-col gap-3 px-4 py-4">
        <span className="flex items-baseline justify-between gap-2">
          <SectionLabel>
            {copy.attendees.title} · {attendees.length}
          </SectionLabel>
          {testUsers > 0 && <Muted className="text-[12px] font-extrabold">{copy.attendees.testCount(testUsers)}</Muted>}
        </span>
        <UserPicker locale={locale} id="attendee-search" actionLabel={copy.attendees.add} hint={copy.attendees.addHint} onPick={(user) => checkIn(user.id)} />
        {attendees.length === 0 && <Muted className="text-[13px] font-bold">{copy.attendees.empty}</Muted>}
        <ul className="m-0 flex list-none flex-col p-0">
          {attendees.map(({ user, points, connections, addedByAdmin }) => (
            <li key={user.id} className="dashed-ink flex flex-wrap items-center gap-2 py-2 first:bg-none">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-extrabold">
                  {user.name}
                  {user.isTest && <span className="ml-2 text-[11px] text-gum">{copy.events.test}</span>}
                </span>
                <Muted className="text-[12px] font-bold">
                  @{user.handle} · {copy.attendees.points(points, connections)}
                  {addedByAdmin ? ` · ${copy.attendees.byAdmin}` : ""}
                </Muted>
              </span>
              <Button height={36} className="w-auto px-3 text-[14px]" disabled={busy} onClick={() => run(() => apiCall("DELETE", `${base}/attendees/${user.id}`, NoBody), copy.attendees.removeConfirm)}>
                {copy.attendees.remove}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="flex flex-col gap-3 px-4 py-4">
        <SectionLabel>{copy.organizers.title}</SectionLabel>
        <UserPicker locale={locale} id="organizer-search" actionLabel={copy.organizers.add} onPick={(user) => assign(user.id)} />
        {organizers.length === 0 && <Muted className="text-[13px] font-bold">{copy.organizers.empty}</Muted>}
        <ul className="m-0 flex list-none flex-col p-0">
          {organizers.map(({ user, role }) => (
            <li key={user.id} className="dashed-ink flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold">
                {user.name} <Muted className="text-[12px] font-bold">{copy.organizers.roles[role]}</Muted>
              </span>
              <Button height={36} className="w-auto px-3 text-[14px]" disabled={busy} onClick={() => run(() => apiCall("DELETE", `${base}/organizers/${user.id}`, NoBody))}>
                {copy.organizers.remove}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      {error && (
        <p role="alert" className="m-0 text-[13px] font-extrabold text-coral lg:col-span-2">
          {error}
        </p>
      )}
    </div>
  );
}
