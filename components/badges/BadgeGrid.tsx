"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { Muted } from "@/components/ui/Text";
import { BADGES, isSecret, type BadgeId } from "@/lib/badges/catalog";
import { badges as copy } from "@/lib/copy/es";
import { Badge } from "./Badge";

type Filter = "all" | "earned" | "pending";

// One badge as the grid shows it: mine come with progress and the earned note; another person's are earned or not.
export type BadgeView = {
  id: BadgeId;
  earned: boolean;
  note: string | null;
  progress: { current: number; total: number; label: string } | null;
};

const subtitle = (badge: BadgeView): string => {
  if (badge.earned) return badge.note ?? "";
  if (isSecret(badge.id)) return copy.secret;
  if (!badge.progress) return "";
  return copy.progress(badge.progress.current, badge.progress.total, badge.progress.label);
};

type Props = { badges: BadgeView[] };

// 10 Insignias: the 20 in a 3-column showcase; secret ones show no hint.
export function BadgeGrid({ badges }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = badges.filter((badge) => filter === "all" || (filter === "earned" ? badge.earned : !badge.earned));
  return (
    <>
      <Segmented
        label={copy.filterLabel}
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: copy.filters.all },
          { value: "earned", label: copy.filters.earned },
          { value: "pending", label: copy.filters.pending },
        ]}
      />
      {/* Keyed by filter so the tiles rise again, staggered, when the filter changes. */}
      <ul key={filter} aria-label={copy.filters[filter]} className="m-0 mx-[-4px] mt-[-4px] grid flex-1 list-none grid-cols-3 gap-3 px-1 pt-1 pb-[30px]">
        {shown.map((badge, index) => {
          const showBar = !badge.earned && badge.progress && !isSecret(badge.id);
          return (
            <li
              key={badge.id}
              data-badge={badge.id}
              data-earned={badge.earned ? "1" : "0"}
              className="animate-rise flex min-w-0 flex-col items-center gap-[6px] rounded-[18px] bg-white px-2 py-3 text-center border-ink shadow-hard-3"
              style={{ animationDelay: `${Math.min(index, 11) * 0.035}s` }}
            >
              <Badge id={badge.id} size={64} state={badge.earned ? "earned" : "locked"} tilted />
              <span className="text-[12px] leading-[1.2] font-extrabold">{BADGES[badge.id].name}</span>
              <Muted className="text-[11px] leading-[1.2] font-extrabold">{subtitle(badge)}</Muted>
              {showBar && badge.progress && (
                <span
                  role="progressbar"
                  aria-label={BADGES[badge.id].name}
                  aria-valuemin={0}
                  aria-valuemax={badge.progress.total}
                  aria-valuenow={badge.progress.current}
                  className="block h-[10px] w-full overflow-hidden rounded-[5px] bg-white"
                  style={{ border: "2px solid #1E1B2E" }}
                >
                  <span
                    className="animate-fill block h-full bg-mint"
                    style={{ width: `${Math.min(100, (badge.progress.current / badge.progress.total) * 100)}%`, borderRight: badge.progress.current ? "2px solid #1E1B2E" : "none" }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
