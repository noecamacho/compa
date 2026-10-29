"use client";

// Marquee: kinetic typography, brutalist black and paper. Columns of names scroll at their own pace (ranking with
// points, the newest pairs); the counters stand as giant figures. An event slams across the stage in huge type.
import { useMemo } from "react";
import { boardRows } from "@/lib/live/live-model";
import { feed } from "@/lib/live/live-model";
import { copyFor, formatNumber } from "@/lib/copy";
import { browserLocale } from "@/lib/i18n";
import { captionText } from "./Caption";
import { KIND_COLOR, PALETTE, type VizProps } from "./types";
import { useAnnouncer, useLiveEvents } from "./useLiveEvents";

const RANK_ROWS = 40;
const FEED_ROWS = 30;
const COUNTERS = ["checkedIn", "connections", "newCount", "reconnections"] as const;

type ColumnProps = { children: React.ReactNode; seconds: number; reduced: boolean; className?: string };

// The list is rendered twice and shifted by half its height, so the loop never shows a seam.
function Column({ children, seconds, reduced, className = "" }: ColumnProps) {
  return (
    <div className={`relative min-h-0 min-w-0 overflow-hidden ${className}`}>
      <div className="flex flex-col" style={{ animation: reduced ? undefined : `marquee-up ${seconds}s linear infinite` }}>
        {children}
        <div aria-hidden="true" className="flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Marquee({ snapshot, reducedMotion, label, selectedId, onSelect }: VizProps) {
  const locale = browserLocale() ?? "es";
  const copy = copyFor(locale).live;
  const rows = useMemo(() => boardRows(snapshot).slice(0, RANK_ROWS), [snapshot]);
  const pairs = useMemo(() => feed(snapshot, FEED_ROWS), [snapshot]);
  const batch = useLiveEvents(snapshot);
  const announced = useAnnouncer(batch, reducedMotion);
  const lit = new Set(batch.fresh.map((event) => event.id));
  const empty = rows.length === 0;
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[22px] border-ink text-paper" data-viz="marquee" role="img" aria-label={label} style={{ background: PALETTE.ink, fontFamily: "var(--font-display)" }} onClick={() => onSelect(null)}>
      <div className="grid h-full grid-cols-[1fr] gap-[2%] p-[3%] sm:grid-cols-[1.7fr_1fr_0.8fr]">
        <Column seconds={Math.max(20, rows.length * 2.2)} reduced={reducedMotion} className="h-full">
          {(empty ? [{ id: "ghost", rank: 1, name: snapshot.event.name, points: 0 }] : rows).map((row) => (
            <button
              type="button"
              key={row.id}
              aria-pressed={row.id === selectedId}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(empty ? null : row.id);
              }}
              className={`flex items-baseline gap-[0.4em] truncate py-[0.05em] text-left leading-none font-bold uppercase ${row.id === selectedId ? "text-sun" : lit.has(row.id) ? "text-mint" : ""}`}
              style={{ fontSize: "clamp(22px, 3vw, 72px)", color: row.rank <= 3 ? PALETTE.sun : undefined, transition: "color 400ms" }}
            >
              <span className="shrink-0 font-body text-[0.4em] font-extrabold tabular-nums opacity-60">{row.rank}</span>
              <span className="truncate">{row.name}</span>
              <span className="ml-auto shrink-0 text-[0.5em] tabular-nums opacity-70">{formatNumber(locale, row.points)}</span>
            </button>
          ))}
        </Column>
        <Column seconds={Math.max(18, pairs.length * 2.5)} reduced={reducedMotion} className="hidden h-full sm:block">
          {(pairs.length === 0 ? [{ id: "none", a: copy.legendNew, b: copy.legendReconnection, kind: "new" as const }] : pairs).map((pair) => (
            <div key={pair.id} className="truncate py-[0.15em] leading-none font-bold" style={{ fontSize: "clamp(18px, 2.2vw, 52px)", color: KIND_COLOR[pair.kind] }}>
              {pair.a} <span className="text-paper">⇄</span> {pair.b}
            </div>
          ))}
        </Column>
        <div className="hidden min-w-0 flex-col justify-between sm:flex">
          {COUNTERS.map((key) => (
            <div key={key} className="min-w-0 border-t-4 border-paper/30 pt-[0.1em]">
              <div className="truncate leading-none font-bold tabular-nums" style={{ fontSize: "clamp(40px, 7vw, 150px)", animation: reducedMotion ? undefined : `breathe ${6 + COUNTERS.indexOf(key)}s ease-in-out infinite`, transformOrigin: "left center" }}>
                {formatNumber(locale, snapshot.counters[key])}
              </div>
              <div className="truncate font-body text-[clamp(12px,1.1vw,24px)] font-extrabold uppercase tracking-[0.2em] opacity-70">{copy[key]}</div>
            </div>
          ))}
        </div>
      </div>
      {announced.event && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden" aria-live="polite" data-testid="live-event-caption" data-kind={announced.event.kind}>
          <div
            key={announced.event.key}
            className="mx-[2%] line-clamp-2 px-[0.3em] py-[0.1em] text-center leading-[0.95] font-bold uppercase text-ink"
            style={{ background: announced.event.kind === "connection" ? KIND_COLOR[announced.event.link] : PALETTE.sun, fontSize: "clamp(28px, 5vw, 120px)", overflowWrap: "anywhere", animation: reducedMotion ? undefined : "slam 4s cubic-bezier(.2,.9,.2,1) both" }}
          >
            {captionText(announced.event, locale)}
            {announced.dropped > 0 && <span className="ml-[0.4em] text-[0.4em]">{copy.events.more(formatNumber(locale, announced.dropped))}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
