"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { Chip } from "@/components/ui/Chip";
import { Muted } from "@/components/ui/Text";
import type { PersonHistoryT } from "@/lib/api/schemas";
import { connections as copy } from "@/lib/copy/es";

type PersonType = "new" | "reconnection" | "friend";
type Filter = "all" | PersonType;

const TYPE_STYLE: Record<PersonType, { color: string; icon: IconName }> = {
  new: { color: "#6BE4A3", icon: "userPlus" },
  reconnection: { color: "#6CC4FF", icon: "refresh" },
  friend: { color: "#FF8FAB", icon: "heart" },
};

const FILTERS: { key: Filter; color: string; text: string }[] = [
  { key: "all", color: "#1E1B2E", text: "#FFF6E5" },
  { key: "new", color: "#6BE4A3", text: "#1E1B2E" },
  { key: "reconnection", color: "#6CC4FF", text: "#1E1B2E" },
  { key: "friend", color: "#FF8FAB", text: "#1E1B2E" },
];

// Type falls back to the last meeting's kind when the API does not send it yet.
const typeOf = (entry: PersonHistoryT): PersonType => entry.type ?? (entry.meetings[0]?.kind === "reconnection" ? "reconnection" : "new");

type Props = { people: PersonHistoryT[] };

export function ConnectionList({ people }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = people.filter((entry) => filter === "all" || typeOf(entry) === filter);
  return (
    <>
      <div role="group" aria-label={copy.filterLabel} className="flex gap-2">
        {FILTERS.map(({ key, color, text }) => (
          <Chip key={key} pressed={filter === key} pressedBackground={color} pressedColor={text} onClick={() => setFilter(key)} className="px-[10px] text-[12px]">
            {copy.filters[key]}
          </Chip>
        ))}
      </div>
      {/* Keyed by filter so the rows rise again, staggered, every time the list changes. */}
      <div key={filter} className="flex flex-col gap-[10px]">
        {shown.length === 0 && <Muted className="animate-fade-in text-center text-[13px] font-bold">{copy.empty}</Muted>}
        {shown.map((entry, index) => {
          const type = typeOf(entry);
          return (
            <Link
              key={entry.person.id}
              href={`/people/${entry.person.handle}`}
              className="animate-rise flex items-center gap-3 rounded-[18px] bg-white px-[14px] py-[10px] border-ink shadow-hard-3 pressable"
              style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}
            >
              <Avatar person={avatarOf(entry.person)} size={46} />
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="truncate text-[15px] font-extrabold">{entry.person.name}</span>
                <Muted className="truncate text-[12px] font-bold">{(entry.topics ?? entry.person.interests ?? []).join(" · ")}</Muted>
              </span>
              <span
                title={copy.types[type]}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: TYPE_STYLE[type].color, border: "2px solid #1E1B2E" }}
              >
                <Icon name={TYPE_STYLE[type].icon} size={15} strokeWidth={2.8} role="img" aria-label={copy.types[type]} />
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
