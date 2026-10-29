import { landing } from "@/lib/copy/es";

type Props = { size?: "md" | "lg" };

// The speech-bubble mark and the wordmark (V2Bienvenida).
export function Logo({ size = "md" }: Props) {
  const large = size === "lg";
  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="relative flex h-10 w-[46px] items-center justify-center gap-2 rounded-[17px] bg-sun border-ink shadow-hard-3"
        style={{ transform: "rotate(-6deg)" }}
      >
        <span className="h-[10px] w-[7px] rounded-[4px] bg-ink" />
        <span className="h-[10px] w-[7px] rounded-[4px] bg-ink" />
        <span
          className="absolute bottom-[-10px] left-[10px] h-3 w-3 bg-sun"
          style={{ borderLeft: "2.5px solid #1E1B2E", borderBottom: "2.5px solid #1E1B2E", transform: "skewX(20deg)" }}
        />
      </span>
      <span className={`font-display leading-none font-bold tracking-[-0.5px] ${large ? "text-[34px]" : "text-[30px]"}`}>{landing.brand}</span>
    </span>
  );
}
