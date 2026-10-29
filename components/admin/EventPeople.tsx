"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { AddedAttendee, OrganizerBody, type AdminAttendeeT, type OrganizerT } from "@/lib/api/admin-schemas";
import { apiCall } from "@/lib/api/client";
import { NoBody } from "@/lib/api/route-spec";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { Notice } from "./Notice";
import { UserPicker } from "./UserPicker";
import { useAdminAction } from "./useAdminAction";

type Props = { locale: Locale; slug: string; attendees: AdminAttendeeT[]; organizers: OrganizerT[]; testUsers: number };

// Attendees and organizers of one event; every write refreshes the server-rendered lists.
export function EventPeople({ locale, slug, attendees, organizers, testUsers }: Props) {
  const copy = copyFor(locale).admin;
  const { busy, error, notice, run, dialog } = useAdminAction(copy.detail.failed);
  const base = `/api/admin/events/${slug}`;
  const checkIn = (userId: string) => run(() => apiCall("POST", `${base}/attendees`, AddedAttendee, { userId }), { done: copy.ui.done.checkedIn });
  const assign = (userId: string) => run(() => apiCall("POST", `${base}/organizers`, OrganizerBody, { userId, role: "organizer" }), { done: copy.ui.done.organizerAdded });
  const dropAttendee = (user: AdminAttendeeT["user"]) =>
    run(() => apiCall("DELETE", `${base}/attendees/${user.id}`, NoBody), {
      confirm: { title: copy.ui.dialogs.removeAttendee.title(user.name), body: copy.attendees.removeConfirm, confirmLabel: copy.ui.dialogs.removeAttendee.confirm, cancelLabel: copy.ui.cancel, danger: true },
      done: copy.ui.dialogs.removeAttendee.done,
    });
  // Cheap and reversible (assign again): no blocking dialog, just a confirmation line.
  const dropOrganizer = (userId: string) => run(() => apiCall("DELETE", `${base}/organizers/${userId}`, NoBody), { done: copy.ui.done.organizerRemoved });

  return (
    <div className="grid grid-cols-1 gap-5 ">
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
            <li key={user.id} className="dashed-ink flex items-center gap-2 py-2 first:border-t-0">
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
              <Button height={44} className="w-auto! px-3 text-[14px]" disabled={busy} aria-label={`${copy.attendees.remove}: ${user.name}`} onClick={() => dropAttendee(user)}>
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
            <li key={user.id} className="dashed-ink flex items-center gap-2 py-2 first:border-t-0">
              <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold">
                {user.name} <Muted className="text-[12px] font-bold">{copy.organizers.roles[role]}</Muted>
              </span>
              <Button height={44} className="w-auto! px-3 text-[14px]" disabled={busy} aria-label={`${copy.organizers.remove}: ${user.name}`} onClick={() => dropOrganizer(user.id)}>
                {copy.organizers.remove}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      <Notice tone="error" className="">
        {error}
      </Notice>
      <Notice tone="success" className="">
        {notice}
      </Notice>
      {dialog}
    </div>
  );
}
