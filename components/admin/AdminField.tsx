import type { InputHTMLAttributes, ReactNode } from "react";

const CONTROL =
  "box-border block w-full rounded-[12px] bg-white px-3 font-body text-[16px] font-bold text-ink outline-none border-ink transition-shadow duration-200 focus:shadow-[0_0_0_4px_#6BE4A3] md:text-[14px]";
export const CONTROL_INVALID = "!border-coral focus:!shadow-[0_0_0_4px_#FFE1D9]";

type Props = { id: string; label: string; error?: string | null; hint?: string; children: (aria: Record<string, string | boolean | undefined>, className: string) => ReactNode };

// Label + control + inline error/hint wired with aria-describedby. Font is 16 px on phones so iOS never zooms on focus.
export function AdminField({ id, label, error, hint, children }: Props) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  const aria = { "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };
  return (
    <div className="flex min-w-0 flex-col gap-[5px]">
      <label htmlFor={id} className="text-[13px] font-extrabold md:text-[12px]">
        {label}
      </label>
      {children(aria, `${CONTROL} ${error ? CONTROL_INVALID : ""}`)}
      {hint && !error && (
        <p id={`${id}-hint`} className="m-0 text-[12px] font-bold text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="m-0 flex items-center gap-1 text-[12px] font-extrabold">
          <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[10px] font-bold">
            !
          </span>
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & { id: string; label: string; error?: string | null; hint?: string };

export function AdminInput({ id, label, error, hint, ...rest }: InputProps) {
  return (
    <AdminField id={id} label={label} error={error} hint={hint}>
      {(aria, className) => <input id={id} className={`${className} h-11`} {...aria} {...rest} />}
    </AdminField>
  );
}
