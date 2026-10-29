"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { TestSession, TestUserList, type TestUserT } from "@/lib/api/admin-schemas";
import { apiCall } from "@/lib/api/client";
import { NoBody } from "@/lib/api/route-spec";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { TEST_PRESETS, type TestPreset } from "@/lib/testing/profiles";
import { useAdminAction } from "./useAdminAction";

type TestEvent = { slug: string; name: string };
type Props = { locale: Locale; users: TestUserT[]; testEvents: TestEvent[] };

const SELECT = "box-border block h-11 w-full rounded-[12px] bg-white px-3 font-body text-[14px] font-bold text-ink border-ink";

// Create, sign in as and delete test users (API spec A11). Signing in replaces this browser's admin session.
export function TestUsersPanel({ locale, users, testEvents }: Props) {
  const copy = copyFor(locale).admin.tests;
  const router = useRouter();
  const { busy, error, run } = useAdminAction(copy.failed);
  const [count, setCount] = useState(3);
  const [preset, setPreset] = useState<TestPreset>("random");
  const [checkInTo, setCheckInTo] = useState(testEvents[0]?.slug ?? "");

  async function create(event: FormEvent) {
    event.preventDefault();
    await run(() => apiCall("POST", "/api/admin/test-users", TestUserList, { count, preset, ...(checkInTo ? { checkInTo } : {}) }));
  }

  async function signInAs(user: TestUserT) {
    const ok = await run(() => apiCall("POST", `/api/admin/test-users/${user.id}/session`, TestSession), copy.signInConfirm);
    if (ok) router.push("/home");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="px-4 py-4">
        <form onSubmit={create} className="grid grid-cols-1 items-end gap-3 md:grid-cols-[120px_1fr_1fr_auto]">
          <label className="flex flex-col gap-[5px] text-[12px] font-extrabold">
            {copy.count}
            <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className={SELECT} />
          </label>
          <label className="flex flex-col gap-[5px] text-[12px] font-extrabold">
            {copy.preset}
            <select value={preset} onChange={(e) => setPreset(e.target.value as TestPreset)} className={SELECT}>
              {TEST_PRESETS.map((key) => (
                <option key={key} value={key}>
                  {copy.presets[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-[5px] text-[12px] font-extrabold">
            {copy.checkInTo}
            <select value={checkInTo} onChange={(e) => setCheckInTo(e.target.value)} className={SELECT}>
              <option value="">{copy.none}</option>
              {testEvents.map((event) => (
                <option key={event.slug} value={event.slug}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="primary" height={44} disabled={busy} className="md:w-auto md:px-6">
            {busy ? copy.creating : copy.create}
          </Button>
        </form>
      </Card>
      {error && (
        <p role="alert" className="m-0 text-[13px] font-extrabold text-coral">
          {error}
        </p>
      )}
      {users.length === 0 && <Muted className="font-bold">{copy.empty}</Muted>}
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
        {users.map((user) => (
          <li key={user.id}>
            <Card size="sm" className="flex h-full flex-col gap-2 px-4 py-3">
              <span className="font-display text-[17px] font-bold">{user.name}</span>
              <Muted className="text-[13px] font-bold break-all">@{user.handle}</Muted>
              <Muted className="text-[13px] font-bold">
                {[user.headline, user.company].filter(Boolean).join(" · ")}
                {user.currentEvent ? ` · ${copy.at(user.currentEvent.name)}` : ""}
              </Muted>
              {user.role === "super_admin" && <SectionLabel>super admin</SectionLabel>}
              <span className="mt-auto flex gap-2">
                <Button height={40} variant="primary" className="w-auto px-3 text-[14px]" disabled={busy} onClick={() => signInAs(user)}>
                  {copy.signIn}
                </Button>
                <Button height={40} className="w-auto px-3 text-[14px]" disabled={busy} onClick={() => run(() => apiCall("DELETE", `/api/admin/test-users/${user.id}`, NoBody), copy.deleteConfirm)}>
                  {copy.delete}
                </Button>
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
