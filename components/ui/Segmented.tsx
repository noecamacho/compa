"use client";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  // 40 px segments (welcome, connect, badges) or 34 px (ranking).
  height?: number;
};

// White tray with 4 px padding and ink pill for the active option (V2Bienvenida, V2Conectar, V2Ranking, V2Insignias).
export function Segmented<T extends string>({ options, value, onChange, label, height = 40 }: Props<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1 rounded-button bg-white p-1 border-ink shadow-hard-3"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className="cursor-pointer rounded-chip border-0 font-display font-bold"
            style={{
              height,
              fontSize: height >= 40 ? 15 : 14,
              background: on ? "#1E1B2E" : "transparent",
              color: on ? "#FFF6E5" : "#1E1B2E",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
