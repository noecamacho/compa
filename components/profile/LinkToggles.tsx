"use client";

import { Icon, type IconName } from "@/components/icons";
import { networks } from "@/lib/copy/es";

export const SHARED_NETWORKS = ["linkedin", "instagram", "whatsapp", "x"] as const;
export type SharedNetwork = (typeof SHARED_NETWORKS)[number];
export type SharedFlags = Record<SharedNetwork, boolean>;

const STYLE: Record<SharedNetwork, { color: string; icon: IconName }> = {
  linkedin: { color: "#DDF1FF", icon: "linkedin" },
  instagram: { color: "#FFE3EA", icon: "instagram" },
  whatsapp: { color: "#DDF8EA", icon: "whatsapp" },
  x: { color: "#FFF3BF", icon: "x" },
};

type Props = { value: SharedFlags; onChange: (next: SharedFlags) => void; label: string; titles?: Partial<Record<SharedNetwork, string>> };

// Four 44 px icon toggles: on = tinted with a 2×2 shadow, off = white at 55 % (V2Perfil, V2MiPerfil).
export function LinkToggles({ value, onChange, label, titles }: Props) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-4 gap-2">
      {SHARED_NETWORKS.map((key) => {
        const on = value[key];
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            aria-label={networks[key]}
            title={titles?.[key]}
            onClick={() => onChange({ ...value, [key]: !on })}
            className="box-border flex h-11 min-w-0 cursor-pointer items-center justify-center rounded-[12px] p-0 border-ink"
            style={{ background: on ? STYLE[key].color : "#FFFFFF", opacity: on ? 1 : 0.55, boxShadow: on ? "2px 2px 0 #1E1B2E" : "none" }}
          >
            <Icon name={STYLE[key].icon} />
          </button>
        );
      })}
    </div>
  );
}
