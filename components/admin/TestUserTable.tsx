"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { relative } from "@/lib/admin/format";
import type { TestUserT } from "@/lib/api/admin-schemas";
import type { Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { CardList, Cell, DataTable, Row, type Column } from "./AdminParts";
import { PersonAvatar } from "./PersonAvatar";

type Copy = Dictionary["admin"];
type Props = {
  copy: Copy;
  locale: Locale;
  users: TestUserT[];
  // The signed-in admin: their own row reads "This is you" and cannot be deleted (edge case 27).
  meId: string;
  now: string;
  busy: boolean;
  onSignIn: (user: TestUserT) => void;
  onDelete: (user: TestUserT) => void;
  // Deleted rows leave the selection on their own after the refresh; failed ones stay picked for a retry.
  onDeleteMany: (users: TestUserT[]) => Promise<boolean>;
};

// Bulk selection is a desktop affordance (lg+, spec §5.5). Event and created need list-column room that a 1280 px
// screen with the generator beside it does not have, hence container queries (672 / 1024 px) rather than breakpoints;
// below 768 px of list the two row buttons stack.
const BULK = "hidden lg:table-cell";
const EVENT = "hidden @2xl:table-cell";
const CREATED = "hidden @5xl:table-cell";

const profileOf = (user: TestUserT) => [user.headline, user.company].filter(Boolean).join(" · ");

export function TestUserTable({ copy, locale, users, meId, now, busy, onSignIn, onDelete, onDeleteMany }: Props) {
  const tests = copy.tests;
  const [picked, setPicked] = useState<string[]>([]);
  const selectable = users.filter((user) => user.id !== meId);
  // Derived, so rows deleted by a refresh drop out of the selection on their own.
  const selected = selectable.filter((user) => picked.includes(user.id));
  const allPicked = selectable.length > 0 && selected.length === selectable.length;
  const toggle = (id: string) => setPicked((ids) => (ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id]));
  const toggleAll = () => setPicked(allPicked ? [] : selectable.map((user) => user.id));
  const createdOf = (user: TestUserT) => relative(locale, user.createdAt, new Date(now));


  const selectAll = (
    <Check label={tests.selectAll} checked={allPicked} mixed={selected.length > 0 && !allPicked} disabled={busy || selectable.length === 0} onChange={toggleAll} />
  );
  const columns: Column[] = [
    { key: "select", label: selectAll, className: `${BULK} w-14 pr-0!` },
    { key: "person", label: copy.ui.colPerson },
    { key: "profile", label: copy.ui.colProfile },
    { key: "event", label: tests.colCurrentEvent, className: EVENT },
    { key: "created", label: tests.colCreated, className: CREATED },
    { key: "actions", label: <span className="sr-only">{copy.ui.colActions}</span>, align: "right" },
  ];
  const actionProps = { copy, busy, meId, onSignIn, onDelete };

  return (
    <div className="flex flex-col gap-4 @container">
      <DataTable label={tests.title} columns={columns}>
        {users.map((user) => (
          <Row key={user.id}>
            <Cell className={`${BULK} pr-0!`}>
              {user.id !== meId && <Check label={tests.select(user.name)} checked={picked.includes(user.id)} disabled={busy} onChange={() => toggle(user.id)} />}
            </Cell>
            <Cell>
              <PersonLine user={user} copy={copy} />
            </Cell>
            <Cell className="text-muted">
              <span title={profileOf(user)} className="line-clamp-2 max-w-[16rem]">
                {profileOf(user) || "—"}
              </span>
            </Cell>
            <Cell className={EVENT}>
              <span title={user.currentEvent?.name} className="line-clamp-2 max-w-[12rem]">
                {user.currentEvent?.name ?? "—"}
              </span>
            </Cell>
            <Cell className={`${CREATED} text-muted`}>{createdOf(user)}</Cell>
            <Cell className="text-right">
              <RowActions user={user} {...actionProps} />
            </Cell>
          </Row>
        ))}
      </DataTable>
      <CardList>
        {users.map((user) => (
          <li key={user.id}>
            <Card size="sm" className="flex flex-col gap-2 px-4 py-3">
              <PersonLine user={user} copy={copy} />
              {profileOf(user) && <span className="text-[14px] font-extrabold">{profileOf(user)}</span>}
              <span className="text-[13px] font-bold text-muted">
                {user.currentEvent ? tests.at(user.currentEvent.name) : tests.noEvent} · {tests.created(createdOf(user))}
              </span>
              <span className="mt-1">
                <RowActions user={user} {...actionProps} />
              </span>
            </Card>
          </li>
        ))}
      </CardList>
      {selected.length > 0 && (
        <div role="toolbar" aria-label={copy.ui.bulk.selected(selected.length)} className="sticky bottom-4 z-20 hidden items-center gap-3 rounded-[16px] bg-ink px-4 py-3 text-paper shadow-hard-4 lg:flex">
          <span className="flex-1 text-[15px] font-extrabold">{copy.ui.bulk.selected(selected.length)}</span>
          <Button height={44} className="w-auto! px-4 text-[14px]" disabled={busy} onClick={() => void onDeleteMany(selected)}>
            {tests.deleteN(selected.length)}
          </Button>
          <button type="button" onClick={() => setPicked([])} className="min-h-11 cursor-pointer px-2 text-[14px] font-extrabold text-paper underline">
            {copy.ui.bulk.clear}
          </button>
        </div>
      )}
    </div>
  );
}

