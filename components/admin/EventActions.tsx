"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AdminEventBody } from "@/lib/api/admin-schemas";
import { apiCall } from "@/lib/api/client";
import { RotatedCode } from "@/lib/api/schemas";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { useAdminAction } from "./useAdminAction";

type Props = { locale: Locale; slug: string; joinUrl: string; liveUrl: string; ended: boolean; archived: boolean };

export function EventActions({ locale, slug, joinUrl, liveUrl, ended, archived }: Props) {
  const copy = copyFor(locale).admin.detail;
  const { busy, error, run } = useAdminAction(copy.failed);
  const [copied, setCopied] = useState(false);
  const base = `/api/admin/events/${slug}`;

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl).catch(() => undefined);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button height={46} className="w-auto" onClick={copyLink}>
          {copied ? copy.copied : copy.copy}
        </Button>
        <a href={liveUrl} target="_blank" rel="noreferrer" className="box-border flex h-[46px] items-center rounded-button bg-sky-soft px-5 font-display text-[16px] font-bold border-ink shadow-hard-4">
          {copy.live}
        </a>
        <Button height={46} className="w-auto" disabled={busy} onClick={() => run(() => apiCall("POST", `${base}/rotate-code`, RotatedCode), copy.rotateConfirm)}>
          {copy.rotate}
        </Button>
        {!ended && (
          <Button height={46} variant="ink" className="w-auto" disabled={busy} onClick={() => run(() => apiCall("POST", `${base}/end`, AdminEventBody), copy.endConfirm)}>
            {copy.end}
          </Button>
        )}
        {!archived && (
          <Button height={46} className="w-auto" disabled={busy} onClick={() => run(() => apiCall("POST", `${base}/archive`, AdminEventBody), copy.archiveConfirm)}>
            {copy.archive}
          </Button>
        )}
      </div>
      {busy && <span className="text-[13px] font-bold">{copy.working}</span>}
      {error && (
        <p role="alert" className="m-0 text-[13px] font-extrabold text-coral">
          {error}
        </p>
      )}
    </div>
  );
}
