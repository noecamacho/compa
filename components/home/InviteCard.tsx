"use client";

import { Icon } from "@/components/icons";
import { Monito } from "@/components/monito/Monito";
import { Card } from "@/components/ui/Card";
import { Muted } from "@/components/ui/Text";
import type { InvitesT } from "@/lib/api/schemas";
import { useCopy } from "@/components/LocaleProvider";
import { GOLDEN_CAP, withDefaults } from "@/lib/monito/look";

const GOLDEN_LOOK = withDefaults({ ...GOLDEN_CAP, outfit: "compa", shirt: "#FFFFFF" });

type Props = { invites: InvitesT };

// "Invita 3 y gana la gorra dorada" with three progress circles (V2Inicio).
export function InviteCard({ invites }: Props) {
  const { home } = useCopy();
  const done = invites.invitees.length;
  const left = Math.max(0, invites.target - done);
  return (
    <Card href="/invite" tone="sun-soft" className="flex items-center gap-3 px-[14px] py-3">
      <span className="flex h-[72px] w-16 shrink-0 items-end justify-center rounded-[14px] bg-white pb-1" style={{ border: "2px solid #1E1B2E" }}>
        <Monito look={GOLDEN_LOOK} px={3} label={home.goldenCapLabel} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <span className="font-display text-[19px] leading-[1.1] font-bold">{home.inviteTitle}</span>
        <span className="text-[13px] font-extrabold">{invites.link.event ? home.invitePoints(invites.link.event.name) : home.inviteNoPoints}</span>
        <span className="flex items-center gap-[6px]" aria-label={home.inviteProgress(done, invites.target)}>
          {Array.from({ length: invites.target }, (_, index) => {
            const filled = index < done;
            return (
              <span
                key={index}
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{ background: filled ? "#FFD93D" : "#FFFFFF", border: filled ? "2px solid #1E1B2E" : "2px dashed #1E1B2E" }}
              >
                {filled && <Icon name="check" size={12} strokeWidth={3.5} />}
              </span>
            );
          })}
          <Muted className="ml-1 text-[11px] font-extrabold whitespace-nowrap">{home.inviteLeft(left)}</Muted>
        </span>
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white border-ink shadow-hard-2">
        <Icon name="share" size={18} />
      </span>
    </Card>
  );
}
