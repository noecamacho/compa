import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string };

// Labelled input: 44 high, radius 12, border 2.5, mint focus ring (V2Perfil).
export function Field({ id, label, className, ...rest }: Props) {
  return (
    <div className={`flex min-w-0 flex-col gap-[5px] ${className ?? ""}`}>
      <label htmlFor={id} className="text-[12px] font-extrabold">
        {label}
      </label>
      <input
        id={id}
        className="box-border block h-11 w-full rounded-[12px] bg-white px-3 font-body text-[14px] font-bold text-ink outline-none border-ink focus:shadow-[0_0_0_4px_#6BE4A3]"
        {...rest}
      />
    </div>
  );
}
