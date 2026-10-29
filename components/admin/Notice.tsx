import type { ReactNode } from "react";

type Props = { tone: "error" | "success"; children: ReactNode; className?: string };

// Status line that never relies on colour alone: a mark plus text, on a soft tint with ink text (contrast holds).
// The region stays mounted so screen readers announce text changes.
export function Notice({ tone, children, className }: Props) {
  const isError = tone === "error";
  return (
    <div role={isError ? "alert" : "status"} aria-live={isError ? "assertive" : "polite"} className={className}>
      {children && (
        <p className={`m-0 flex items-start gap-2 rounded-[12px] px-3 py-2 text-[14px] font-extrabold border-ink ${isError ? "bg-coral-soft" : "bg-mint-soft"}`}>
          <span aria-hidden className={`mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${isError ? "bg-coral" : "bg-mint"}`}>
            {isError ? "!" : "✓"}
          </span>
          <span>{children}</span>
        </p>
      )}
    </div>
  );
}
