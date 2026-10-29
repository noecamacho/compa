import { notFound } from "next/navigation";
import { RequestActions } from "@/components/connections/RequestActions";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";
import { Header } from "@/components/ui/Header";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { Muted, SectionLabel, Stat, StatGrid } from "@/components/ui/Text";
import { Icon } from "@/components/icons";
import { ConnectionDetail, Me, UserProfile } from "@/lib/api/schemas";
import { apiGet, apiGetOrNull } from "@/lib/api/server-fetch";
import { request as copy } from "@/lib/copy/es";
import { firstName, timeAgo } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

const TAG_COLORS = ["#DDF1FF", "#FFE3EA", "#FFF3BF"];

// 06b Solicitud: what the scanned person sees. Nothing is shared until they accept.
export default async function RequestPage({ params }: Props) {
  const { id } = await params;
  const [me, detail] = await Promise.all([apiGet("/api/me", Me), apiGetOrNull(`/api/connections/${id}`, ConnectionDetail, { mockExample: "incoming" })]);
  if (!detail) notFound();
  const other = detail.other;
  const profile = await apiGetOrNull(`/api/users/${other.handle}`, UserProfile);
  const mutual = profile?.relationship?.mutual ?? [];
  const stats = profile?.stats;
  const interests = other.interests ?? [];
  return (
    <Screen>
      <Header
        close="/home"
        right={
          <Pill tone="gum-soft" kind="text" height={32} className="px-3">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-coral" style={{ border: "1.5px solid #1E1B2E" }} />
            {copy.badge}
          </Pill>
        }
      />
      <div className="mt-[6px] flex flex-col items-center gap-3">
        <div className="flex items-center">
          <span className="animate-wiggle block">
            <Avatar person={avatarOf(other)} size={92} shadow={3} />
          </span>
          <span aria-hidden="true" className="relative z-10 mx-[-10px] flex h-10 w-10 items-center justify-center rounded-full bg-sun font-display text-[20px] font-bold border-ink">
            ?
          </span>
          <span className="block opacity-55" style={{ transform: "rotate(5deg)" }}>
            <Avatar person={avatarOf(me)} size={92} shadow={3} />
          </span>
        </div>
        <div className="animate-rise flex flex-col items-center gap-1 text-center" style={{ animationDelay: ".2s" }}>
          <h1 className="m-0 font-display text-[26px] leading-[1.1] font-bold">{copy.title(firstName(other.name))}</h1>
          <Muted className="text-[13px] font-bold">{copy.scannedAgo(timeAgo(detail.at), [interests[0], other.city?.split(",")[0]].filter(Boolean).join(", "))}</Muted>
        </div>
      </div>

      <Card className="animate-rise flex flex-col gap-3 px-4 py-[14px]" style={{ animationDelay: ".35s" }}>
        <div className="flex items-center gap-3">
          <Avatar person={avatarOf(other)} size={46} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-display text-[18px] leading-[1.2] font-bold">{other.name}</span>
            <Muted className="text-[13px] font-bold">{[other.headline, other.company, other.city?.split(",")[0]].filter(Boolean).join(" · ")}</Muted>
          </span>
          {profile?.scores?.event.rank && (
            <Pill tone="sun" height={30} shadow={false} className="rounded-[10px] text-[13px]" style={{ borderWidth: 2 }}>
              <Icon name="bolt" size={12} />#{profile.scores.event.rank}
            </Pill>
          )}
        </div>
        <div className="dashed-ink">
          <StatGrid>
            <Stat value={mutual.length} label={copy.mutual} size={20} />
            <Stat value={stats ? stats.newConnections + stats.reconnections : "—"} label={copy.connections} size={20} />
            <Stat value={stats ? stats.events : "—"} label={copy.events} size={20} />
          </StatGrid>
        </div>
        {mutual.length > 0 && (
          <span className="flex items-center gap-2">
            <SectionLabel>{copy.mutualLabel}</SectionLabel>
            <span className="flex items-center">
              {mutual.slice(0, 3).map((person, index) => (
                <span key={person.id} className="block" style={{ marginLeft: index ? -7 : 0 }}>
                  <Avatar person={avatarOf(person)} size={26} />
                </span>
              ))}
            </span>
            <Muted className="text-[12px] font-bold">{copy.names(mutual.slice(0, 3).map((person) => firstName(person.name)))}</Muted>
          </span>
        )}
      </Card>

      {interests.length > 0 && (
        <Card className="animate-rise flex flex-col gap-[10px] px-4 py-[14px]" style={{ animationDelay: ".5s" }}>
          <SectionLabel>{copy.interestsLabel}</SectionLabel>
          <span className="flex flex-wrap gap-2">
            {interests.slice(0, 3).map((topic, index) => (
              <Tag key={topic} background={TAG_COLORS[index]}>
                {topic}
              </Tag>
            ))}
          </span>
        </Card>
      )}

      <Muted className="animate-rise text-center text-[12px] font-bold" style={{ animationDelay: ".6s" }}>
        {copy.bothWin}
      </Muted>

      <RequestActions connectionId={detail.connectionId} />
    </Screen>
  );
}
