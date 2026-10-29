import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeShelf } from "@/components/badges/BadgeShelf";
import { Icon } from "@/components/icons";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { Muted, SectionLabel, Stat, StatGrid } from "@/components/ui/Text";
import { UserProfile } from "@/lib/api/schemas";
import { apiGetOrNull } from "@/lib/api/server-fetch";
import { person as copy } from "@/lib/copy/es";
import { formatPoints } from "@/lib/format";
import { BADGE_IDS } from "@/lib/badges/catalog";

type Props = { params: Promise<{ handle: string }> };

// 08 PerfilOtro: someone I already connected with.
export default async function PersonPage({ params }: Props) {
  const { handle } = await params;
  const profile = await apiGetOrNull(`/api/users/${handle}`, UserProfile);
  if (!profile) notFound();
  const { card, connection, scores, badges = [], relationship, lastInteraction } = profile;
  const connected = connection?.status === "accepted";
  const status = connected ? copy.connected : connection?.status === "pending" ? copy.pending : copy.notConnected;
  return (
    <Screen>
      <Header
        back="/connections"
        right={
          <Pill tone={connected ? "mint-soft" : "white"} kind="text" height={32} className="px-3">
            {connected && <Icon name="check" size={14} strokeWidth={3} />}
            {status}
          </Pill>
        }
      />
      <div className="mt-[-4px] flex items-center gap-4">
        <span className="flex h-[140px] w-[132px] shrink-0 items-end justify-center rounded-card bg-sky-soft pb-[6px] border-ink shadow-hard-4">
          <Avatar person={avatarOf(card)} px={6} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="m-0 font-display text-[26px] leading-[1.05] font-bold">{card.name}</h1>
          <Muted className="text-[14px] leading-[1.3] font-bold">
            {[card.headline, card.company].filter(Boolean).join(" · ")}
            <br />
            {card.city?.split(",")[0]}
          </Muted>
          {scores && (
            <Link href="/ranking" className="self-start tappable">
              <Pill tone="sun" height={34} className="rounded-chip px-3 text-[14px]">
                <Icon name="bolt" size={14} />
                {copy.pointsRank(formatPoints(scores.event.points), scores.event.rank)}
              </Pill>
            </Link>
          )}
        </span>
      </div>

      <Card href={`/me/badges?of=${card.handle}`} className="flex flex-col gap-[6px] px-[14px] pt-3 pb-[10px]">
        <span className="flex items-baseline justify-between">
          <SectionLabel>{copy.badges}</SectionLabel>
          <Muted className="text-[12px] font-extrabold">{copy.badgesCount(badges.length, BADGE_IDS.length)}</Muted>
        </span>
        <BadgeShelf ids={badges} />
      </Card>

      {relationship && (
        <Card>
          <StatGrid>
            <Stat value={relationship.reconnections} label={copy.reconnections} />
            <Stat value={relationship.eventsTogether} label={copy.eventsTogether} />
            <Stat value={relationship.mutual.length} label={copy.mutual} />
          </StatGrid>
        </Card>
      )}

      <Card className="flex flex-col overflow-hidden">
        {lastInteraction && (
          <Link href={`/connections/${lastInteraction.connectionId}/note`} className="flex h-14 items-center gap-3 px-4 text-[15px] font-extrabold transition-colors duration-200 active:bg-paper">
            <span className="flex-1">{copy.lastTime}</span>
            <Muted className="text-[13px]">{`${copy.today} · ${lastInteraction.title}`}</Muted>
            <Icon name="chevronRight" size={18} strokeWidth={3} />
          </Link>
        )}
        {relationship && relationship.mutual.length > 0 && (
          <Link href="/connections" className={`flex h-14 items-center gap-3 px-4 text-[15px] font-extrabold transition-colors duration-200 active:bg-paper ${lastInteraction ? "dashed-ink" : ""}`}>
            <span className="flex-1">{copy.mutualConnections}</span>
            <span className="flex items-center">
              {relationship.mutual.slice(0, 3).map((person, index) => (
                <span key={person.id} className="block" style={{ marginLeft: index ? -8 : 0 }}>
                  <Avatar person={avatarOf(person)} size={28} />
                </span>
              ))}
            </span>
            <Icon name="chevronRight" size={18} strokeWidth={3} />
          </Link>
        )}
      </Card>
    </Screen>
  );
}
