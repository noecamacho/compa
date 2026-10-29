import Link from "next/link";
import { BadgeShelf } from "@/components/badges/BadgeShelf";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/monito/Avatar";
import { MyLinkToggles } from "@/components/profile/MyLinkToggles";
import { Card } from "@/components/ui/Card";
import { IconLink } from "@/components/ui/IconButton";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { Muted, SectionLabel, Stat, StatGrid } from "@/components/ui/Text";
import { Me } from "@/lib/api/schemas";
import { apiGet } from "@/lib/api/server-fetch";
import { BADGE_IDS } from "@/lib/badges/catalog";
import { me as copy } from "@/lib/copy/es";
import { formatPoints } from "@/lib/format";

// 09 MiPerfil.
export default async function MePage() {
  const me = await apiGet("/api/me", Me);
  const badges = me.badges ?? [];
  const stats = me.stats ?? { newConnections: 0, reconnections: 0, events: 0 };
  return (
    <Screen dock>
      <div className="flex items-center justify-between">
        <IconLink href="/connect" label={copy.myQr}>
          <Icon name="qr" size={20} />
        </IconLink>
        <IconLink href="/onboarding/profile?from=me" label={copy.edit}>
          <Icon name="pencil" size={19} />
        </IconLink>
      </div>

      <Link href="/onboarding/monito?from=me" aria-label={copy.changeMonito} className="mt-[-4px] flex items-center gap-4">
        <span className="flex h-[140px] w-[132px] shrink-0 items-end justify-center rounded-card bg-sky-soft pb-[6px] border-ink shadow-hard-4">
          <Avatar person={{ name: me.name, look: me.avatar }} px={6} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="font-display text-[26px] leading-[1.05] font-bold">{me.name}</span>
          <Muted className="text-[14px] leading-[1.3] font-bold">
            {[me.headline, me.company].filter(Boolean).join(" · ")}
            <br />
            {me.city?.split(",")[0]}
          </Muted>
          <Pill tone="sun" height={34} className="self-start rounded-chip px-3 text-[14px]">
            <Icon name="bolt" size={14} />
            {copy.pointsRank(formatPoints(me.scores?.event.points ?? 0), me.scores?.event.rank ?? null)}
          </Pill>
        </span>
      </Link>

      <Card href="/me/badges" className="flex flex-col gap-[6px] px-[14px] pt-3 pb-[10px]">
        <span className="flex items-baseline justify-between">
          <SectionLabel>{copy.badges}</SectionLabel>
          <Muted className="text-[12px] font-extrabold">{copy.badgesCount(badges.length, BADGE_IDS.length)}</Muted>
        </span>
        <BadgeShelf ids={badges} />
      </Card>

      <Card>
        <StatGrid>
          <Stat value={stats.newConnections} label={copy.newConnections} />
          <Stat value={stats.reconnections} label={copy.reconnections} />
          <Stat value={stats.events} label={copy.events} />
        </StatGrid>
      </Card>

      <Card className="flex flex-col gap-[10px] px-[14px] py-[10px]">
        <SectionLabel className="whitespace-nowrap">{copy.linksLabel}</SectionLabel>
        <MyLinkToggles visibility={me.visibility} links={me.links ?? {}} />
      </Card>

      <Card className="flex flex-col overflow-hidden">
        <Link href="/ranking" className="flex h-12 items-center gap-3 px-4 text-[15px] font-extrabold">
          <span className="flex-1">{copy.ranking}</span>
          <Muted className="text-[13px]">{me.scores?.event.rank ? `#${me.scores.event.rank}` : "—"}</Muted>
          <Icon name="chevronRight" size={18} strokeWidth={3} />
        </Link>
        <Link href="/onboarding/monito?from=me" className="dashed-ink flex h-12 items-center gap-3 px-4 text-[15px] font-extrabold">
          <span className="flex-1">{copy.myMonito}</span>
          <Muted className="text-[13px]">{copy.change}</Muted>
          <Icon name="chevronRight" size={18} strokeWidth={3} />
        </Link>
      </Card>
    </Screen>
  );
}
