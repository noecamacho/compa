"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatCount } from "@/lib/admin/format";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";

type Stats = { attendees: number; connections: number; pending: number };

type Props = {
  locale: Locale;
  name: string;
  slug: string;
  joinUrl: string;
  // Rendered on the server (qrcode), so the client ships no QR encoder.
  svg: string;
  // "side": the sticky column at xl+, with mini stats. "tab": the QR tab below xl, with the event name and print note.
  variant: "side" | "tab";
  stats?: Stats;
};

const svgHref = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// The door QR (spec §5.3): scan target, join link with Copy, Download SVG and Print. Rotating the code breaks printed
// QRs, so the warning sits right under the buttons that print it.
export function QrPanel({ locale, name, slug, joinUrl, svg, variant, stats }: Props) {
  const full = copyFor(locale).admin;
  const t = full.ui.detail;
  const codeRef = useRef<HTMLElement>(null);
  const isTab = variant === "tab";
  return (
    <Card className="flex flex-col gap-4 px-4 py-5 md:px-5">
      <p className="label-caps m-0 text-center">{t.scanToJoin}</p>
      <div
        role="img"
        aria-label={full.detail.qrLabel(name)}
        className={`mx-auto w-full [&>svg]:block [&>svg]:h-auto [&>svg]:w-full ${isTab ? "max-w-[min(80vw,420px)]" : "max-w-[300px]"}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {isTab && <p className="m-0 text-center font-display text-[20px] leading-[1.15] font-bold [overflow-wrap:anywhere]">{name}</p>}
      <div className="flex flex-wrap items-center gap-2 rounded-[14px] bg-paper py-1 pr-1 pl-3 border-ink">
        <code ref={codeRef} className="min-w-0 flex-1 truncate font-mono text-[13px] font-bold" title={joinUrl}>
          {joinUrl.replace(/^https?:\/\//, "")}
        </code>
        <CopyButton text={joinUrl} label={full.detail.copy} copiedLabel={full.detail.copied} failedLabel={t.copyFailed} onFail={() => selectText(codeRef.current)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={svgHref(svg)}
          download={`${slug}-qr.svg`}
          className="box-border flex h-11 items-center justify-center rounded-button bg-white px-3 font-display text-[15px] font-bold whitespace-nowrap border-ink shadow-hard-2 pressable"
        >
          {t.downloadSvg}
        </a>
        <Button height={44} className="px-3! text-[15px] shadow-hard-2!" onClick={() => window.print()}>
          {t.print}
        </Button>
      </div>
      <p className="m-0 flex items-start gap-2 text-[13px] leading-snug font-bold">
        <span aria-hidden className="mt-[1px] flex size-4 shrink-0 items-center justify-center rounded-full bg-coral text-[10px] font-bold">
          !
        </span>
        <span>{isTab ? `${t.rotateWarning} ${t.printNote}` : t.rotateWarning}</span>
      </p>
      {stats && <MiniStats locale={locale} stats={stats} labels={[full.detail.attendees, full.detail.connections, full.detail.pending]} />}
    </Card>
  );
}

function MiniStats({ locale, stats, labels }: { locale: Locale; stats: Stats; labels: [string, string, string] }) {
  const values = [stats.attendees, stats.connections, stats.pending];
  return (
    <dl className="m-0 grid grid-cols-3 gap-2">
      {values.map((value, index) => (
        <div key={labels[index]} className="flex min-w-0 flex-col-reverse rounded-[12px] bg-paper px-3 py-2">
          <dt className="truncate text-[12px] font-bold text-muted">{labels[index]}</dt>
          <dd className="m-0 font-display text-[20px] leading-none font-bold tabular-nums">{formatCount(locale, value)}</dd>
        </div>
      ))}
    </dl>
  );
}

// Clipboard can be denied (http, permissions; edge case 35): say so and select the text so a long-press copies it.
function selectText(element: HTMLElement | null) {
  if (!element) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  window.getSelection()?.removeAllRanges();
  window.getSelection()?.addRange(range);
}

type CopyProps = { text: string; label: string; copiedLabel: string; failedLabel: string; onFail?: () => void; className?: string };

export function CopyButton({ text, label, copiedLabel, failedLabel, onFail, className }: CopyProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    const ok = await navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );
    setState(ok ? "copied" : "failed");
    if (!ok) onFail?.();
  }
  return (
    <>
      <Button height={44} className={`w-auto! shrink-0 px-4 text-[15px] ${className ?? ""}`} onClick={copy}>
        {state === "copied" ? copiedLabel : label}
      </Button>
      <span role="status" className={state === "failed" ? "basis-full text-[12px] font-extrabold" : "sr-only"}>
        {state === "failed" ? failedLabel : state === "copied" ? copiedLabel : ""}
      </span>
    </>
  );
}

const noop = () => () => {};

// The printable sheet: only the QR (12 cm, scannable from a few meters), the name and the link (edge case 37). It is
// portalled straight into <body> so the print rule in globals.css can hide every other body child.
export function QrPrintSheet({ name, joinUrl, svg }: { name: string; joinUrl: string; svg: string }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <div data-admin-print className="hidden flex-col items-center gap-[8mm] pt-[20mm] text-center text-ink">
      <p className="m-0 font-display text-[28pt] leading-tight font-bold">{name}</p>
      <div className="w-[12cm] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="m-0 font-mono text-[16pt] font-bold">{joinUrl}</p>
    </div>,
    document.body,
  );
}
