"use client";

import { HIT_AREA } from "./hit-area";
import { useHydrated } from "./useHydrated";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  // 40 px segments (welcome, connect, badges) or 34 px (ranking).
  height?: number;
};

const GAP = 4;
const EASE = "cubic-bezier(.34,1.3,.5,1)";

// White tray with 4 px padding and an ink pill that slides to the active option (V2Bienvenida, V2Conectar, V2Ranking, V2Insignias).
export function Segmented<T extends string>({ options, value, onChange, label, height = 40 }: Props<T>) {
  const count = options.length;
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const hydrated = useHydrated();
  return (
    <div
      role="group"
      aria-label={label}
      className="relative grid rounded-button bg-white p-1 border-ink shadow-hard-3"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`, gap: GAP }}
    >
      <span
        aria-hidden="true"
        className="absolute top-1 left-1 rounded-chip bg-ink"
        style={{
          height,
          width: `calc((100% - ${8 + (count - 1) * GAP}px) / ${count})`,
          transform: `translateX(calc(${activeIndex} * (100% + ${GAP}px)))`,
          transition: `transform .4s ${EASE}`,
        }}
      />
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            aria-disabled={hydrated ? undefined : true}
            onClick={() => onChange(option.value)}
            className={`${HIT_AREA} z-[1] cursor-pointer rounded-chip border-0 bg-transparent font-display font-bold`}
            style={{
              height,
              fontSize: height >= 40 ? 15 : 14,
              color: on ? "#FFF6E5" : "#1E1B2E",
              transition: "color .25s ease",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
