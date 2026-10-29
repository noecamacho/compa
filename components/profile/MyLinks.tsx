"use client";

import Link from "next/link";
import { useState } from "react";
import { NETWORK_COLOR, NETWORK_ORDER, NetworkIcon } from "@/components/brand/NetworkIcon";
import { Muted } from "@/components/ui/Text";
import { apiCall } from "@/lib/api/client";
import { VisibilitySettings, type VisibilitySettingsT } from "@/lib/api/schemas";
import { me as copy, networks } from "@/lib/copy/es";
import { linkInputValue } from "@/lib/links";
import type { LinkKey, Links, Visibility } from "@/lib/profile-fields";
import { VisibilityPicker } from "./VisibilityPicker";

type Props = { visibility: VisibilitySettingsT; links: Links };

// My links on 09 MiPerfil, each with who sees it; a change saves at once and rolls back if the save fails.
export function MyLinks({ visibility, links }: Props) {
  const [levels, setLevels] = useState(visibility.links);
  const filled = NETWORK_ORDER.filter((key) => links[key]);

  function change(key: LinkKey, level: Visibility) {
    const previous = levels;
    setLevels({ ...levels, [key]: level });
    void apiCall("PATCH", "/api/me/visibility", VisibilitySettings, { links: { [key]: level } }).catch(() => setLevels(previous));
  }

  if (filled.length === 0) {
    return (
      <span className="flex flex-col gap-2">
        <Muted className="text-[13px] font-bold">{copy.linksEmpty}</Muted>
        <Link href="/onboarding/profile?from=me" className="self-start text-[14px] font-extrabold text-ink underline">
          {copy.linksAdd}
        </Link>
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {filled.map((key) => (
        <div key={key} className="flex flex-col gap-[6px]" data-testid={`my-link-${key}`}>
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="box-border flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border-ink" style={{ background: NETWORK_COLOR[key].tint }}>
              <NetworkIcon network={key} size={18} />
            </span>
            <span className="text-[14px] font-extrabold">{networks[key]}</span>
            <Muted className="min-w-0 truncate text-[13px] font-bold">{linkInputValue(key, links[key])}</Muted>
          </span>
          <VisibilityPicker item={networks[key]} value={levels[key]} onChange={(level) => change(key, level)} />
        </div>
      ))}
      <Link href="/onboarding/profile?from=me#preview" className="self-start text-[13px] font-extrabold text-ink underline">
        {copy.linksEdit}
      </Link>
    </div>
  );
}
