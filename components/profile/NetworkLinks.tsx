import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { confirmation as copy, networks } from "@/lib/copy/es";
import { SHARED_LINK_KEYS, type SharedLinkKey } from "@/lib/links";
import type { Links } from "@/lib/profile-fields";

export const NETWORK_STYLE: Record<SharedLinkKey, { color: string; icon: IconName; label: string }> = {
  linkedin: { color: "#DDF1FF", icon: "linkedin", label: networks.linkedin },
  instagram: { color: "#FFE3EA", icon: "instagram", label: networks.instagram },
  whatsapp: { color: "#DDF8EA", icon: "whatsapp", label: networks.whatsapp },
  x: { color: "#FFF3BF", icon: "x", label: networks.x },
};

const isShared = (key: string): key is SharedLinkKey => (SHARED_LINK_KEYS as readonly string[]).includes(key);

// The networks another person shares with me, as a row of icon buttons that open the real profile
// (V2Confirmacion, V2PerfilOtro). The API only sends links the owner turned on and only once we are connected.
export function sharedLinks(links: Links | undefined): [SharedLinkKey, string][] {
  return Object.entries(links ?? {}).flatMap(([key, url]) => (isShared(key) && url ? [[key, url] as [SharedLinkKey, string]] : []));
}

type Props = { links: [SharedLinkKey, string][]; ownerFirstName: string };

export function NetworkLinks({ links, ownerFirstName }: Props) {
  if (links.length === 0) return null;
  return (
    <div className="grid gap-[10px]" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
      {links.map(([key, url]) => {
        const style = NETWORK_STYLE[key];
        return (
          <Link
            key={key}
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={copy.linkLabel(style.label, ownerFirstName)}
            data-network={key}
            className="flex h-12 min-w-0 items-center justify-center rounded-[14px] border-ink shadow-hard-2 pressable"
            style={{ background: style.color }}
          >
            <Icon name={style.icon} size={24} />
          </Link>
        );
      })}
    </div>
  );
}
