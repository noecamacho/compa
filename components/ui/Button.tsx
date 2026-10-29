"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useHydrated } from "./useHydrated";

type Variant = "primary" | "secondary" | "linkedin" | "ink";

const VARIANT_STYLE: Record<Variant, { background: string; color: string }> = {
  primary: { background: "#6BE4A3", color: "#1E1B2E" },
  secondary: { background: "#FFFFFF", color: "#1E1B2E" },
  linkedin: { background: "#0A66C2", color: "#FFFFFF" },
  ink: { background: "#1E1B2E", color: "#FFF6E5" },
};

type Look = {
  variant?: Variant;
  // 54 px main button (README); 46 px for secondary rows; 56 on the welcome screen.
  height?: number;
  className?: string;
};

const classesFor = (className?: string) =>
  `box-border flex w-full cursor-pointer items-center justify-center gap-2 rounded-button px-5 font-display text-[16px] font-bold whitespace-nowrap border-ink shadow-hard-4 pressable disabled:cursor-default disabled:opacity-60 ${className ?? ""}`;

const styleFor = ({ variant = "secondary", height = 54 }: Look) => ({ height, ...VARIANT_STYLE[variant] });

type LinkProps = Look & { href: string; children: ReactNode };

// Main button: full width, radius 16, border 2.5, hard shadow 4×4, Fredoka 700 16 (README).
export function ButtonLink({ href, children, className, ...look }: LinkProps) {
  return (
    <Link href={href} className={classesFor(className)} style={styleFor(look)}>
      {children}
    </Link>
  );
}

type ButtonProps = Look & ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

// A tap before React has hydrated does nothing, so the button reads as disabled (no visual change) until then.
export function Button({ variant, height, className, children, ...rest }: ButtonProps) {
  const hydrated = useHydrated();
  return (
    <button type="button" className={classesFor(className)} style={styleFor({ variant, height })} aria-disabled={hydrated ? undefined : true} {...rest}>
      {children}
    </button>
  );
}
