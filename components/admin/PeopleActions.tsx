"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { TestSession, type AdminUserT } from "@/lib/api/admin-schemas";
import { apiCall } from "@/lib/api/client";
import { copyFor, type Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { Notice } from "./Notice";
import { RowMenu, RowMenuItem, RowMenuSeparator } from "./RowMenu";
import { useAdminAction } from "./useAdminAction";

type Person = Pick<AdminUserT, "id" | "name" | "handle" | "email" | "isTest">;
type Actions = { copy: Dictionary["admin"]; busy: boolean; copyText: (text: string) => void; signInAs: (person: Person) => void };

const PeopleContext = createContext<Actions | null>(null);

type ProviderProps = { locale: Locale; adminHandle: string; children: ReactNode };

// One action hook for the whole people list, so 25 row menus share one confirm dialog and one notice region.
export function PeopleActionsProvider({ locale, adminHandle, children }: ProviderProps) {
  const copy = copyFor(locale).admin;
  const router = useRouter();
  const { busy, error, notice, run, dialog, setNotice, setError } = useAdminAction(copy.tests.failed);

  // Clipboard needs a secure context and permission (edge case 35); say so instead of failing silently.
  async function copyText(text: string) {
    setNotice(null);
    setError(null);
    try {
      await navigator.clipboard.writeText(text);
      setNotice(copy.people.copied);
    } catch {
      setError(copy.people.copyFailed);
    }
  }

  async function signInAs(person: Person) {
    const { title, confirm } = copy.ui.dialogs.signIn;
    const ok = await run(() => apiCall("POST", `/api/admin/test-users/${person.id}/session`, TestSession), {
      confirm: { title: title(person.name), body: copy.tests.signInWarning(adminHandle), confirmLabel: confirm, cancelLabel: copy.ui.cancel },
    });
    if (ok) router.push("/home");
  }

  return (
    <PeopleContext value={{ copy, busy, copyText, signInAs }}>
      <Notice tone="error" className="contents">{error}</Notice>
      <Notice tone="success" className="contents">{notice}</Notice>
      {children}
      {dialog}
    </PeopleContext>
  );
}

// The ⋯ menu of one person (spec §5.4). `id` must differ between the table row and the phone card of the same person.
export function PersonMenu({ id, person }: { id: string; person: Person }) {
  const actions = useContext(PeopleContext);
  if (!actions) throw new Error("PersonMenu must sit inside PeopleActionsProvider");
  const { copy, busy, copyText, signInAs } = actions;
  return (
    <RowMenu id={id} label={copy.ui.menu.moreFor(person.name)}>
      {person.email && (
        <RowMenuItem menuId={id} icon="link" onClick={() => copyText(person.email ?? "")}>
          {copy.people.copyEmail}
        </RowMenuItem>
      )}
      <RowMenuItem menuId={id} icon="link" onClick={() => copyText(person.handle)}>
        {copy.people.copyHandle}
      </RowMenuItem>
      <RowMenuItem href={`/u/${person.handle}`} icon="user" external>
        {copy.people.openCard}
      </RowMenuItem>
      {person.isTest && (
        <>
          <RowMenuSeparator />
          <RowMenuItem menuId={id} icon="flask" disabled={busy} onClick={() => signInAs(person)}>
            {copy.tests.signIn}
          </RowMenuItem>
        </>
      )}
    </RowMenu>
  );
}
