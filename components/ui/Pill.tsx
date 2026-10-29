import type { CSSProperties, ReactNode } from "react";
import { TONE_BG, type Tone } from "./Card";

type Props = {
  children: ReactNode;
  tone?: Tone;
  rotate?: number;
  // "display": Fredoka 700 12, height 28, radius 9, shadow 2 (EN VIVO, +50). "text": Nunito 800, height 30–34, radius 10–11.
  kind?: "display" | "text";
  height?: number;
  shadow?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function Pill({ children, tone = "white", rotate = 0, kind = "display", height, shadow = true, className, style }: Props) {
  const font = kind === "display" ? "font-display text-[12px] font-bold" : "font-body text-[13px] font-extrabold";
  const radius = kind === "display" ? 9 : 11;
  return (
    <span
      className={`box-border inline-flex items-center justify-center gap-1.5 px-[10px] leading-none select-none text-ink whitespace-nowrap border-ink ${font} ${shadow ? "shadow-hard-2" : ""} ${className ?? ""}`}
      style={{
        height: height ?? (kind === "display" ? 28 : 32),
        borderRadius: radius,
        background: TONE_BG[tone],
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
