"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { Muted } from "@/components/ui/Text";
import type { BadgeStatusT } from "@/lib/api/schemas";
import { BADGES, isSecret } from "@/lib/badges/catalog";
import { badges as copy } from "@/lib/copy/es";
import { Badge } from "./Badge";

type Filter = "all" | "earned" | "pending";

const subtitle = (status: BadgeStatusT): string => {
  if (status.earnedAt) return status.earnedNote ?? "";
  if (isSecret(status.id) || !status.progress) return copy.secret;
  return copy.progress(status.progress.current, status.progress.total, status.progress.label);
};

type Props = { badges: BadgeStatusT[] };

// 10 Insignias: the 20 in a 3-column showcase; secret ones show no hint.
export function BadgeGrid({ badges }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = badges.filter((status) => filter === "all" || (filter === "earned" ? Boolean(status.earnedAt) : !status.earnedAt));
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
      <div className="mx-[-4px] mt-[-4px] grid flex-1 grid-cols-3 gap-3 px-1 pt-1 pb-[30px]">
        {shown.map((status) => {
          const earned = Boolean(status.earnedAt);
          const showBar = !earned && status.progress && !isSecret(status.id);
          return (
            <div key={status.id} className="flex min-w-0 flex-col items-center gap-[6px] rounded-[18px] bg-white px-2 py-3 text-center border-ink shadow-hard-3">
              <Badge id={status.id} size={64} state={earned ? "earned" : "locked"} tilted />
              <span className="text-[12px] leading-[1.2] font-extrabold">{BADGES[status.id].name}</span>
              <Muted className="text-[11px] leading-[1.2] font-extrabold">{subtitle(status)}</Muted>
              {showBar && status.progress && (
                <span className="block h-[10px] w-full overflow-hidden rounded-[5px] bg-white" style={{ border: "2px solid #1E1B2E" }}>
                  <span
                    className="block h-full bg-mint"
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
