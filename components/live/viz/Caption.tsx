"use client";

import type { LiveEvent } from "@/lib/live/events";
import { copyFor, formatNumber } from "@/lib/copy";
import { browserLocale, type Locale } from "@/lib/i18n";
import { KIND_COLOR, PALETTE } from "./types";

type Props = { event: LiveEvent | null; dropped: number; reducedMotion: boolean; tone?: "paper" | "ink" };

const localeNow = (): Locale => browserLocale() ?? "es";

export function captionText(event: LiveEvent, locale: Locale): string {
  const copy = copyFor(locale).live.events;
  if (event.kind === "checkin") return copy.joined(event.name);
  if (event.kind === "connection") return `${event.aName} ⇄ ${event.bName}`;
  if (event.kind === "points") return copy.points(formatNumber(locale, event.gained), event.name);
  return copy.rank(event.name, formatNumber(locale, event.to));
}

const COLOR: Record<LiveEvent["kind"], string> = { checkin: PALETTE.sky, connection: KIND_COLOR.new, points: PALETTE.sun, rank: PALETTE.coral };

// Every new view says what just happened in words nobody can miss: "Ana ⇄ Luis", "+10 Ana", "Zoe is in". The sticker
// pops in and fades on its own (CSS), so a quiet room shows nothing. `key` restarts the animation per event.
export function Caption({ event, dropped, reducedMotion, tone = "paper" }: Props) {
  if (!event) return null;
  const locale = localeNow();
  const color = event.kind === "connection" && event.link === "reconnection" ? KIND_COLOR.reconnection : COLOR[event.kind];
  const dark = tone === "ink";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[6%] flex justify-center px-3" aria-live="polite" data-testid="live-event-caption" data-kind={event.kind}>
      <div
        key={event.key}
        className={`max-w-[92%] rounded-[18px] px-[0.7em] py-[0.25em] text-center font-display leading-[1.1] font-bold text-ink border-ink ${dark ? "shadow-hard-3" : "shadow-hard-3"}`}
        style={{ background: color, fontSize: "clamp(22px, 3.2vw, 72px)", animation: reducedMotion ? undefined : "caption-pop 4s ease-out both", overflowWrap: "anywhere" }}
      >
        {captionText(event, locale)}
        {dropped > 0 && <span className="ml-[0.5em] text-[0.5em] font-extrabold text-ink/70">{copyFor(locale).live.events.more(formatNumber(locale, dropped))}</span>}
      </div>
    </div>
  );
}
