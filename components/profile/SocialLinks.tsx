import { NETWORK_COLOR, NETWORK_ORDER, NetworkIcon } from "@/components/brand/NetworkIcon";
import { networks } from "@/lib/copy/es";
import type { Links } from "@/lib/profile-fields";

type Props = { links: Links; labelFor: (network: string) => string };

// Another person's visible links as labelled brand tiles (06 Confirmación, 08 PerfilOtro, the profile preview).
// `links` is already filtered by toCard, so this only draws what the viewer may see.
export function SocialLinks({ links, labelFor }: Props) {
  const shown = NETWORK_ORDER.filter((key) => links[key]);
  if (shown.length === 0) return null;
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-[10px] p-0">
      {shown.map((key) => (
        <li key={key} className="min-w-0">
          <a
            href={links[key]}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={labelFor(networks[key])}
            className="flex h-12 min-w-0 items-center gap-2 rounded-[14px] px-3 text-[14px] font-extrabold text-ink no-underline border-ink shadow-hard-2 pressable"
            style={{ background: NETWORK_COLOR[key].tint }}
          >
            <NetworkIcon network={key} size={22} />
            <span className="truncate">{networks[key]}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
