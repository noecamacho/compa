"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useHydrated } from "./useHydrated";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pressed?: boolean;
  // Background when not pressed; pressed chips are ink on paper.
  background?: string;
  pressedBackground?: string;
  pressedColor?: string;
};

// Selectable chip: 34 high, radius 12, border 2.5, shadow 2×2, Nunito 800 13 (V2Registrar, V2Conexiones).
export function Chip({ children, pressed = false, background = "#FFFFFF", pressedBackground = "#1E1B2E", pressedColor = "#FFF6E5", className, style, ...rest }: Props) {
  const hydrated = useHydrated();
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-disabled={hydrated ? undefined : true}
      className={`hit-44 box-border inline-flex h-[34px] shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-[12px] px-3 font-body text-[13px] font-extrabold whitespace-nowrap border-ink shadow-hard-2 pressable ${className ?? ""}`}
      style={{ background: pressed ? pressedBackground : background, color: pressed ? pressedColor : "#1E1B2E", ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

type TagProps = { children: ReactNode; background?: string; className?: string };

// Static topic tag: 30 high, radius 10, border 2, Nunito 800 12 (V2Confirmacion, V2NotaVoz, V2Solicitud).
export function Tag({ children, background = "#FFFFFF", className }: TagProps) {
  return (
    <span
      className={`box-border inline-flex h-[30px] items-center rounded-[10px] px-[10px] font-body text-[12px] font-extrabold whitespace-nowrap ${className ?? ""}`}
      style={{ background, border: "2px solid #1E1B2E" }}
    >
      {children}
    </span>
  );
}
