"use client";

import type { KeyboardEvent } from "react";
import { Icon, type IconName } from "@/components/icons";
import { linkFields, networks } from "@/lib/copy/es";
import type { LinkProblem } from "@/lib/links";

export const SHARED_NETWORKS = ["linkedin", "instagram", "whatsapp", "x"] as const;
export type SharedNetwork = (typeof SHARED_NETWORKS)[number];
export type SharedFlags = Record<SharedNetwork, boolean>;
export type SharedValues = Record<SharedNetwork, string>;
export type SharedProblems = Partial<Record<SharedNetwork, LinkProblem>>;

const STYLE: Record<SharedNetwork, { color: string; icon: IconName }> = {
  linkedin: { color: "#DDF1FF", icon: "linkedin" },
  instagram: { color: "#FFE3EA", icon: "instagram" },
  whatsapp: { color: "#DDF8EA", icon: "whatsapp" },
  x: { color: "#FFF3BF", icon: "x" },
};

type Props = {
  value: SharedFlags;
  onChange: (next: SharedFlags) => void;
  label: string;
  titles?: Partial<Record<SharedNetwork, string>>;
  // The handle of each network; an input appears under the row for every network that is on.
  values?: SharedValues;
  onValueChange?: (key: SharedNetwork, value: string) => void;
  // Called when the person leaves an input or presses Enter (my profile saves on each).
  onValueCommit?: (key: SharedNetwork) => void;
  problems?: SharedProblems;
  // Networks whose handle was just saved (my profile shows "Guardado").
  saved?: Partial<Record<SharedNetwork, boolean>>;
};

const inputId = (key: SharedNetwork) => `link-${key}`;

// Four 44 px icon toggles: on = tinted with a 2×2 shadow, off = white at 55 % (V2Perfil, V2MiPerfil).
// Turning one on reveals its handle input; the value is validated by lib/links.ts.
export function LinkToggles({ value, onChange, label, titles, values, onValueChange, onValueCommit, problems, saved }: Props) {
  const onKeyDown = (key: SharedNetwork) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.currentTarget.blur();
    onValueCommit?.(key);
  };
  const withInputs = values !== undefined && onValueChange !== undefined;
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label={label} className="grid grid-cols-4 gap-2">
        {SHARED_NETWORKS.map((key) => {
          const on = value[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              aria-label={networks[key]}
              aria-controls={withInputs ? inputId(key) : undefined}
              title={titles?.[key]}
              onClick={() => onChange({ ...value, [key]: !on })}
              className="box-border flex h-11 min-w-0 cursor-pointer items-center justify-center rounded-[12px] p-0 border-ink active:scale-95"
              style={{
                background: on ? STYLE[key].color : "#FFFFFF",
                opacity: on ? 1 : 0.55,
                boxShadow: on ? "2px 2px 0 #1E1B2E" : "0 0 0 #1E1B2E",
                transition: "background-color .2s ease, opacity .2s ease, box-shadow .2s ease, transform .16s cubic-bezier(.2,.8,.3,1)",
              }}
            >
              <Icon name={STYLE[key].icon} />
            </button>
          );
        })}
      </div>
      {withInputs &&
        SHARED_NETWORKS.filter((key) => value[key]).map((key) => {
          const problem = problems?.[key];
          const hint = problem ? linkFields.problem[problem] : saved?.[key] ? linkFields.saved : null;
          return (
            <div key={key} className="animate-fade-in flex min-w-0 flex-col gap-[4px]">
              <div className="flex items-center gap-2">
                <label htmlFor={inputId(key)} className="w-[72px] shrink-0 text-[12px] font-extrabold">
                  {networks[key]}
                </label>
                <input
                  id={inputId(key)}
                  name={inputId(key)}
                  type={key === "whatsapp" ? "tel" : "text"}
                  autoComplete="off"
                  autoCapitalize="none"
                  value={values[key]}
                  placeholder={linkFields.placeholder[key]}
                  aria-invalid={problem ? true : undefined}
                  aria-describedby={hint ? `${inputId(key)}-hint` : undefined}
                  onChange={(event) => onValueChange(key, event.target.value)}
                  onBlur={() => onValueCommit?.(key)}
                  onKeyDown={onKeyDown(key)}
                  className="box-border block h-11 min-w-0 flex-1 rounded-[12px] bg-white px-3 font-body text-[14px] font-bold text-ink outline-none placeholder:text-muted border-ink transition-shadow duration-200 focus:shadow-[0_0_0_4px_#6BE4A3]"
                />
              </div>
              {hint && (
                <span id={`${inputId(key)}-hint`} role={problem ? "alert" : "status"} className={`pl-[80px] text-[11px] font-extrabold ${problem ? "text-coral" : "text-muted"}`}>
                  {hint}
                </span>
              )}
            </div>
          );
        })}
    </div>
  );
}
