"use client";

import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Muted } from "@/components/ui/Text";
import type { EventPhaseT } from "@/lib/admin/event-phase";
import { AdminEventBody } from "@/lib/api/admin-schemas";
import { apiCall } from "@/lib/api/client";
import { RotatedCode } from "@/lib/api/schemas";
import { copyFor, type Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { Notice } from "./Notice";
import { CopyButton } from "./QrPanel";
import { RowMenu, RowMenuItem, RowMenuSeparator } from "./RowMenu";
import { useAdminAction, type Outcome } from "./useAdminAction";

type Ui = Dictionary["admin"]["ui"];

// Every admin write on the event page maps a bare 404 (the gate, once the session is gone) to "reload" (edge case 29).
export const writeErrors = (ui: Ui, byCode: Record<string, string> = {}): Record<string, string> => ({ ...byCode, "404": ui.detail.sessionEnded });

type Lifecycle = { canEnd: boolean; canArchive: boolean; canRestore: boolean };

// Edge cases 9 and 10: "End now" only while the window is open or ahead; "Restore" only when archived.
const lifecycle = (phase: EventPhaseT): Lifecycle => ({
  canEnd: phase === "running" || phase === "upcoming",
  canArchive: phase !== "archived",
  canRestore: phase === "archived",
});

// The lifecycle writes, shared by the header menu and the Settings danger zone. Rotate, End and Archive confirm (spec
// §6.6); Restore sets `ended`, not `live`, so it never silently reopens the door (edge case 22), and needs no confirm.
function useEventLifecycle(locale: Locale, slug: string) {
  const full = copyFor(locale).admin;
  const action = useAdminAction(full.detail.failed);
  const base = `/api/admin/events/${slug}`;
  const confirmed = (key: "rotate" | "end" | "archive", body: string): Outcome => {
    const { title, confirm, done } = full.ui.dialogs[key];
    return { confirm: { title, body, confirmLabel: confirm, cancelLabel: full.ui.cancel, danger: true }, done, errors: writeErrors(full.ui) };
  };
  return {
    ...action,
    full,
    rotate: () => action.run(() => apiCall("POST", `${base}/rotate-code`, RotatedCode), confirmed("rotate", full.detail.rotateConfirm)),
    end: () => action.run(() => apiCall("POST", `${base}/end`, AdminEventBody), confirmed("end", full.detail.endConfirm)),
    archive: () => action.run(() => apiCall("POST", `${base}/archive`, AdminEventBody), confirmed("archive", full.detail.archiveConfirm)),
    restore: () => action.run(() => apiCall("PATCH", base, AdminEventBody, { status: "ended" }), { done: full.ui.detail.restoreDone, errors: writeErrors(full.ui) }),
  };
}

type HeaderProps = { locale: Locale; slug: string; name: string; joinUrl: string; liveUrl: string; phase: EventPhaseT };

const LIVE_LINK =
  "box-border flex h-11 items-center justify-center gap-2 rounded-button bg-white px-4 font-display text-[15px] font-bold whitespace-nowrap text-ink no-underline border-ink shadow-hard-2 pressable";

// Header actions (spec §5.3): Copy link (from md), Open live ↗ and a ⋯ menu with the lifecycle. The notices wrap onto
// their own line below the header.
export function EventHeaderActions({ locale, slug, name, joinUrl, liveUrl, phase }: HeaderProps) {
  const { full, busy, error, notice, dialog, rotate, end, archive, restore } = useEventLifecycle(locale, slug);
  const { canEnd, canArchive, canRestore } = lifecycle(phase);
  const ui = full.ui;
  const menuId = "event-menu";
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden md:contents">
          <CopyButton text={joinUrl} label={ui.detail.copyLink} copiedLabel={full.detail.copied} failedLabel={ui.detail.copyFailed} className="shadow-hard-2!" />
        </span>
        <a href={liveUrl} target="_blank" rel="noopener noreferrer" className={LIVE_LINK}>
          <Icon name="external" size={18} />
          {ui.menu.openLive}
        </a>
        <RowMenu id={menuId} label={ui.menu.moreFor(name)}>
          <RowMenuItem menuId={menuId} onClick={() => void navigator.clipboard.writeText(joinUrl).catch(() => undefined)}>
            {ui.menu.copyLink}
          </RowMenuItem>
          <RowMenuSeparator />
          {!canRestore && (
            <RowMenuItem menuId={menuId} disabled={busy} onClick={rotate}>
              {full.detail.rotate}
            </RowMenuItem>
          )}
          {canEnd && (
            <RowMenuItem menuId={menuId} danger disabled={busy} onClick={end}>
              {full.detail.end}
            </RowMenuItem>
          )}
          {canArchive && (
            <RowMenuItem menuId={menuId} danger disabled={busy} onClick={archive}>
              {full.detail.archive}
            </RowMenuItem>
          )}
          {canRestore && (
            <RowMenuItem menuId={menuId} disabled={busy} onClick={restore}>
              {ui.menu.restore}
            </RowMenuItem>
          )}
        </RowMenu>
      </div>
      <div className="basis-full empty:hidden">
        <Notice tone="error">{error}</Notice>
        <Notice tone="success">{notice}</Notice>
      </div>
      {dialog}
    </>
  );
}

type DangerProps = { locale: Locale; slug: string; phase: EventPhaseT };

// Settings → Danger zone: each lifecycle action with its consequence spelled out next to the button.
export function DangerZone({ locale, slug, phase }: DangerProps) {
  const { full, busy, error, notice, dialog, rotate, end, archive, restore } = useEventLifecycle(locale, slug);
  const { canEnd, canArchive, canRestore } = lifecycle(phase);
  const t = full.ui.detail;
  const rows = [
    { key: "rotate", show: !canRestore, label: full.detail.rotate, hint: t.rotateHint, onClick: rotate },
    { key: "end", show: canEnd, label: full.detail.end, hint: t.endHint, onClick: end },
    { key: "archive", show: canArchive, label: full.detail.archive, hint: t.archiveHint, onClick: archive },
    { key: "restore", show: canRestore, label: full.ui.menu.restore, hint: t.restoreHint, onClick: restore },
  ].filter((row) => row.show);
  return (
    <Card className="flex flex-col gap-3 px-4 py-5 md:px-6">
      <h2 className="m-0 font-display text-[20px] font-bold">{t.dangerZone}</h2>
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((row) => (
          <li key={row.key} className="dashed-ink flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:border-t-0 first:pt-0">
            <span className="min-w-0 flex-1 basis-[240px]">
              <span className="block text-[15px] font-extrabold">{row.label}</span>
              <Muted className="text-[13px] font-bold">{row.hint}</Muted>
            </span>
            <Button height={44} className="w-auto! px-4 text-[14px]" disabled={busy} onClick={row.onClick}>
              {row.label}
            </Button>
          </li>
        ))}
      </ul>
      <Notice tone="error">{error}</Notice>
      <Notice tone="success">{notice}</Notice>
      {dialog}
    </Card>
  );
}
