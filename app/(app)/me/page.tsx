import Link from "next/link";
import { Suspense } from "react";
import { Tour } from "@/components/tour/Tour";
import { BadgeShelf } from "@/components/badges/BadgeShelf";
import { Icon } from "@/components/icons";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { MyLinks } from "@/components/profile/MyLinks";
import { SignOutButton } from "@/components/profile/SignOutButton";
import { Card } from "@/components/ui/Card";
import { IconLink } from "@/components/ui/IconButton";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { Muted, SectionLabel, Stat, StatGrid } from "@/components/ui/Text";
import { Me } from "@/lib/api/schemas";
import { apiGet } from "@/lib/api/server-fetch";
import { BADGE_IDS } from "@/lib/badges/catalog";
import { requestCopy } from "@/lib/server/locale";
import { formatPoints } from "@/lib/format";
import { isSuperAdmin } from "@/lib/roles";
import { StickyBar } from "@/components/ui/StickyBar";

// 09 MiPerfil.
export default async function MePage() {
  const { locale, copy: all } = await requestCopy();
  const { me: copy, tour } = all;
  const me = await apiGet("/api/me", Me);
  const badges = me.badges ?? [];
  const stats = me.stats ?? { newConnections: 0, reconnections: 0, events: 0 };
  const admin = isSuperAdmin(me);
  return (
    <Screen dock>
      <StickyBar className="flex items-center justify-between">
        <IconLink href="/connect" label={copy.myQr}>
          <Icon name="qr" size={20} />
        </IconLink>
        <IconLink href="/onboarding/profile?from=me" label={copy.edit}>
          <Icon name="pencil" size={19} />
        </IconLink>
      </StickyBar>

      {/* Phone: one column in the V2 order (the `order-*` classes). From 834: who I am, my numbers and networks on the
          left; badges, shortcuts and sign-out on the right. The column wrappers are `contents` on phones. */}
      <div className="flex flex-col gap-[14px] md:grid md:grid-cols-2 md:items-start lg:gap-5">
        <div className="contents md:flex md:flex-col md:gap-[14px] lg:gap-5">
          <Link href="/onboarding/monito?from=me" aria-label={copy.changeMonito} className="order-1 mt-[-4px] flex items-center gap-4 tappable md:order-none md:mt-0" data-tour="avatar">
            <span className="flex h-[140px] w-[132px] shrink-0 items-end justify-center rounded-card bg-sky-soft pb-[6px] border-ink shadow-hard-4">
              <Avatar person={avatarOf(me)} px={6} />
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
                {copy.pointsRank(formatPoints(locale, me.scores?.event.points ?? 0), me.scores?.event.rank ?? null)}
              </Pill>
              {me.isTest && (
                <Pill tone="gum-soft" shadow={false} className="self-start">
                  {copy.testUser}
                </Pill>
              )}
            </span>
          </Link>

          <Card className="order-3 md:order-none">
            <StatGrid>
              <Stat value={stats.newConnections} label={copy.newConnections} />
              <Stat value={stats.reconnections} label={copy.reconnections} />
              <Stat value={stats.events} label={copy.events} />
            </StatGrid>
          </Card>

          <Card className="order-4 flex flex-col gap-[10px] px-[14px] py-[10px] md:order-none" data-tour="links">
            <SectionLabel className="whitespace-nowrap">{copy.linksLabel}</SectionLabel>
            <MyLinks visibility={me.visibility} links={me.links ?? {}} />
          </Card>
        </div>
        <div className="contents md:flex md:flex-col md:gap-[14px] lg:gap-5">
          <Card href="/me/badges" className="order-2 flex flex-col gap-[6px] px-[14px] pt-3 pb-[10px] md:order-none" data-tour="badges">
            <span className="flex items-baseline justify-between">
              <SectionLabel>{copy.badges}</SectionLabel>
              <Muted className="text-[12px] font-extrabold">{copy.badgesCount(badges.length, BADGE_IDS.length)}</Muted>
            </span>
            <BadgeShelf ids={badges} />
          </Card>

          <Card className="order-5 flex flex-col overflow-hidden md:order-none">
            <Link href="/ranking" className="flex h-12 items-center gap-3 px-4 text-[15px] font-extrabold transition-colors duration-200 active:bg-paper">
              <span className="flex-1">{copy.ranking}</span>
              <Muted className="text-[13px]">{me.scores?.event.rank ? `#${me.scores.event.rank}` : "—"}</Muted>
              <Icon name="chevronRight" size={18} strokeWidth={3} />
            </Link>
            <Link href="/onboarding/monito?from=me" className="dashed-ink flex h-12 items-center gap-3 px-4 text-[15px] font-extrabold transition-colors duration-200 active:bg-paper">
              <span className="flex-1">{copy.myMonito}</span>
              <Muted className="text-[13px]">{copy.change}</Muted>
              <Icon name="chevronRight" size={18} strokeWidth={3} />
            </Link>
            <Link href="/home?tour=1" className="dashed-ink flex h-12 items-center gap-3 px-4 text-[15px] font-extrabold transition-colors duration-200 active:bg-paper">
              <span className="flex-1">{tour.replay}</span>
              <Icon name="chevronRight" size={18} strokeWidth={3} />
            </Link>
            {admin && (
              <Link href="/admin" className="dashed-ink flex h-12 items-center gap-3 px-4 text-[15px] font-extrabold">
                <span className="flex-1">{copy.admin}</span>
                <Muted className="text-[13px]">{copy.adminHint}</Muted>
                <Icon name="chevronRight" size={18} strokeWidth={3} />
              </Link>
            )}
          </Card>

          <div className="order-6 md:order-none">
            <SignOutButton />
          </div>
        </div>
      </div>
      <Suspense>
        <Tour id="me" steps={tour.me} />
      </Suspense>
    </Screen>
  );
}
