"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import type { EventPhaseT } from "@/lib/admin/event-phase";
import { AdminEventBody } from "@/lib/api/admin-schemas";
import { apiCall } from "@/lib/api/client";
import { copyFor, type Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { lifecycle as phaseActions, writeErrors } from "./EventActions";
import { Notice } from "./Notice";
import { RowMenu, RowMenuItem, RowMenuSeparator } from "./RowMenu";
import { useAdminAction, type Outcome } from "./useAdminAction";

// What the client needs of a row; the server computes `phase` with the request's `now` (spec §6.2).
export type ListEvent = { id: string; slug: string; name: string; phase: EventPhaseT; joinUrl: string };

type Lifecycle = "end" | "archive";

type Ctx = {
  copy: Dictionary["admin"];
  events: ListEvent[];
  selected: ReadonlySet<string>;
  toggle: (id: string) => void;
  selectPage: (on: boolean) => void;
  busy: boolean;
  lifecycle: (event: ListEvent, kind: Lifecycle) => void;
  restore: (event: ListEvent) => void;
  copyLink: (event: ListEvent) => void;
  downloadQr: (event: ListEvent) => void;
};

const EventsCtx = createContext<Ctx | null>(null);

function useEvents(): Ctx {
  const ctx = useContext(EventsCtx);
  if (!ctx) throw new Error("EventsProvider is missing");
  return ctx;
}

const canEnd = (event: ListEvent) => phaseActions(event.phase).canEnd;
const canArchive = (event: ListEvent) => phaseActions(event.phase).canArchive;
const base = (event: ListEvent) => `/api/admin/events/${event.slug}`;
const lifecycleCall = (event: ListEvent, kind: Lifecycle) => apiCall("POST", `${base(event)}/${kind}`, AdminEventBody);

const MAX_NAMES = 8;

// "A, B, C +2 more": the bulk confirm names what it touches (spec §6.6).
const namesOf = (events: ListEvent[], more: (count: number) => string) => {
  const names = events.slice(0, MAX_NAMES).map((event) => event.name).join(", ");
  return events.length > MAX_NAMES ? `${names} ${more(events.length - MAX_NAMES)}` : names;
};

async function svgDownload(event: ListEvent): Promise<void> {
  const qr = await import("qrcode");
  const svg = await qr.toString(event.joinUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1E1B2E", light: "#FFFFFF" } });
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  Object.assign(document.createElement("a"), { href: url, download: `${event.slug}-qr.svg` }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type ProviderProps = { locale: Locale; events: ListEvent[]; children: ReactNode };

// One action hook for the whole list: one confirm dialog, one result notice, and the bulk selection (lg+). Key it by the
// list's URL so a new page, filter or sort starts with nothing selected.
export function EventsProvider({ locale, events, children }: ProviderProps) {
  const copy = copyFor(locale).admin;
  const action = useAdminAction(copy.detail.failed);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const selectPage = (on: boolean) => setSelected(new Set(on ? events.map((event) => event.id) : []));

  const confirmFor = (kind: Lifecycle, body: string): Outcome => {
    const { title, confirm, done } = copy.ui.dialogs[kind];
    return { confirm: { title, body, confirmLabel: confirm, cancelLabel: copy.ui.cancel, danger: true }, done, errors: writeErrors(copy.ui) };
  };

  const value: Ctx = {
    copy,
    events,
    selected,
    toggle,
    selectPage,
    busy: action.busy,
    lifecycle: (event, kind) => void action.run(() => lifecycleCall(event, kind), confirmFor(kind, kind === "end" ? copy.detail.endConfirm : copy.detail.archiveConfirm)),
    // Back to `ended`, not `live`, so the door does not silently reopen (edge case 22). No confirm: it is the undo.
    restore: (event) => void action.run(() => apiCall("PATCH", base(event), AdminEventBody, { status: "ended" }), { done: copy.ui.eventList.restored, errors: writeErrors(copy.ui) }),
    copyLink: (event) =>
      void navigator.clipboard.writeText(event.joinUrl).then(
        () => action.announce(copy.ui.eventList.copied),
        () => action.announce(copy.ui.eventList.copyFailed(event.joinUrl), "error"),
      ),
    downloadQr: (event) => void svgDownload(event).catch(() => action.announce(copy.detail.failed, "error")),
  };

  return (
    <EventsCtx.Provider value={value}>
      {children}
      <div className="sticky bottom-[calc(56px+env(safe-area-inset-bottom)+12px)] z-20 flex flex-col gap-2 md:bottom-4">
        <BulkBar runMany={action.runMany} clear={() => selectPage(false)} />
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Notice tone="error">{action.error}</Notice>
            <Notice tone="success">{action.notice}</Notice>
          </div>
          {(action.error || action.notice) && (
            <button type="button" onClick={action.dismiss} aria-label={copy.ui.eventList.dismiss} title={copy.ui.eventList.dismiss} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white border-ink">
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
      </div>
      {action.dialog}
    </EventsCtx.Provider>
  );
}

type RunMany = ReturnType<typeof useAdminAction>["runMany"];

// "3 selected · End now · Archive · Clear" (spec §5.1), lg+ only like the checkbox column. Each action runs on the
// selected events it applies to; one confirm lists their names.
function BulkBar({ runMany, clear }: { runMany: RunMany; clear: () => void }) {
  const { copy, events, selected, busy } = useEvents();
  const chosen = events.filter((event) => selected.has(event.id));
  if (chosen.length === 0) return null;
  const list = copy.ui.eventList;

  async function bulk(kind: Lifecycle) {
    const targets = chosen.filter(kind === "end" ? canEnd : canArchive);
    const title = kind === "end" ? list.bulkEnd(targets.length) : list.bulkArchive(targets.length);
    const consequence = kind === "end" ? list.bulkEndBody : list.bulkArchiveBody;
    const confirm = { title, body: `${namesOf(targets, list.bulkMore)}. ${consequence}`, confirmLabel: copy.ui.dialogs[kind].confirm, cancelLabel: copy.ui.cancel, danger: true };
    const summary = (failed: ListEvent[]) => {
      const result = copy.ui.bulk.result(targets.length - failed.length, failed.length);
      return failed.length ? `${result}: ${namesOf(failed, list.bulkMore)}` : result;
    };
    if (await runMany(targets, (event) => lifecycleCall(event, kind), { confirm, summary })) clear();
  }

  return (
    <div className="hidden items-center gap-3 rounded-[18px] bg-ink px-5 py-3 text-paper shadow-hard-3 lg:flex">
      <p role="status" className="m-0 flex-1 font-display text-[18px] font-bold">
        {copy.ui.bulk.selected(chosen.length)}
      </p>
      <Button height={44} className="w-auto! px-4 text-[15px]" disabled={busy || !chosen.some(canEnd)} onClick={() => void bulk("end")}>
        {copy.detail.end}
      </Button>
      <Button height={44} className="w-auto! px-4 text-[15px]" disabled={busy || !chosen.some(canArchive)} onClick={() => void bulk("archive")}>
        {copy.detail.archive}
      </Button>
      <button type="button" onClick={clear} className="min-h-11 cursor-pointer px-2 text-[15px] font-extrabold text-paper underline">
        {copy.ui.bulk.clear}
      </button>
    </div>
  );
}

const CHECK_LABEL = "relative z-10 flex size-11 cursor-pointer items-center justify-center";
const CHECK = "size-5 cursor-pointer accent-ink";

export function RowCheck({ event }: { event: ListEvent }) {
  const { copy, selected, toggle } = useEvents();
  return (
    <label className={CHECK_LABEL}>
      <input type="checkbox" className={CHECK} aria-label={copy.ui.eventList.selectRow(event.name)} checked={selected.has(event.id)} onChange={() => toggle(event.id)} />
    </label>
  );
}

// Tri-state "select page": checked when every row is, mixed when some are.
export function PageCheck() {
  const { copy, events, selected, selectPage } = useEvents();
  const ref = useRef<HTMLInputElement>(null);
  const all = events.length > 0 && events.every((event) => selected.has(event.id));
  const some = selected.size > 0 && !all;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some;
  }, [some]);
  return (
    <label className={CHECK_LABEL}>
      <input ref={ref} type="checkbox" className={CHECK} aria-label={copy.ui.eventList.selectPage} checked={all} onChange={() => selectPage(!all)} />
    </label>
  );
}

// The ⋯ menu of a row or card. `place` keeps the popover ids unique when the table and the cards both render the event.
export function EventRowMenu({ event, place }: { event: ListEvent; place: "row" | "card" }) {
  const { copy, busy, lifecycle, restore, copyLink, downloadQr } = useEvents();
  const id = `menu-${place}-${event.id}`;
  const menu = copy.ui.menu;
  return (
    <RowMenu id={id} label={menu.moreFor(event.name)}>
      <RowMenuItem href={`/admin/events/${event.slug}`} icon="chevronRight">
        {menu.open}
      </RowMenuItem>
      <RowMenuItem menuId={id} icon="link" onClick={() => copyLink(event)}>
        {menu.copyLink}
      </RowMenuItem>
      <RowMenuItem href={`${event.joinUrl}/live`} external icon="bolt">
        {menu.openLive}
      </RowMenuItem>
      <RowMenuItem menuId={id} icon="qr" onClick={() => downloadQr(event)}>
        {menu.downloadQr}
      </RowMenuItem>
      <RowMenuSeparator />
      {canEnd(event) && (
        <RowMenuItem menuId={id} danger disabled={busy} onClick={() => lifecycle(event, "end")}>
          {copy.detail.end}
        </RowMenuItem>
      )}
      {canArchive(event) ? (
        <RowMenuItem menuId={id} danger disabled={busy} onClick={() => lifecycle(event, "archive")}>
          {copy.detail.archive}
        </RowMenuItem>
      ) : (
        <RowMenuItem menuId={id} icon="refresh" disabled={busy} onClick={() => restore(event)}>
          {menu.restore}
        </RowMenuItem>
      )}
    </RowMenu>
  );
}
