import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { Avatar } from "@/components/monito/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";
import { Header } from "@/components/ui/Header";
import { Screen } from "@/components/ui/Screen";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { ConnectionDetail, Me } from "@/lib/api/schemas";
import { apiGet, apiGetOrNull } from "@/lib/api/server-fetch";
import { common, confirmation as copy, networks } from "@/lib/copy/es";
import { formatClock } from "@/lib/format";
import type { LinkKey } from "@/lib/profile-fields";

type Props = { params: Promise<{ id: string }> };

const NETWORK_STYLE: Partial<Record<LinkKey, { color: string; icon: IconName; label: string }>> = {
  linkedin: { color: "#DDF1FF", icon: "linkedin", label: networks.linkedin },
  instagram: { color: "#FFE3EA", icon: "instagram", label: networks.instagram },
  whatsapp: { color: "#DDF8EA", icon: "whatsapp", label: networks.whatsapp },
  x: { color: "#FFF3BF", icon: "x", label: networks.x },
};

const first = (name: string) => name.split(" ")[0] ?? name;

function breakdown(detail: NonNullable<Awaited<ReturnType<typeof load>>>): string {
  const parts = [];
  if (detail.kind && detail.points.kind) parts.push(copy.breakdownKind(detail.kind, detail.points.kind));
  if (detail.points.topics) parts.push(copy.breakdownTopics(detail.points.topics));
  if (detail.points.note) parts.push(copy.breakdownNote(detail.points.note));
  return parts.join(" · ");
}

const load = (id: string) => apiGetOrNull(`/api/connections/${id}`, ConnectionDetail);

// 06 Confirmación: both monitos, the points, what they talked about and the other person's networks.
export default async function ConfirmationPage({ params }: Props) {
  const { id } = await params;
  const [me, detail] = await Promise.all([apiGet("/api/me", Me), load(id)]);
  if (!detail) notFound();
  const other = detail.other;
  const pending = detail.status !== "accepted";
  const title = pending ? copy.titlePending(first(other.name)) : detail.kind === "new" ? copy.titleNew(first(other.name)) : copy.titleReconnection(first(other.name));
  const links = Object.entries(other.links ?? {}).filter(([key]) => NETWORK_STYLE[key as LinkKey]);
  return (
    <Screen>
      <Header close="/home" />
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center">
          <span className="block" style={{ transform: "rotate(-5deg)" }}>
            <Avatar person={{ name: me.name, look: me.avatar }} size={84} shadow={3} />
          </span>
          <span aria-hidden="true" className="relative z-10 mx-[-10px] flex h-10 w-10 items-center justify-center rounded-full bg-sky border-ink">
            <Icon name={detail.kind === "new" ? "userPlus" : "refresh"} size={18} strokeWidth={2.8} />
          </span>
          <span className="block" style={{ transform: "rotate(5deg)" }}>
            <Avatar person={{ name: other.name, look: other.avatar }} size={84} shadow={3} />
          </span>
        </div>
        <span className="animate-pop inline-flex h-[62px] items-center gap-[10px] rounded-[18px] bg-sun px-[22px] font-display text-[38px] font-bold whitespace-nowrap shadow-hard-4" style={{ border: "3px solid #1E1B2E" }}>
          <Icon name="bolt" size={26} />
          {copy.points(detail.points.total)}
        </span>
        <div className="animate-rise flex flex-col items-center gap-[2px]" style={{ animationDelay: ".25s" }}>
          <h1 className="m-0 font-display text-[24px] leading-[1.15] font-bold">{title}</h1>
          <Muted className="text-[13px] font-bold">{breakdown(detail)}</Muted>
        </div>
      </div>

      {detail.interaction && (
        <Card href={`/connections/${detail.connectionId}/note`} className="animate-rise flex flex-col gap-[10px] px-4 py-[14px]" style={{ animationDelay: ".4s" }}>
          <span className="flex items-center justify-between">
            <SectionLabel>{copy.talkedAbout}</SectionLabel>
            {detail.interaction.durationSec !== null && <Muted className="text-[11px] font-extrabold">{copy.fromNote(formatClock(detail.interaction.durationSec))}</Muted>}
          </span>
          <span className="flex flex-wrap gap-2">
            {detail.interaction.topics.map((topic, index) => (
              <Tag key={topic} background={index < 2 ? "#DDF1FF" : "#FFFFFF"}>
                {topic}
              </Tag>
            ))}
          </span>
          <span className="text-[14px] leading-[1.45] font-bold">{detail.interaction.summary}</span>
        </Card>
      )}

      <Card className="animate-rise mt-auto flex flex-col gap-[10px] px-4 py-[14px]" style={{ animationDelay: ".55s" }}>
        <span className="flex items-center gap-[10px]">
          <Avatar person={{ name: other.name, look: other.avatar }} size={32} />
          <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
            <SectionLabel>{copy.connectWith(first(other.name))}</SectionLabel>
            <Muted className="text-[12px] font-bold">{pending ? copy.pendingNote : copy.keepTalking}</Muted>
          </span>
        </span>
        {links.length > 0 && (
          <div className="grid gap-[10px]" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
            {links.map(([key, url]) => {
              const style = NETWORK_STYLE[key as LinkKey];
              if (!style) return null;
              return (
                <Link
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={copy.linkLabel(style.label, first(other.name))}
                  className="flex h-12 min-w-0 items-center justify-center rounded-[14px] border-ink shadow-hard-2"
                  style={{ background: style.color }}
                >
                  <Icon name={style.icon} size={24} />
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <ButtonLink href="/home" variant="primary">
        {common.done}
      </ButtonLink>
    </Screen>
  );
}
