"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import { AdminUserList, type AdminUserT } from "@/lib/api/admin-schemas";
import { apiCall } from "@/lib/api/client";
import { copyFor } from "@/lib/copy";
import { AdminInput } from "./AdminField";
import type { Locale } from "@/lib/i18n";

type Props = { locale: Locale; id: string; actionLabel: string; hint?: string; onPick: (user: AdminUserT) => Promise<boolean> };

// Search people (GET /api/admin/users) and act on one: check in, or assign as organizer.
export function UserPicker({ locale, id, actionLabel, hint, onPick }: Props) {
  const copy = copyFor(locale).admin;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserT[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function search(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFailed(false);
    const found = await apiCall("GET", `/api/admin/users?q=${encodeURIComponent(query)}&limit=10`, AdminUserList).catch(() => null);
    setFailed(found === null);
    setResults(found?.users ?? null);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={search} role="search" className="grid grid-cols-[1fr_auto] items-end gap-2">
        <AdminInput id={id} label={copy.people.searchLabel} type="search" enterKeyHint="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button type="submit" height={44} className="w-auto!" disabled={busy}>
          {copy.people.search}
        </Button>
      </form>
      {hint && <Muted className="text-[12px] font-bold">{hint}</Muted>}
      <p role="status" className="m-0 text-[13px] font-bold text-muted">
        {failed ? copy.detail.failed : results?.length === 0 ? copy.people.empty : ""}
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {results?.map((user) => (
          <li key={user.id} className="flex items-center justify-between gap-2 rounded-[12px] bg-paper px-3 py-2 border-ink">
            <span className="min-w-0 truncate text-[14px] font-extrabold">
              {user.name} <Muted className="font-bold">@{user.handle}</Muted>
              {user.isTest && <span className="ml-2 text-[11px] font-extrabold text-gum">{copy.events.test}</span>}
            </span>
            <Button
              height={44}
              variant="primary"
              className="w-auto! px-3 text-[14px]"
              onClick={async () => {
                if (await onPick(user)) setResults(null);
              }}
            >
              {actionLabel}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
