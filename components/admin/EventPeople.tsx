"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Muted } from "@/components/ui/Text";
import { OrganizerBody, type OrganizerT } from "@/lib/api/admin-schemas";
import { apiCall } from "@/lib/api/client";
import { NoBody } from "@/lib/api/route-spec";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { ORGANIZER_ROLES, type OrganizerRole } from "@/lib/roles";
import { EmptyState } from "./AdminParts";
import { AdminField } from "./AdminField";
import { writeErrors } from "./EventActions";
import { Notice } from "./Notice";
import { PickDialog } from "./PickDialog";
import { TestPill } from "./StatusPill";
import { UserPicker } from "./UserPicker";
import { useAdminAction } from "./useAdminAction";

type Props = { locale: Locale; slug: string; organizers: OrganizerT[] };

const SELECT = "box-border h-11 min-w-0 cursor-pointer rounded-[12px] bg-white px-3 font-body text-[16px] font-bold text-ink border-ink md:text-[14px]";

// Organizers tab (spec §5.3): role per person as a select (owner / organizer / staff), Remove, and "+ Assign" in a
// dialog. Role changes and removals are reversible, so no confirm, just a notice (spec §6.6).
export function EventOrganizers({ locale, slug, organizers }: Props) {
  const copy = copyFor(locale).admin;
  const t = copy.ui.detail;
  const { busy, error, notice, run, dialog } = useAdminAction(copy.detail.failed);
  const [picking, setPicking] = useState(false);
  const [role, setRole] = useState<OrganizerRole>("organizer");
  const base = `/api/admin/events/${slug}`;
  const errors = writeErrors(copy.ui, { test_user_not_allowed: t.testNotAllowed });
  // POST is an upsert: assigning someone again only changes their role.
  const setOrganizer = (userId: string, nextRole: OrganizerRole, done: string) => run(() => apiCall("POST", `${base}/organizers`, OrganizerBody, { userId, role: nextRole }), { done, errors });
  const drop = (userId: string) => run(() => apiCall("DELETE", `${base}/organizers/${userId}`, NoBody), { done: copy.ui.done.organizerRemoved, errors });

  async function assign(userId: string) {
    const ok = await setOrganizer(userId, role, copy.ui.done.organizerAdded);
    if (ok) setPicking(false);
    return ok;
  }

  const assignButton = (
    <Button height={44} variant="primary" className="w-auto! px-4 text-[15px] shadow-hard-2!" disabled={busy} onClick={() => setPicking(true)}>
      <Icon name="plus" size={18} />
      {copy.organizers.add}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {organizers.length === 0 ? (
        <EmptyState title={t.emptyOrganizers} body={t.emptyOrganizersBody} action={assignButton} />
      ) : (
        <>
          <div className="flex justify-end">{assignButton}</div>
          <Card className="px-4 py-2 md:px-5">
            <ul className="m-0 flex list-none flex-col p-0">
              {organizers.map(({ user, role: current }) => (
                <li key={user.id} className="dashed-ink flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:border-t-0">
                  <span className="min-w-0 flex-1 basis-[180px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[15px] font-extrabold" title={user.name}>
                        {user.name}
                      </span>
                      {user.isTest && <TestPill label={copy.events.test} />}
                    </span>
                    <Muted className="block truncate text-[12px] font-bold">@{user.handle}</Muted>
                  </span>
                  <select
                    aria-label={t.roleFor(user.name)}
                    className={SELECT}
                    value={current}
                    disabled={busy}
                    onChange={(event) => setOrganizer(user.id, event.target.value as OrganizerRole, t.roleChanged)}
                  >
                    {ORGANIZER_ROLES.map((option) => (
                      <option key={option} value={option}>
                        {copy.organizers.roles[option]}
                      </option>
                    ))}
                  </select>
                  <Button height={44} className="w-auto! px-4 text-[14px] shadow-hard-2!" disabled={busy} aria-label={`${copy.organizers.remove}: ${user.name}`} onClick={() => drop(user.id)}>
                    {copy.organizers.remove}
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
      <Notice tone="error">{picking ? null : error}</Notice>
      <Notice tone="success">{notice}</Notice>
      <PickDialog open={picking} onClose={() => setPicking(false)} title={t.assignTitle} closeLabel={t.close}>
        <AdminField id="organizer-role" label={copy.organizers.role}>
          {(aria, className) => (
            <select id="organizer-role" className={`${className} h-11`} value={role} onChange={(event) => setRole(event.target.value as OrganizerRole)} {...aria}>
              {ORGANIZER_ROLES.map((option) => (
                <option key={option} value={option}>
                  {copy.organizers.roles[option]}
                </option>
              ))}
            </select>
          )}
        </AdminField>
        <UserPicker locale={locale} id="organizer-search" actionLabel={copy.organizers.add} onPick={(user) => assign(user.id)} />
        <Notice tone="error">{error}</Notice>
      </PickDialog>
      {dialog}
    </div>
  );
}
