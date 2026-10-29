"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Muted, ProgressBar } from "@/components/ui/Text";
import { Tour } from "@/components/tour/Tour";
import type { LeaderboardScopeT, LeaderboardT, MeT } from "@/lib/api/schemas";
import { ranking as copy, tour } from "@/lib/copy/es";
import { firstName, formatPoints } from "@/lib/format";
import type { MonitoLook } from "@/lib/monito/look";

type Row = LeaderboardT["rows"][number];

type Props = { me: MeT; boards: Record<LeaderboardScopeT, LeaderboardT>; looks: Record<string, MonitoLook | undefined> };

const CONFETTI = [
  { left: 14, top: 30, color: "#FF8FAB", r: 20, delay: 0 },
  { left: 60, top: 90, color: "#6CC4FF", r: -30, delay: 0.4 },
  { right: 28, top: 40, color: "#FFD93D", r: 45, delay: 0.8 },
  { right: 80, top: 110, color: "#6BE4A3", r: -10, delay: 1.2 },
  { left: 150, top: 10, color: "#FF6B4A", r: 60, delay: 0.2 },
  { right: 140, top: 70, color: "#FF8FAB", r: -50, delay: 1 },
];

const BLOCKS: Record<1 | 2 | 3, { height: number; color: string; number: number; px: number }> = {
  1: { height: 150, color: "#FFD93D", number: 44, px: 6 },
  2: { height: 112, color: "#D5DCE6", number: 34, px: 5 },
  3: { height: 86, color: "#F2A766", number: 30, px: 5 },
};

function Column({ row, place, look, delay }: { row: Row | undefined; place: 1 | 2 | 3; look?: MonitoLook; delay: number }) {
  const block = BLOCKS[place];
  if (!row) return <span aria-hidden="true" />;
  return (
    <Link href={`/people/${row.handle}`} aria-label={`#${place} ${row.name}`} className="animate-podium flex min-w-0 flex-col items-center justify-end gap-[6px] tappable" style={{ animationDelay: `${delay}s` }}>
      {place === 1 && (
        <svg width="44" height="34" viewBox="0 0 44 34" aria-hidden="true" className="mb-[-6px]">
          <path d="M4 30 L2 8 L14 18 L22 2 L30 18 L42 8 L40 30 Z" fill="#FFD93D" stroke="#1E1B2E" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="22" cy="24" r="3" fill="#FF6B4A" stroke="#1E1B2E" strokeWidth="1.5" />
        </svg>
      )}
      <Avatar person={{ name: row.name, look }} px={block.px} />
      <span className="font-display font-bold" style={{ fontSize: place === 1 ? 18 : 16 }}>
        {firstName(row.name)}
      </span>
      <div
        className="flex w-full flex-col items-center gap-[2px] rounded-t-button pt-[10px]"
        style={{ height: block.height, background: block.color, border: "2.5px solid #1E1B2E", borderBottom: 0, boxShadow: "inset 0 6px 0 rgba(255,255,255,0.55)" }}
      >
        <span className="font-display leading-none font-bold" style={{ fontSize: block.number }}>
          {place}
        </span>
        <span className="font-display font-semibold" style={{ fontSize: place === 1 ? 15 : 14 }}>
          {formatPoints(row.points)}
        </span>
      </div>
    </Link>
  );
}

// 11 Ranking: podium with confetti, tonight / all year, my card with the gap to the next person.
export function RankingView({ me, boards, looks }: Props) {
  const [scope, setScope] = useState<LeaderboardScopeT>("event");
  const board = boards[scope];
  const [first, second, third] = board.rows;
  const mine = board.me;
  const pct = mine && mine.above ? Math.round((mine.points / mine.above.points) * 100) : 100;
  const sub = scope === "event" ? copy.tonightSub : copy.inEvents(me.stats?.events ?? 0);
  return (
    <>
      <div data-tour="scope">
        <Segmented
          label={copy.scopeLabel}
          value={scope}
          onChange={setScope}
          height={34}
          options={[
            { value: "event", label: copy.tonight },
            { value: "lifetime", label: copy.allYear },
          ]}
        />
      </div>
      {/* Keyed by scope so the podium rises again when switching tonight / all year. */}
      <div key={scope} className="relative grid h-[372px] grid-cols-3 items-end gap-2 px-1">
        {CONFETTI.map((piece, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="animate-confetti absolute h-[14px] w-[10px] rounded-[3px]"
            style={{ ...piece, background: piece.color, border: "2px solid #1E1B2E", animationDelay: `${piece.delay}s`, ["--r" as string]: `${piece.r}deg` }}
          />
        ))}
        <Column row={second} place={2} look={second && looks[second.userId]} delay={0.15} />
        <Column row={first} place={1} look={first && looks[first.userId]} delay={0} />
        <Column row={third} place={3} look={third && looks[third.userId]} delay={0.3} />
      </div>
      <span aria-hidden="true" className="mx-1 mt-[-12px] block h-0" style={{ borderTop: "3px solid #1E1B2E" }} />

      <div key={`you-${scope}`} data-tour="you" className="animate-rise mt-[2px] flex flex-col gap-[10px] rounded-[20px] bg-gum-soft px-[14px] py-3 shadow-hard-4" style={{ border: "3px solid #1E1B2E", animationDelay: ".2s" }}>
        <div className="flex items-center gap-3">
          <Avatar person={avatarOf(me)} size={50} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-display text-[24px] leading-none font-bold">{copy.youRank(mine?.rank ?? null)}</span>
            <Muted className="text-[13px] font-extrabold">{copy.youSub(formatPoints(mine?.points ?? 0), sub)}</Muted>
          </span>
        </div>
        {mine?.above ? (
          <div className="flex flex-col gap-[5px]">
            <span className="flex justify-between text-[13px] font-extrabold">
              <span>{copy.toPass(firstName(mine.above.name))}</span>
              <span>{copy.pointsShort(mine.gap)}</span>
            </span>
            <ProgressBar value={pct} color="#FFD93D" label={copy.toPass(firstName(mine.above.name))} />
            {mine.tip && <Muted className="text-[12px] font-extrabold">{mine.tip}</Muted>}
          </div>
        ) : (
          <Muted className="text-[12px] font-extrabold">{mine?.rank === 1 ? copy.first : copy.noRank}</Muted>
        )}
      </div>

      {mine?.above && (
        <Link href={`/people/${mine.above.handle}`} className="flex h-[46px] items-center gap-[10px] rounded-[14px] bg-white px-3 border-ink shadow-hard-2 pressable">
          <span className="w-[30px] font-display text-[15px] font-bold text-muted">#{mine.above.rank}</span>
          <Avatar person={{ name: mine.above.name, look: looks[mine.above.userId] }} size={30} />
          <span className="flex-1 truncate text-[14px] font-extrabold">{mine.above.name}</span>
          <Muted className="text-[13px] font-extrabold">{formatPoints(mine.above.points)}</Muted>
        </Link>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <ButtonLink href="/connect" variant="primary" height={50}>
          <Icon name="qr" size={18} />
          {copy.connectNow}
        </ButtonLink>
      </div>
      <Tour id="ranking" steps={tour.ranking} />
    </>
  );
}
