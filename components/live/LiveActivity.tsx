"use client";

import { Avatar } from "@/components/monito/Avatar";
import type { LiveSnapshotT } from "@/lib/api/schemas";
import { copyFor, formatNumber, formatTime, type Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { feed, pulse, recentCount, type BoardRow, type Mood } from "@/lib/live/live-model";

type LiveCopy = Dictionary["live"];

const KIND_COLOR = { new: "#6BE4A3", reconnection: "#FF8FAB" } as const;
const MOOD_TONE: Record<Mood, string> = {
  upcoming: "#DDF1FF",
  empty: "#FFFFFF",
  quiet: "#FFF3BF",
  steady: "#DDF8EA",
  rush: "#FF6B4A",
  ended: "#D5DCE6",
};

const panelClass = "flex min-h-0 flex-col gap-2 rounded-card bg-white p-4 border-ink shadow-hard-4 lg:gap-[0.8vh] lg:p-[1.2vw]";
const subtitleClass = "m-0 font-display text-[18px] leading-[1.1] font-bold lg:text-[clamp(18px,1.25vw,30px)]";

function moodText(mood: Mood, copy: LiveCopy, recent: string): string {
  if (mood === "rush") return copy.moodRush(recent);
  if (mood === "steady") return copy.moodSteady(recent);
  if (mood === "quiet") return copy.moodQuiet;
  if (mood === "empty") return copy.moodEmpty;
  return mood === "upcoming" ? copy.moodUpcoming : copy.moodEnded;
}

// The room's heartbeat: one bar per minute for the last half hour, the current minute in sun. Bars grow with a
// transform so the browser composites them; the global reduced-motion rule turns the transition off.
export function Pulse({ snapshot, mood, locale }: { snapshot: LiveSnapshotT; mood: Mood; locale: Locale }) {
  const copy = copyFor(locale).live;
  const bars = pulse(snapshot);
  const peak = Math.max(4, ...bars);
  const recent = formatNumber(locale, recentCount(snapshot));
  return (
    <div className="flex min-w-0 items-center gap-3" data-testid="live-pulse" data-mood={mood}>
      <svg role="img" aria-label={copy.pulseLabel} viewBox="0 0 300 48" preserveAspectRatio="none" className="h-10 w-[150px] shrink-0 overflow-visible lg:h-[clamp(40px,3.6vh,72px)] lg:w-[clamp(150px,11vw,260px)]">
        <line x1="0" y1="47" x2="300" y2="47" stroke="#1E1B2E" strokeWidth="2" />
        {bars.map((bar, index) => (
          <rect
            key={index}
            x={index * 10 + 1}
            y={2}
            width={8}
            height={44}
            rx={2}
            fill={index === bars.length - 1 ? "#FFD93D" : "#6BE4A3"}
            stroke="#1E1B2E"
            strokeWidth={bar > 0 ? 1.5 : 0}
            style={{ transform: `scaleY(${bar / peak})`, transformBox: "fill-box", transformOrigin: "bottom", transition: "transform 400ms ease-out" }}
          />
        ))}
      </svg>
      <span
        role="status"
        className={`min-w-0 rounded-chip px-3 py-1 text-[13px] font-extrabold border-ink shadow-hard-2 lg:text-[clamp(13px,1.15vw,28px)] ${mood === "rush" ? "animate-beat" : ""}`}
        style={{ background: MOOD_TONE[mood] }}
      >
        {moodText(mood, copy, recent)}
      </span>
    </div>
  );
}

const ago = (locale: Locale, at: string, now: string): string => {
  const minutes = Math.round((Date.parse(at) - Date.parse(now)) / 60_000);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" }).format(Math.min(0, minutes), "minute");
};

// The latest connections as "Ana ⇄ Luis": names only, never what they talked about (p. 13). New items rise in.
export function Feed({ snapshot, locale, limit }: { snapshot: LiveSnapshotT; locale: Locale; limit: number }) {
  const copy = copyFor(locale).live;
  const items = feed(snapshot, limit);
  return (
    <section aria-labelledby="live-feed-title" className={panelClass} data-testid="live-feed">
      <h2 id="live-feed-title" className={subtitleClass}>
        {copy.feedTitle}
      </h2>
      {items.length === 0 && <p className="m-0 text-[14px] font-extrabold text-muted lg:text-[clamp(14px,0.9vw,20px)]">{copy.feedEmpty}</p>}
      <ol aria-live="polite" className="m-0 flex list-none flex-col gap-1.5 p-0 lg:gap-[0.6vh]">
        {items.map((item) => (
          <li key={item.id} className="flex min-w-0 animate-rise items-center gap-2 text-[14px] font-extrabold lg:text-[clamp(14px,1.2vw,28px)]">
            <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full border-ink" style={{ background: KIND_COLOR[item.kind] }} />
            <span className="sr-only">{copy.feedItem(item.a, item.b)}</span>
            <span aria-hidden="true" className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="min-w-0 truncate">{item.a}</span>
              <span className="shrink-0">⇄</span>
              <span className="min-w-0 truncate">{item.b}</span>
            </span>
            <span className="shrink-0 text-[12px] text-ink/70 tabular-nums lg:text-[clamp(12px,0.95vw,22px)]">{ago(locale, item.at, snapshot.generatedAt)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

type CardProps = { title: string; body: string; tone: string; testId: string };

// Centered over the loom when it has nothing (or nothing more) to draw: before doors open, an empty room, the close.
export function StateCard({ title, body, tone, testId }: CardProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4" data-testid={testId}>
      <div className="max-w-[min(92%,640px)] animate-rise rounded-card px-5 py-4 text-center border-ink shadow-hard-4 lg:px-[2vw] lg:py-[2vh]" style={{ background: tone }}>
        <p className="m-0 font-display text-[26px] leading-[1.1] font-bold lg:text-[clamp(26px,2.4vw,60px)]">{title}</p>
        <p className="m-0 mt-2 text-[15px] font-extrabold lg:text-[clamp(15px,1.1vw,26px)]">{body}</p>
      </div>
    </div>
  );
}

export function stateCardFor(mood: Mood, snapshot: LiveSnapshotT, locale: Locale): CardProps | null {
  const copy = copyFor(locale).live;
  if (mood === "upcoming") return { title: copy.upcomingTitle(formatTime(locale, snapshot.event.startsAt)), body: copy.upcomingBody, tone: "#DDF1FF", testId: "live-upcoming" };
  if (mood === "ended") {
    const body = copy.endedBody(formatNumber(locale, snapshot.counters.checkedIn), formatNumber(locale, snapshot.counters.connections));
    return { title: copy.endedTitle, body, tone: "#FFF3BF", testId: "live-ended" };
  }
  if (mood !== "empty") return null;
  if (snapshot.people.length === 0) return { title: copy.nobodyTitle, body: copy.nobodyBody, tone: "#FFFFFF", testId: "live-empty" };
  return { title: copy.emptyTitle, body: copy.emptyBody, tone: "#FFFFFF", testId: "live-empty" };
}

const PODIUM_STEPS = [
  { place: 1, color: "#FFD93D", height: "h-[86px] lg:h-[clamp(86px,11vh,170px)]", order: "order-2" },
  { place: 2, color: "#D5DCE6", height: "h-[62px] lg:h-[clamp(62px,8vh,124px)]", order: "order-1" },
  { place: 3, color: "#F2A766", height: "h-[46px] lg:h-[clamp(46px,6vh,92px)]", order: "order-3" },
] as const;

// The close: the top three on steps (first in the middle), ties shown as shared places.
export function Podium({ rows, locale, onSelect }: { rows: BoardRow[]; locale: Locale; onSelect: (id: string) => void }) {
  const copy = copyFor(locale).live;
  return (
    <section aria-labelledby="live-podium-title" className={panelClass} data-testid="live-podium">
      <h2 id="live-podium-title" className={subtitleClass}>
        {copy.podium}
      </h2>
      <ol className="m-0 grid list-none grid-cols-3 items-end gap-2 p-0">
        {PODIUM_STEPS.map((step, index) => {
          const row = rows[index];
          if (!row) return <li key={step.place} className={step.order} />;
          const tied = rows.some((other) => other.id !== row.id && other.rank === row.rank);
          return (
            <li key={row.id} className={`flex min-w-0 animate-podium flex-col items-center gap-1 ${step.order}`}>
              <button type="button" onClick={() => onSelect(row.id)} className="flex min-w-0 cursor-pointer flex-col items-center gap-1 text-ink">
                <Avatar person={{ name: row.name, photoUrl: row.photoUrl }} size={44} shadow={2} />
                <span className="line-clamp-2 w-full text-center font-display text-[14px] leading-tight font-bold break-words lg:text-[clamp(14px,1vw,24px)]">{row.name}</span>
                <span className="text-[12px] font-extrabold tabular-nums lg:text-[clamp(12px,0.85vw,20px)]">
                  {formatNumber(locale, row.points)} {copy.points}
                </span>
              </button>
              <span
                className={`flex w-full items-start justify-center rounded-t-[12px] pt-1 font-display text-[22px] font-bold border-ink lg:text-[clamp(22px,1.8vw,44px)] ${step.height}`}
                style={{ background: step.color }}
              >
                {row.rank}
                {tied && <span className="ml-1 self-center text-[11px] font-extrabold lg:text-[clamp(11px,0.7vw,16px)]">{copy.tie}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
