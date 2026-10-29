import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export type Tone = "white" | "paper" | "mint" | "sky" | "gum" | "sun" | "coral" | "mint-soft" | "sky-soft" | "gum-soft" | "sun-soft" | "coral-soft" | "ink";

export const TONE_BG: Record<Tone, string> = {
  white: "#FFFFFF",
  paper: "#FFF6E5",
  mint: "#6BE4A3",
  sky: "#6CC4FF",
  gum: "#FF8FAB",
  sun: "#FFD93D",
  coral: "#FF6B4A",
  "mint-soft": "#DDF8EA",
  "sky-soft": "#DDF1FF",
  "gum-soft": "#FFE3EA",
  "sun-soft": "#FFF3BF",
  "coral-soft": "#FFE1D9",
  ink: "#1E1B2E",
};

type Props = {
  children: ReactNode;
  tone?: Tone;
  // "md": radius 22, shadow 4×4 (cards). "sm": radius 16–18, shadow 3×3 (small cards). "flat": no shadow.
  size?: "md" | "sm" | "flat";
  href?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  // Spotlight target for the guided tour (components/tour/Tour.tsx).
  "data-tour"?: string;
};

const SIZE_CLASS = {
  md: "rounded-card shadow-hard-4",
  sm: "rounded-[18px] shadow-hard-3",
  flat: "rounded-[16px]",
} as const;

export function Card({ children, tone = "white", size = "md", href, className, style, ariaLabel, "data-tour": dataTour }: Props) {
  const classes = `box-border block border-ink ${SIZE_CLASS[size]} ${className ?? ""}`;
  const merged = { background: TONE_BG[tone], ...style };
  if (href) {
    return (
      <Link href={href} className={classes} style={merged} aria-label={ariaLabel} data-tour={dataTour}>
        {children}
      </Link>
    );
  }
  return (
    <div className={classes} style={merged} aria-label={ariaLabel} data-tour={dataTour}>
      {children}
    </div>
  );
}
