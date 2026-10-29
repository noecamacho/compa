import Image from "next/image";
import { landing } from "@/lib/copy/es";

type Props = { size?: "md" | "lg"; variant?: "inline" | "stacked" | "mark" };

const MARK = { src: "/brand/compa-mark.png", width: 1024, height: 1002 } as const;
const STACKED = { src: "/brand/compa-logo.png", width: 925, height: 1024 } as const;

// The official COMPA logo (design/brand): two interlocking speech bubbles, with the wordmark beside or below.
export function Logo({ size = "md", variant = "inline" }: Props) {
  const large = size === "lg";
  if (variant === "stacked") {
    return <Image src={STACKED.src} width={STACKED.width} height={STACKED.height} alt={landing.brand} className={large ? "h-auto w-[220px]" : "h-auto w-[150px]"} priority />;
  }
  const mark = (
    <Image src={MARK.src} width={MARK.width} height={MARK.height} alt={variant === "mark" ? landing.brand : ""} aria-hidden={variant === "mark" ? undefined : true} className={large ? "h-12 w-auto" : "h-10 w-auto"} priority />
  );
  if (variant === "mark") return mark;
  return (
    <span className="flex items-center gap-[10px]">
      {mark}
      <span className={`font-display leading-none font-bold tracking-[-0.5px] ${large ? "text-[34px]" : "text-[30px]"}`}>{landing.brand}</span>
    </span>
  );
}
