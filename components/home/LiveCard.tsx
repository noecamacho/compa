"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import type { EventDoorT, LiveSnapshotT, MeT } from "@/lib/api/schemas";
import { useCopy, useLocale } from "@/components/LocaleProvider";
import { formatHour, formatPoints } from "@/lib/format";
import { fetchHomeSnapshot } from "@/lib/live/home-snapshot";
import { usePoll } from "@/lib/use-poll";

// The same rotating stage as the big screen (canvas, WebGL): browser only.
const LiveStage = dynamic(() => import("@/components/live/LiveStage"), { ssr: false });

// The card only has to keep moving; the projector's 3 s cadence would cost every phone the full snapshot that often.
const HOME_POLL_MS = 15_000;

// Shown instead of the live card when the person is not checked in anywhere (gap analysis U7).
export function OutsideEventCard() {
  const { tour } = useCopy();
  return (
    <Card tone="sky-soft" className="flex items-center gap-[14px] px-4 py-[14px]">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-button bg-white border-ink shadow-hard-2" style={{ transform: "rotate(-5deg)" }}>
        <Icon name="calendar" size={28} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <span className="font-display text-[19px] leading-[1.1] font-bold">{tour.outsideEvent.title}</span>
        <span className="text-[13px] leading-[1.35] font-bold text-muted">{tour.outsideEvent.body}</span>
      </span>
    </Card>
  );
}

// Read from the browser through the 1 s CDN cache of /api/e/{code}/live, never in the /home render (conference-scale
// finding 5). Null until the first answer; a failed poll keeps the last snapshot and backs off.
function useHomeSnapshot(code: string): LiveSnapshotT | null {
  const [snapshot, setSnapshot] = useState<LiveSnapshotT | null>(null);
  const tick = useCallback(
    async (signal: AbortSignal) => {
      const next = await fetchHomeSnapshot(code, signal);
      if (!next) throw new Error("home live poll failed");
      setSnapshot(next);
    },
    [code],
  );
  // The shared poller waits a full interval before its first tick; the card should not sit empty that long.
  useEffect(() => {
    const controller = new AbortController();
    fetchHomeSnapshot(code, controller.signal).then((next) => next && setSnapshot(next));
    return () => controller.abort();
  }, [code]);
  usePoll(tick, HOME_POLL_MS);
  return snapshot;
}

const ignoreSelect = () => {};

type Props = { event: EventDoorT; me: MeT; empty: boolean };

// The live visualization itself, sized for Home; one tap opens the full live view (counters, leaderboard, feed).
export function LiveCard({ event, me, empty }: Props) {
  const { common, home } = useCopy();
  const locale = useLocale();
  const snapshot = useHomeSnapshot(event.code);
  const rank = me.scores?.event.rank ?? null;
  const points = me.scores?.event.points ?? 0;
  const connections = snapshot?.counters.connections ?? event.counters.connections;
  return (
    <Card tone="sky" className="flex flex-col gap-[10px] px-4 pt-[14px] pb-4">
      <Link href={`/e/${event.code}/live`} aria-label={home.seeLiveLabel(event.name)} className="group flex flex-col gap-[10px] rounded-button" data-testid="home-live">
        <span className="flex items-center justify-between">
          <Pill tone="coral" rotate={-2}>
            <span className="animate-beat h-2 w-2 rounded-full bg-white" style={{ border: "1.5px solid #1E1B2E" }} />
            {common.live}
          </Pill>
          <span className="text-[13px] font-extrabold">{home.until(event.name, formatHour(locale, event.endsAt))}</span>
        </span>
        <span className="flex items-baseline gap-2">
          <span className="font-display text-[44px] leading-none font-bold">{connections}</span>
          <span className="font-display text-[18px] font-semibold">{home.connectionsTonight}</span>
        </span>
        <span className="pressable relative block h-[200px] overflow-hidden rounded-button bg-sky-soft border-ink shadow-hard-2 md:h-[240px] lg:h-[280px]">
          {/* Inert: the views' own controls (Race rows are buttons) must not be focus stops inside this link. */}
          <span inert className="absolute inset-0">
            {snapshot && <LiveStage snapshot={snapshot} selectedId={null} label={home.pairsNow} onSelect={ignoreSelect} locale={locale} />}
          </span>
          {/* Over the canvas so a tap opens the live view instead of selecting a person on the stage. */}
          <span aria-hidden="true" className="absolute inset-0" />
          <span className="absolute top-2 right-2 flex h-8 items-center gap-1 rounded-chip bg-sun pr-2 pl-3 text-[13px] font-extrabold border-ink shadow-hard-2 transition-transform group-hover:translate-x-[2px]">
            {home.seeLive}
            <Icon name="chevronRight" size={16} strokeWidth={3} />
          </span>
        </span>
      </Link>
      <Link
        href={empty ? "/connect" : "/ranking"}
        className="flex h-11 items-center gap-[10px] rounded-[14px] bg-white px-3 border-ink shadow-hard-2 pressable"
      >
        <Icon name="trophy" size={20} strokeWidth={2.4} />
        <span className="flex-1 text-[14px] font-extrabold">
          {empty || rank === null ? (
            home.firstConnection
          ) : (
            <>
              {home.rank(rank, formatPoints(locale, points))[0]}
              <span className="font-display text-[18px] font-bold">{home.rank(rank, formatPoints(locale, points))[1]}</span>
              {home.rank(rank, formatPoints(locale, points))[2]}
            </>
          )}
        </span>
        {/* The "▲ 1" delta pill of the mock needs rank history the API does not keep yet; only the +50 nudge is shown. */}
        {(empty || rank === null) && (
          <Pill tone="sun" rotate={5} height={24} shadow={false} className="px-[7px]" style={{ borderWidth: 2 }}>
            +50
          </Pill>
        )}
        <Icon name="chevronRight" size={16} strokeWidth={3} />
      </Link>
    </Card>
  );
}
