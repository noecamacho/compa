import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const CLASSES =
  "box-border flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[14px] bg-white p-0 text-ink border-ink shadow-hard-3 pressable";

type LinkProps = { href: string; label: string; children: ReactNode; className?: string };

// 44×44 icon button with radius 14 and hard shadow 3×3 (README).
export function IconLink({ href, label, children, className }: LinkProps) {
  return (
    <Link href={href} aria-label={label} className={`${CLASSES} ${className ?? ""}`}>
      {children}
    </Link>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode };

export function IconButton({ label, children, className, ...rest }: ButtonProps) {
  return (
    <button type="button" aria-label={label} className={`${CLASSES} ${className ?? ""}`} {...rest}>
      {children}
    </button>
  );
}
