import type { BadgeId } from "@/lib/badges/catalog";
import { Badge } from "./Badge";

// Five badges on a dashed shelf, each rotated 3–6 degrees (README "repisa").
const TILTS = [-6, 5, -4, 6, -5] as const;

type Props = { ids: BadgeId[]; size?: number };

export function BadgeShelf({ ids, size = 54 }: Props) {
  return (
    <span
      className="flex items-end justify-between px-[2px] pt-1"
      style={{ borderBottom: "2.5px dashed rgba(30,27,46,0.3)" }}
    >
      {ids.slice(0, 5).map((id, index) => (
        <span key={id} className="block" style={{ transform: `rotate(${TILTS[index] ?? 0}deg)` }}>
          <Badge id={id} size={size} />
        </span>
      ))}
    </span>
  );
}