function PersonLine({ user, copy }: { user: TestUserT; copy: Copy }) {
  return (
    <span className="flex items-center gap-3">
      <PersonAvatar name={user.name} isTest />
      <span className="flex min-w-0 flex-col items-start">
        <span title={user.name} className="line-clamp-2 font-display text-[16px] leading-[1.2] font-bold">
          {user.name}
        </span>
        {user.role === "super_admin" && (
          <Pill tone="gum-soft" shadow={false} height={24} className="my-1 text-[11px]!">
            {copy.ui.nav.testAdmin}
          </Pill>
        )}
        <span title={`@${user.handle}`} className="block max-w-[10rem] truncate text-[13px] font-bold text-muted max-md:max-w-full">
          @{user.handle}
        </span>
      </span>
    </span>
  );
}

type ActionProps = { user: TestUserT; copy: Copy; busy: boolean; meId: string; onSignIn: (user: TestUserT) => void; onDelete: (user: TestUserT) => void };

// Repeated buttons name their person ("Sign in as Ana Garza"), so a screen-reader list of buttons is not ambiguous.
function RowActions({ user, copy, busy, meId, onSignIn, onDelete }: ActionProps) {
  const tests = copy.tests;
  if (user.id === meId)
    return (
      <span className="box-border inline-flex h-11 items-center justify-center rounded-[12px] bg-paper px-4 text-[14px] font-extrabold whitespace-nowrap text-muted border-ink max-md:w-full">
        {tests.thisIsYou}
      </span>
    );
  return (
    <span className="grid grid-cols-2 gap-2 md:flex md:flex-col @3xl:flex-row @3xl:justify-end">
      <Button height={44} variant="primary" className="px-3 text-[14px] whitespace-nowrap md:w-auto!" disabled={busy} aria-label={`${tests.signIn} ${user.name}`} onClick={() => onSignIn(user)}>
        {tests.signIn}
      </Button>
      <Button height={44} className="px-3 text-[14px] whitespace-nowrap md:w-auto!" disabled={busy} aria-label={`${tests.delete} ${user.name}`} onClick={() => onDelete(user)}>
        {tests.delete}
      </Button>
    </span>
  );
}

type CheckProps = { label: string; checked: boolean; mixed?: boolean; disabled: boolean; onChange: () => void };

// A 44 px hit area around a native checkbox; `mixed` is the header's "some selected" state.
function Check({ label, checked, mixed = false, disabled, onChange }: CheckProps) {
  return (
    <label className="flex size-11 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        ref={(input) => {
          if (input) input.indeterminate = mixed;
        }}
        className="size-5 cursor-pointer accent-ink"
      />
    </label>
  );
}
