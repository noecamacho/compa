import type { CSSProperties, ReactNode } from "react";

type Props = { children: ReactNode; className?: string; style?: CSSProperties };

// Section label: 11 px, 800, uppercase, tracking 1.6 (README).
export const SectionLabel = ({ children, className, style }: Props) => (
  <span className={`label-caps ${className ?? ""}`} style={style}>
    {children}
  </span>
);

// Secondary grey text. `title` carries the full value when the text is truncated.
export const Muted = ({ children, className, style, title }: Props & { title?: string }) => (
  <span className={`text-muted ${className ?? ""}`} style={style} title={title}>
    {children}
  </span>
);

type StatProps = { value: ReactNode; label: string; size?: number };

// Big Fredoka number with a small grey label; three of them make a StatGrid (V2MiPerfil, V2PerfilOtro, V2Solicitud).
export function Stat({ value, label, size = 24 }: StatProps) {
  return (
    <div className="flex flex-col items-center gap-[2px] px-1 py-3">
      <span className="font-display leading-[1.1] font-bold" style={{ fontSize: size }}>
        {value}
      </span>
      <Muted className="text-[12px] font-bold">{label}</Muted>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 [&>*+*]:border-l-[1.5px] [&>*+*]:border-dashed [&>*+*]:border-ink/30">{children}</div>;
}

type ProgressProps = { value: number; color?: string; height?: number; label: string; max?: number };

// Bordered bar with a hard right edge on the fill (V2Insignias, V2Ranking).
export function ProgressBar({ value, color = "#6BE4A3", height = 14, label, max = 100 }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const border = height >= 14 ? 2.5 : 2;
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="block w-full overflow-hidden bg-white"
      style={{ height, borderRadius: height / 2, border: `${border}px solid #1E1B2E` }}
    >
      <span
        className="animate-fill block h-full"
        style={{ width: `${pct}%`, background: color, borderRight: pct > 0 ? `${border}px solid #1E1B2E` : "none", transition: "width .6s cubic-bezier(.2,.8,.3,1)" }}
      />
    </span>
  );
}
