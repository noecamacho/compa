"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Avatar } from "@/components/monito/Avatar";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import type { LiveSnapshotT, MeT } from "@/lib/api/schemas";
import { useCopy, useLocale } from "@/components/LocaleProvider";
import { formatHour, formatPoints } from "@/lib/format";
import type { MonitoLook } from "@/lib/monito/look";

type Pair = { a: { name: string; look?: MonitoLook }; b: { name: string; look?: MonitoLook } };

const SPARKS: { color: string; icon: IconName }[] = [
  { color: "#FFD93D", icon: "bolt" },
  { color: "#6BE4A3", icon: "plus" },
  { color: "#FF8FAB", icon: "heart" },
];

// The last three accepted pairs rise one after another (README: 7.5 s loop).
function pairsFrom(snapshot: LiveSnapshotT, looks: Map<string, MonitoLook | undefined>): Pair[] {
  const byId = new Map(snapshot.people.map((person) => [person.id, person]));
  return snapshot.connections
    .slice(-3)
    .reverse()
    .flatMap((link) => {
      const a = byId.get(link.a);
      const b = byId.get(link.b);
      return a && b ? [{ a: { name: a.name, look: looks.get(a.id) }, b: { name: b.name, look: looks.get(b.id) } }] : [];
    });
}

const first = (name: string) => name.split(" ")[0] ?? name;

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

type Props = { snapshot: LiveSnapshotT; me: MeT; endsAt: string; looks: Map<string, MonitoLook | undefined>; empty: boolean };

export function LiveCard({ snapshot, me, endsAt, looks, empty }: Props) {
  const { common, home } = useCopy();
  const locale = useLocale();
  const pairs = pairsFrom(snapshot, looks);
  const rank = me.scores?.event.rank ?? null;
  const points = me.scores?.event.points ?? 0;
  return (
    <Card tone="sky" className="flex flex-col gap-[10px] px-4 pt-[14px] pb-4">
      <div className="flex items-center justify-between">
        <Pill tone="coral" rotate={-2}>
          <span className="animate-beat h-2 w-2 rounded-full bg-white" style={{ border: "1.5px solid #1E1B2E" }} />
          {common.live}
        </Pill>
        <span className="text-[13px] font-extrabold">{home.until(snapshot.event.name, formatHour(locale, endsAt))}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[44px] leading-none font-bold">{snapshot.counters.connections}</span>
        <span className="font-display text-[18px] font-semibold">{home.connectionsTonight}</span>
      </div>
      <div role="img" aria-label={home.pairsNow} className="relative h-[150px] overflow-hidden rounded-button bg-sky-soft border-ink">
        {pairs.map((pair, index) => (
          <span
            key={`${pair.a.name}-${pair.b.name}`}
            className="animate-pair absolute right-0 left-0 flex items-center justify-center gap-[6px] opacity-0"
            style={{ top: 16 + index * 42, animationDelay: `${index * 2.5}s` }}
          >
            <Avatar person={pair.a} size={36} />
            <span
              className="animate-spark inline-flex h-[26px] w-[26px] items-center justify-center rounded-full"
              style={{ background: SPARKS[index]?.color, border: "2px solid #1E1B2E" }}
            >
              <Icon name={SPARKS[index]?.icon ?? "bolt"} size={12} strokeWidth={3} />
            </span>
            <Avatar person={pair.b} size={36} />
            <span className="ml-[6px] text-[12px] font-extrabold whitespace-nowrap">{home.pair(first(pair.a.name), first(pair.b.name))}</span>
          </span>
        ))}
      </div>
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
