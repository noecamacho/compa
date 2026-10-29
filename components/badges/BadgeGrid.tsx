"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { Muted } from "@/components/ui/Text";
import type { BadgeStatusT } from "@/lib/api/schemas";
import { isSecret } from "@/lib/badges/catalog";
import { useCopy } from "@/components/LocaleProvider";
import type { Dictionary } from "@/lib/copy";
import { Badge, type BadgeState } from "./Badge";

type Filter = "all" | "earned" | "pending";

// The API sends Spanish earnedNote/progress labels; the screen builds both from the raw values so they follow the locale.
const subtitle = (status: BadgeStatusT, all: Dictionary): string => {
  const { badges: copy, badgeProgress } = all;
  if (status.earnedAt) return badgeProgress.earnedOn(new Date(status.earnedAt));
  if (isSecret(status.id) || !status.progress) return copy.secret;
  return copy.progress(status.progress.current, status.progress.total, badgeProgress.labels[status.id] ?? "");
};

const badgeState = (status: BadgeStatusT): BadgeState => {
  if (status.earnedAt) return "earned";
  return isSecret(status.id) ? "locked" : "pending";
};

type Props = { badges: BadgeStatusT[] };

// 10 Insignias: the 20 in a showcase of 3 columns (phone), 4 (tablet) or 5 (desktop); secret ones show no hint.
export function BadgeGrid({ badges }: Props) {
  const all = useCopy();
  const { badges: copy, badgeNames: names } = all;
  const [filter, setFilter] = useState<Filter>("all");
  const shown = badges.filter((status) => filter === "all" || (filter === "earned" ? Boolean(status.earnedAt) : !status.earnedAt));
  return (
    <>
      <div className="md:max-w-[480px]">
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
      </div>
      {/* Keyed by filter so the tiles rise again, staggered, when the filter changes. */}
      <div key={filter} className="mx-[-4px] mt-[-4px] grid flex-1 auto-rows-min grid-cols-3 gap-3 px-1 pt-1 pb-[30px] md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
        {shown.map((status, index) => {
          const earned = Boolean(status.earnedAt);
          const showBar = !earned && status.progress && !isSecret(status.id);
          return (
            <div
              key={status.id}
              className="animate-rise flex min-w-0 flex-col items-center gap-[6px] rounded-[18px] bg-white px-2 py-3 text-center border-ink shadow-hard-3"
              style={{ animationDelay: `${Math.min(index, 11) * 0.035}s` }}
            >
              <Badge id={status.id} size={64} state={badgeState(status)} tilted />
              <span className="text-[12px] leading-[1.2] font-extrabold">{names[status.id].name}</span>
              <Muted className="text-[11px] leading-[1.2] font-extrabold">{subtitle(status, all)}</Muted>
              {showBar && status.progress && (
                <span className="block h-[10px] w-full overflow-hidden rounded-[5px] bg-white" style={{ border: "2px solid #1E1B2E" }}>
                  <span
                    className="animate-fill block h-full bg-mint"
                    style={{ width: `${Math.min(100, (status.progress.current / status.progress.total) * 100)}%`, borderRight: status.progress.current ? "2px solid #1E1B2E" : "none" }}
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
