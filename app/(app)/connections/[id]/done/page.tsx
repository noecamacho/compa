import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { OutsideEventTag } from "@/components/connections/OutsideEventTag";
import { PendingWatcher } from "@/components/connections/PendingWatcher";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";
import { Header } from "@/components/ui/Header";
import { SocialLinks } from "@/components/profile/SocialLinks";
import { Screen } from "@/components/ui/Screen";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { ConnectionDetail, Me } from "@/lib/api/schemas";
import { apiGet, apiGetOrNull } from "@/lib/api/server-fetch";
import type { Dictionary } from "@/lib/copy";
import { requestCopy } from "@/lib/server/locale";
import { formatClock } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

const first = (name: string) => name.split(" ")[0] ?? name;

function breakdown(detail: NonNullable<Awaited<ReturnType<typeof load>>>, copy: Dictionary["confirmation"]): string {
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
  const [me, detail, { locale, copy: all }] = await Promise.all([apiGet("/api/me", Me), load(id), requestCopy()]);
  const { common, confirmation: copy } = all;
  if (!detail) notFound();
  const other = detail.other;
  const pending = detail.status !== "accepted";
  const title = pending ? copy.titlePending(first(other.name)) : detail.kind === "new" ? copy.titleNew(first(other.name)) : copy.titleReconnection(first(other.name));
  return (
    <Screen width="focus">
      {/* Only a pending request can still change; an expired one would refresh forever. */}
      {detail.status === "pending" && <PendingWatcher connectionId={detail.connectionId} />}
      <Header close="/home" />
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center">
          <span className="block" style={{ transform: "rotate(-5deg)" }}>
            <Avatar person={avatarOf(me)} size={84} shadow={3} />
          </span>
          <span aria-hidden="true" className="relative z-10 mx-[-10px] flex h-10 w-10 items-center justify-center rounded-full bg-sky border-ink">
            <Icon name={detail.kind === "new" ? "userPlus" : "refresh"} size={18} strokeWidth={2.8} />
          </span>
          <span className="block" style={{ transform: "rotate(5deg)" }}>
            <Avatar person={avatarOf(other)} size={84} shadow={3} />
          </span>
        </div>
        {/* Outside an event there is nothing to count, so the label replaces the points badge. */}
        {detail.event === null ? (
          <OutsideEventTag label={common.outsideEvent} />
        ) : (
          <span className="animate-pop inline-flex h-[62px] items-center gap-[10px] rounded-[18px] bg-sun px-[22px] font-display text-[38px] font-bold whitespace-nowrap shadow-hard-4" style={{ border: "3px solid #1E1B2E" }}>
            <Icon name="bolt" size={26} />
            {copy.points(detail.points.total)}
          </span>
        )}
        <div className="animate-rise flex flex-col items-center gap-[2px]" style={{ animationDelay: ".25s" }}>
          <h1 className="m-0 font-display text-[24px] leading-[1.15] font-bold">{title}</h1>
          <Muted className="text-[13px] font-bold">{breakdown(detail, copy)}</Muted>
        </div>
      </div>

      {detail.interaction && (
        <Card href={`/connections/${detail.connectionId}/note`} className="animate-rise flex flex-col gap-[10px] px-4 py-[14px]" style={{ animationDelay: ".4s" }}>
          <span className="flex items-center justify-between">
            <SectionLabel>{copy.talkedAbout}</SectionLabel>
            {detail.interaction.durationSec !== null && <Muted className="text-[11px] font-extrabold">{copy.fromNote(formatClock(locale, detail.interaction.durationSec))}</Muted>}
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

      <Card className="animate-rise mt-auto flex flex-col gap-[10px] px-4 py-[14px] md:mt-0" style={{ animationDelay: ".55s" }}>
        <span className="flex items-center gap-[10px]">
          <Avatar person={avatarOf(other)} size={32} />
          <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
            <SectionLabel>{copy.connectWith(first(other.name))}</SectionLabel>
            <Muted className="text-[12px] font-bold">{pending ? copy.pendingNote : copy.keepTalking}</Muted>
          </span>
        </span>
        <SocialLinks links={other.links ?? {}} owner={first(other.name)} />
      </Card>

      <div className="animate-rise" style={{ animationDelay: ".7s" }}>
        <ButtonLink href="/home" variant="primary">
          {common.done}
        </ButtonLink>
      </div>
    </Screen>
  );
}
