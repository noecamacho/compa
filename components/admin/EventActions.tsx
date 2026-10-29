"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/Text";
import { AdminEventBody } from "@/lib/api/admin-schemas";
import { apiCall } from "@/lib/api/client";
import { RotatedCode } from "@/lib/api/schemas";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { Notice } from "./Notice";
import { useAdminAction, type Outcome } from "./useAdminAction";

type Props = { locale: Locale; slug: string; joinUrl: string; liveUrl: string; ended: boolean; archived: boolean };

// Share row first (safe, frequent), then the sensitive actions apart and smaller, each behind a consequence dialog (Fitts, error prevention).
export function EventActions({ locale, slug, joinUrl, liveUrl, ended, archived }: Props) {
  const full = copyFor(locale).admin;
  const copy = full.detail;
  const { busy, error, notice, run, dialog } = useAdminAction(copy.failed);
  const [copied, setCopied] = useState(false);
  const base = `/api/admin/events/${slug}`;
  const outcome = (key: "rotate" | "end" | "archive", body: string): Outcome => {
    const { title, confirm, done } = full.ui.dialogs[key];
    return { confirm: { title, body, confirmLabel: confirm, cancelLabel: full.ui.cancel, danger: true }, done };
  };

  async function copyLink() {
    const ok = await navigator.clipboard.writeText(joinUrl).then(() => true, () => false);
    setCopied(ok);
  }

  return (
    <Card className="flex flex-col gap-4 px-4 py-4">
      <div className="flex flex-col gap-2">
        <SectionLabel>{full.ui.detail.share}</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <Button height={46} variant="primary" onClick={copyLink}>
            {copied ? copy.copied : copy.copy}
          </Button>
          <a href={liveUrl} target="_blank" rel="noreferrer" className="box-border flex h-[46px] items-center justify-center rounded-button bg-sky-soft px-4 font-display text-[16px] font-bold whitespace-nowrap border-ink shadow-hard-4 pressable">
            {copy.live}
          </a>
        </div>
      </div>
      <div className="dashed-ink flex flex-col gap-2 pt-4">
        <SectionLabel>{full.ui.detail.danger}</SectionLabel>
        <p className="m-0 text-[12px] font-bold text-muted">{full.ui.detail.dangerHint}</p>
        <div className="flex flex-wrap gap-2">
          <Button height={44} className="w-auto! px-4 text-[14px]" disabled={busy} onClick={() => run(() => apiCall("POST", `${base}/rotate-code`, RotatedCode), outcome("rotate", copy.rotateConfirm))}>
            {copy.rotate}
          </Button>
          {!ended && (
            <Button height={44} className="w-auto! px-4 text-[14px]" disabled={busy} onClick={() => run(() => apiCall("POST", `${base}/end`, AdminEventBody), outcome("end", copy.endConfirm))}>
              {copy.end}
            </Button>
          )}
          {!archived && (
            <Button height={44} className="w-auto! px-4 text-[14px]" disabled={busy} onClick={() => run(() => apiCall("POST", `${base}/archive`, AdminEventBody), outcome("archive", copy.archiveConfirm))}>
              {copy.archive}
            </Button>
          )}
        </div>
      </div>
      <p role="status" className="sr-only">
        {busy ? copy.working : ""}
      </p>
      <Notice tone="error">{error}</Notice>
      <Notice tone="success">{notice}</Notice>
      {dialog}
    </Card>
  );
}
