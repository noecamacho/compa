"use client";

import { useEffect, useState } from "react";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { LivePersonCard, type LivePersonCardT, type LiveSnapshotT } from "@/lib/api/schemas";
import { copyFor, formatNumber, type Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";

type LiveCopy = Dictionary["live"];

export type BoardRow = { rank: number; id: string; name: string; points: number; connections: number };

// The leaderboard comes from the snapshot already on screen: people arrive ranked (points, connections, check-in).
export function boardRows(snapshot: LiveSnapshotT): BoardRow[] {
  return snapshot.people.map((person, index) => ({ rank: index + 1, id: person.id, name: person.name, points: person.points, connections: person.connections }));
}

const PODIUM = ["#FFD93D", "#D5DCE6", "#F2A766"];

const panelClass = "flex min-h-0 flex-col gap-3 rounded-card bg-white p-4 border-ink shadow-hard-4 lg:p-[1.2vw]";
const titleClass = "m-0 font-display text-[22px] leading-[1.1] font-bold lg:text-[clamp(22px,1.6vw,36px)]";

type BoardProps = { rows: BoardRow[]; locale: Locale; onSelect: (id: string) => void };

export function LeaderboardPanel({ rows, locale, onSelect }: BoardProps) {
  const copy = copyFor(locale).live;
  return (
    <section aria-labelledby="live-board-title" className={panelClass}>
      <h2 id="live-board-title" className={titleClass}>
        {copy.leaderboard}
      </h2>
      {rows.length === 0 && <p className="m-0 text-[15px] font-extrabold text-muted">{copy.empty}</p>}
      <ol className="m-0 flex min-h-0 list-none flex-col gap-2 overflow-y-auto p-0 lg:gap-[0.8vh]">
        {rows.slice(0, 10).map((row) => (
          <li key={row.id} className="[&:nth-child(n+6)]:hidden sm:[&:nth-child(n+6)]:block">
            <button
              type="button"
              onClick={() => onSelect(row.id)}
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-button px-3 py-2 text-left text-ink border-ink shadow-hard-2 lg:py-[0.8vh]"
              style={{ background: PODIUM[row.rank - 1] ?? "#FFF6E5" }}
            >
              <span className="w-7 shrink-0 text-center font-display text-[20px] font-bold tabular-nums lg:text-[clamp(18px,1.3vw,30px)]">{row.rank}</span>
              <Avatar person={{ name: row.name }} size={36} />
              <span className="min-w-0 flex-1 truncate font-display text-[17px] font-bold lg:text-[clamp(16px,1.15vw,26px)]">{row.name}</span>
              <span className="shrink-0 text-[14px] font-extrabold tabular-nums lg:text-[clamp(14px,0.95vw,22px)]">
                {formatNumber(locale, row.points)} {copy.points}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

type PersonState = { id: string; card: LivePersonCardT | null; failed: boolean };

function usePersonCard(code: string, id: string): PersonState {
  const [state, setState] = useState<PersonState>({ id, card: null, failed: false });
  useEffect(() => {
    let active = true;
    fetch(`/api/e/${code}/live/people/${id}`, { cache: "no-store" })
      .then(async (response) => (response.ok ? LivePersonCard.parse(await response.json()) : null))
      .catch(() => null)
      .then((card) => active && setState({ id, card, failed: card === null }));
    return () => {
      active = false;
    };
  }, [code, id]);
  return state.id === id ? state : { id, card: null, failed: false };
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex flex-col rounded-button bg-paper px-3 py-2 border-ink">
      <span className="font-display text-[26px] leading-none font-bold tabular-nums lg:text-[clamp(24px,1.9vw,44px)]">{value}</span>
      <span className="text-[12px] font-extrabold lg:text-[clamp(12px,0.8vw,18px)]">{label}</span>
    </span>
  );
}

function PersonBody({ card, copy, locale }: { card: LivePersonCardT; copy: LiveCopy; locale: Locale }) {
  const person = card.card;
  const details = [person.headline, person.company, person.city].filter(Boolean).join(" · ");
  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar person={avatarOf(person)} size={72} shadow={3} />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className={titleClass}>{person.name}</h2>
          {details && <span className="text-[14px] font-extrabold text-muted lg:text-[clamp(14px,0.95vw,22px)]">{details}</span>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat value={formatNumber(locale, card.points)} label={copy.points} />
        <Stat value={formatNumber(locale, card.connections)} label={copy.personConnections} />
        <Stat value={`#${card.rank}`} label={copy.rank} />
      </div>
      {person.interests && person.interests.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {person.interests.slice(0, 6).map((interest) => (
            <li key={interest} className="rounded-chip bg-sky-soft px-3 py-1 text-[13px] font-extrabold border-ink">
              {interest}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type PersonProps = { code: string; id: string; locale: Locale; onClose: () => void };

// A5: public fields, event points, connection count and rank. The viewer is anonymous, so nothing else is sent.
export function PersonPanel({ code, id, locale, onClose }: PersonProps) {
  const copy = copyFor(locale).live;
  const { card, failed } = usePersonCard(code, id);
  return (
    <section aria-live="polite" className={panelClass}>
      {card ? <PersonBody card={card} copy={copy} locale={locale} /> : <p className="m-0 text-[15px] font-extrabold text-muted">{failed ? copy.stale : copy.loading}</p>}
      <button
        type="button"
        onClick={onClose}
        className="mt-auto flex min-h-11 cursor-pointer items-center justify-center rounded-button bg-white px-4 font-display text-[16px] font-bold text-ink border-ink shadow-hard-3"
      >
        {copy.close}
      </button>
    </section>
  );
}
