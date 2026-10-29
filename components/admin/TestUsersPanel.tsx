"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Muted } from "@/components/ui/Text";
import { TestSession, TestUserList, type TestUserT } from "@/lib/api/admin-schemas";
import { apiCall } from "@/lib/api/client";
import { NoBody } from "@/lib/api/route-spec";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { TEST_PRESETS, type TestPreset } from "@/lib/testing/profiles";
import { AdminField, AdminInput } from "./AdminField";
import { CardList, Cell, DataTable, EmptyState, Row } from "./AdminParts";
import { Notice } from "./Notice";
import { useAdminAction } from "./useAdminAction";

type TestEvent = { slug: string; name: string };
type Props = { locale: Locale; users: TestUserT[]; testEvents: TestEvent[] };

const MAX_COUNT = 50;

// Create, sign in as and delete test users (API spec A11). Signing in replaces this browser's admin session.
export function TestUsersPanel({ locale, users, testEvents }: Props) {
  const full = copyFor(locale).admin;
  const copy = full.tests;
  const router = useRouter();
  const { busy, error, notice, run, dialog } = useAdminAction(copy.failed);
  const [count, setCount] = useState("3");
  const [preset, setPreset] = useState<TestPreset>("random");
  const [checkInTo, setCheckInTo] = useState(testEvents[0]?.slug ?? "");
  const [touched, setTouched] = useState(false);
  const amount = Number(count);
  const countError = touched && !(Number.isInteger(amount) && amount >= 1 && amount <= MAX_COUNT) ? full.ui.tests.countInvalid : null;

  async function create(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_COUNT) return;
    await run(() => apiCall("POST", "/api/admin/test-users", TestUserList, { count: amount, preset, ...(checkInTo ? { checkInTo } : {}) }), { done: full.ui.done.testCreated(amount) });
  }

  async function signInAs(user: TestUserT) {
    const { title, confirm } = full.ui.dialogs.signIn;
    const ok = await run(() => apiCall("POST", `/api/admin/test-users/${user.id}/session`, TestSession), {
      confirm: { title: title(user.name), body: copy.signInConfirm, confirmLabel: confirm, cancelLabel: full.ui.cancel },
    });
    if (ok) router.push("/home");
  }

  const remove = (user: TestUserT) =>
    run(() => apiCall("DELETE", `/api/admin/test-users/${user.id}`, NoBody), {
      confirm: { title: full.ui.dialogs.deleteTest.title(user.name), body: copy.deleteConfirm, confirmLabel: full.ui.dialogs.deleteTest.confirm, cancelLabel: full.ui.cancel, danger: true },
      done: full.ui.dialogs.deleteTest.done,
    });

  const details = (user: TestUserT) => [[user.headline, user.company].filter(Boolean).join(" · "), user.currentEvent ? copy.at(user.currentEvent.name) : ""].filter(Boolean).join(" · ");
  // Repeated buttons name their person ("Sign in as Ana Garza"), so a screen-reader list of buttons is not ambiguous.
  const actions = (user: TestUserT) => (
    <span className="flex gap-2">
      <Button height={44} variant="primary" className="w-auto! px-3 text-[14px]" disabled={busy} aria-label={`${copy.signIn} ${user.name}`} onClick={() => signInAs(user)}>
        {copy.signIn}
      </Button>
      <Button height={44} className="w-auto! px-3 text-[14px]" disabled={busy} aria-label={`${copy.delete} ${user.name}`} onClick={() => remove(user)}>
        {copy.delete}
      </Button>
    </span>
  );

  return (
    <div className="flex flex-col gap-5">
      <Card className="px-4 py-4 md:px-5">
        <form onSubmit={create} noValidate className="grid grid-cols-1 items-start gap-3 md:grid-cols-[120px_1fr_1fr_auto]">
          <AdminInput id="test-count" label={copy.count} type="number" inputMode="numeric" min={1} max={MAX_COUNT} value={count} onChange={(e) => setCount(e.target.value)} onBlur={() => setTouched(true)} error={countError} hint={full.ui.tests.countRange} />
          <AdminField id="test-preset" label={copy.preset}>
            {(aria, className) => (
              <select id="test-preset" value={preset} onChange={(e) => setPreset(e.target.value as TestPreset)} className={`${className} h-11`} {...aria}>
                {TEST_PRESETS.map((key) => (
                  <option key={key} value={key}>
                    {copy.presets[key]}
                  </option>
                ))}
              </select>
            )}
          </AdminField>
          <AdminField id="test-checkin" label={copy.checkInTo}>
            {(aria, className) => (
              <select id="test-checkin" value={checkInTo} onChange={(e) => setCheckInTo(e.target.value)} className={`${className} h-11`} {...aria}>
                <option value="">{copy.none}</option>
                {testEvents.map((event) => (
                  <option key={event.slug} value={event.slug}>
                    {event.name}
                  </option>
                ))}
              </select>
            )}
          </AdminField>
          <Button type="submit" variant="primary" height={44} disabled={busy} className="md:mt-[22px] md:w-auto! md:px-6">
            {busy ? copy.creating : copy.create}
          </Button>
        </form>
      </Card>
      <Notice tone="error">{error}</Notice>
      <Notice tone="success">{notice}</Notice>
      {users.length === 0 && <EmptyState title={copy.empty} body={copy.intro} />}
      {users.length > 0 && (
        <>
          <DataTable label={copy.title} columns={[
              { key: "person", label: full.ui.colPerson },
              { key: "profile", label: full.ui.colProfile },
              { key: "actions", label: full.ui.colActions },
            ]}>
            {users.map((user) => (
              <Row key={user.id}>
                <Cell>
                  <span className="block font-display text-[16px] font-bold">{user.name}</span>
                  <Muted className="block max-w-[260px] truncate text-[13px] font-bold" title={`@${user.handle}`}>
                    @{user.handle}
                  </Muted>
                </Cell>
                <Cell className="text-muted">
                  {details(user)}
                  {user.role === "super_admin" && (
                    <Pill tone="sun" shadow={false} className="ml-2">
                      {full.ui.nav.testAdmin}
                    </Pill>
                  )}
                </Cell>
                <Cell>{actions(user)}</Cell>
              </Row>
            ))}
          </DataTable>
          <CardList>
            {users.map((user) => (
              <li key={user.id}>
                <Card size="sm" className="flex flex-col gap-2 px-4 py-3">
                  <span className="font-display text-[17px] font-bold">{user.name}</span>
                  <Muted className="truncate text-[13px] font-bold" title={`@${user.handle}`}>
                    @{user.handle}
                  </Muted>
                  <Muted className="text-[13px] font-bold">{details(user)}</Muted>
                  {user.role === "super_admin" && (
                    <Pill tone="sun" shadow={false} className="self-start">
                      {full.ui.nav.testAdmin}
                    </Pill>
                  )}
                  <span className="mt-1">{actions(user)}</span>
                </Card>
              </li>
            ))}
          </CardList>
        </>
      )}
      {dialog}
    </div>
  );
}
