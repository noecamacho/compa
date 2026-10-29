"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Pill } from "@/components/ui/Pill";
import type { LiveSnapshotT } from "@/lib/api/schemas";
import { copyFor, formatNumber, type Dictionary } from "@/lib/copy";
import { browserLocale, type Locale } from "@/lib/i18n";
import type { LoomData } from "./loom-scene";
import { LeaderboardPanel, PersonPanel, boardRows } from "./LivePanels";
import { useLiveSnapshot } from "./useLiveSnapshot";

const Loom = dynamic(() => import("./Loom"), { ssr: false });

type LiveCopy = Dictionary["live"];

type Props = { code: string; initial: LiveSnapshotT; qrSvg: string; joinUrl: string; locale: Locale };

const COUNTERS = [
  { key: "checkedIn", tone: "#DDF1FF" },
  { key: "connections", tone: "#FFF3BF" },
  { key: "newCount", tone: "#DDF8EA" },
  { key: "reconnections", tone: "#FFE3EA" },
] as const;

// Server picks from Accept-Language; the browser's own list (navigator.languages) refines it after hydration.
const noSubscription = () => () => {};

function useLocale(initial: Locale): Locale {
  return useSyncExternalStore(noSubscription, () => browserLocale() ?? initial, () => initial);
}

function Counters({ snapshot, copy, locale }: { snapshot: LiveSnapshotT; copy: LiveCopy; locale: Locale }) {
  return (
    <dl className="m-0 grid w-full grid-cols-2 gap-3 sm:grid-cols-4 md:w-auto md:flex-1 lg:flex-none lg:gap-[1vw]">
      {COUNTERS.map(({ key, tone }) => (
        <div key={key} className="flex flex-col-reverse rounded-[18px] px-4 py-2 border-ink shadow-hard-3 lg:min-w-[9vw] lg:px-[1vw] lg:py-[0.8vh]" style={{ background: tone }}>
          <dt className="text-[13px] font-extrabold lg:text-[clamp(13px,0.9vw,22px)]">{copy[key]}</dt>
          <dd className="m-0 font-display text-[32px] leading-none font-bold tabular-nums lg:text-[clamp(32px,3.2vw,76px)]">
            {formatNumber(locale, snapshot.counters[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function JoinQr({ qrSvg, joinUrl, copy }: { qrSvg: string; joinUrl: string; copy: LiveCopy }) {
  return (
    <figure className="m-0 hidden shrink-0 flex-col items-center gap-1 rounded-[18px] bg-sun p-2 border-ink shadow-hard-3 md:flex lg:p-[0.6vw]">
      <span
        role="img"
        aria-label={joinUrl}
        className="block h-[96px] w-[96px] rounded-[10px] bg-white p-1 border-ink lg:h-[clamp(96px,7.5vw,170px)] lg:w-[clamp(96px,7.5vw,170px)] [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <figcaption className="font-display text-[13px] font-bold lg:text-[clamp(13px,0.9vw,20px)]">{copy.scanToJoin}</figcaption>
    </figure>
  );
}

function Legend({ copy }: { copy: LiveCopy }) {
  const items = [
    { label: copy.legendNew, color: "#6BE4A3" },
    { label: copy.legendReconnection, color: "#FF8FAB" },
  ];
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 rounded-chip bg-white px-3 py-1 text-[13px] font-extrabold border-ink shadow-hard-2 lg:text-[clamp(13px,0.9vw,20px)]">
          <span aria-hidden="true" className="h-[6px] w-6 rounded-full" style={{ background: item.color, outline: "2px solid #1E1B2E" }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

// The projected dashboard (API spec A5): the loom and the counters, a person's card on tap, the leaderboard otherwise.
// Built for 1920×1080 at 10 m; fluid down to a 1280 laptop, an 834 tablet and a 390 phone.
export function LiveBoard({ code, initial, qrSvg, joinUrl, locale: serverLocale }: Props) {
  const locale = useLocale(serverLocale);
  const copy = copyFor(locale).live;
  const { snapshot, stale } = useLiveSnapshot(code, initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const rows = useMemo(() => boardRows(snapshot), [snapshot]);
  const data: LoomData = useMemo(() => ({ people: snapshot.people, links: snapshot.connections }), [snapshot]);
  const selected = selectedId && rows.some((row) => row.id === selectedId) ? selectedId : null;

  return (
    <main lang={locale} className="paper-dots flex min-h-dvh w-full flex-col gap-4 overflow-x-hidden px-4 py-4 sm:px-6 lg:h-dvh lg:gap-[1.6vh] lg:px-[2vw] lg:py-[2vh]">
      <header className="flex flex-wrap items-center gap-3 lg:flex-nowrap lg:gap-[1.5vw]">
        <div className="flex min-w-0 flex-1 basis-full flex-col gap-1 lg:basis-auto">
          <span className="flex items-center gap-2">
            <span className="font-display text-[22px] leading-none font-bold lg:text-[clamp(22px,1.7vw,40px)]">compa</span>
            {snapshot.event.isRunning && (
              <Pill tone="coral" rotate={-2}>
                <span className="animate-beat h-2 w-2 rounded-full bg-white" style={{ border: "1.5px solid #1E1B2E" }} />
                {copy.live}
              </Pill>
            )}
          </span>
          <h1 className="m-0 truncate font-display text-[28px] leading-[1.05] font-bold lg:text-[clamp(28px,2.6vw,64px)]">{snapshot.event.name}</h1>
        </div>
        <Counters snapshot={snapshot} copy={copy} locale={locale} />
        <JoinQr qrSvg={qrSvg} joinUrl={joinUrl} copy={copy} />
      </header>

      <div className="grid min-h-0 gap-4 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_clamp(320px,26vw,520px)] lg:gap-[1.5vw]">
        <section className="relative aspect-square w-full sm:aspect-[4/3] lg:aspect-auto lg:h-full" aria-label={copy.vizLabel}>
          {unavailable ? (
            <p className="absolute inset-0 m-0 flex items-center justify-center p-6 text-center text-[16px] font-extrabold text-muted">{copy.noWebgl}</p>
          ) : (
            <Loom data={data} selectedId={selected} label={copy.vizLabel} onSelect={setSelectedId} onUnavailable={() => setUnavailable(true)} />
          )}
          {stale && (
            <span role="status" className="absolute top-2 right-2">
              <Pill tone="sun-soft">{copy.stale}</Pill>
            </span>
          )}
        </section>
        {selected ? (
          <PersonPanel code={code} id={selected} locale={locale} onClose={() => setSelectedId(null)} />
        ) : (
          <LeaderboardPanel rows={rows} locale={locale} onSelect={setSelectedId} />
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <Legend copy={copy} />
        <span className="text-[13px] font-extrabold text-muted lg:text-[clamp(13px,0.85vw,20px)]">{copy.hint}</span>
      </footer>
    </main>
  );
}
