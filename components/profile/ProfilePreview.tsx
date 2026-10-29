"use client";

import { useState } from "react";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { Segmented } from "@/components/ui/Segmented";
import { Muted, SectionLabel } from "@/components/ui/Text";
import type { MeT } from "@/lib/api/schemas";
import { networks, profile, visibility as copy } from "@/lib/copy/es";
import { NETWORK_ORDER } from "@/components/brand/NetworkIcon";
import type { Links, VisibilitySettings } from "@/lib/profile-fields";
import { toCard, type Relation } from "@/lib/visibility";
import { SocialLinks } from "./SocialLinks";

type Draft = { name: string; headline: string; company: string; city: string; links: Links; visibility: VisibilitySettings };
type Props = { me: MeT; draft: Draft };
type View = Exclude<Relation, "self">;

const VIEWS = [
  { value: "public", label: copy.before },
  { value: "connected", label: copy.after },
] as const satisfies readonly { value: View; label: string }[];

// What becomes visible only after connecting, named for the "Al conectar también verán" line.
function unlockedItems(before: ReturnType<typeof toCard>, after: ReturnType<typeof toCard>): string[] {
  const fields = [
    !before.headline && after.headline ? profile.role : null,
    !before.company && after.company ? profile.company : null,
  ];
  const links = NETWORK_ORDER.filter((key) => !before.links?.[key] && after.links?.[key]).map((key) => networks[key]);
  return [...fields, ...links].filter((item): item is string => item !== null);
}

// Live preview of the profile as someone else sees it, before and after the connection is accepted.
// It runs the same toCard filter as the server, so what it shows is what others get.
export function ProfilePreview({ me, draft }: Props) {
  const [view, setView] = useState<View>("public");
  const source = {
    ...me,
    ...draft,
    headline: draft.headline || null,
    company: draft.company || null,
    city: draft.city || null,
    avatar: me.avatar ?? null,
    interests: me.interests ?? [],
  };
  const before = toCard(source, "public");
  const after = toCard(source, "connected");
  const card = view === "public" ? before : after;
  const unlocked = unlockedItems(before, after);
  return (
    <section aria-label={copy.previewLabel} className="flex flex-col gap-[10px] rounded-button bg-paper px-[14px] py-3 border-ink" id="preview">
      <SectionLabel>{copy.previewTitle}</SectionLabel>
      <Segmented options={VIEWS} value={view} onChange={setView} label={copy.previewLabel} height={32} />
      <div className="flex flex-col gap-[10px] rounded-[14px] bg-white p-3 border-ink" data-testid={`preview-${view}`}>
        <span className="flex items-center gap-3">
          <Avatar person={avatarOf(card)} size={48} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-display text-[18px] font-bold">{card.name}</span>
            <Muted className="truncate text-[13px] font-bold">{[card.headline, card.company].filter(Boolean).join(" · ")}</Muted>
            {card.city && <Muted className="truncate text-[12px] font-bold">{card.city}</Muted>}
          </span>
        </span>
        {card.links ? <SocialLinks links={card.links} labelFor={(network) => network} /> : <Muted className="text-[12px] font-bold">{copy.noLinks}</Muted>}
      </div>
      <Muted className="text-[12px] font-bold">{unlocked.length ? copy.unlocks(unlocked.join(", ")) : copy.nothingLocked}</Muted>
    </section>
  );
}
