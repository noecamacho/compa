import { Icon } from "@/components/icons";
import { CapToggle } from "@/components/invite/CapToggle";
import { InviteActions } from "@/components/invite/InviteActions";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { Monito } from "@/components/monito/Monito";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Screen } from "@/components/ui/Screen";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { Invites, Me, type MeT } from "@/lib/api/schemas";
import { apiGet } from "@/lib/api/server-fetch";
import { requestCopy } from "@/lib/server/locale";
import { firstName } from "@/lib/format";
import { GOLDEN_CAP, withDefaults } from "@/lib/monito/look";

const GOLDEN_LOOK = withDefaults({
  ...GOLDEN_CAP,
  outfit: "compa",
  shirt: "#FFFFFF",
});

type InviteCopy = Awaited<ReturnType<typeof requestCopy>>["copy"]["invite"];

// Earned: my own picture wearing the cap (photo overlay or monito), with the switch to wear or hide it.
function CapEarned({ me, copy }: { me: MeT; copy: InviteCopy }) {
  return (
    <Card tone="sun-soft" className="flex items-center gap-[14px] px-4 py-[14px]" data-testid="cap-earned">
      <span className="flex h-[108px] w-[92px] shrink-0 items-end justify-center rounded-button bg-white pb-[10px] border-ink">
        <Avatar person={avatarOf(me)} size={68} shadow={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[6px]">
        <span className="font-display text-[22px] leading-[1.1] font-bold">{copy.capEarned}</span>
        <span className="text-[13px] leading-[1.35] font-extrabold">{me.showAccessories ? copy.capWorn : copy.capHidden}</span>
        <CapToggle shown={me.showAccessories} />
      </span>
    </Card>
  );
}

// Before sharing, say plainly whether a friend joining now earns points, and where.
function PointsNotice({ event, copy }: { event: { name: string } | null; copy: InviteCopy }) {
  if (event) {
    return (
      <span className="flex flex-col gap-[2px] rounded-[14px] bg-mint-soft px-3 py-[10px] border-ink" data-testid="invite-points">
        <span className="font-display text-[16px] leading-[1.15] font-bold">{copy.pointsAt(event.name)}</span>
        <span className="text-[12px] leading-[1.35] font-extrabold">{copy.pointsAtDetail}</span>
      </span>
    );
  }
  return (
    <span className="flex flex-col gap-[2px] rounded-[14px] bg-sky-soft px-3 py-[10px] border-ink" data-testid="invite-points">
      <span className="font-display text-[16px] leading-[1.15] font-bold">{copy.noPointsTitle}</span>
      <span className="text-[12px] leading-[1.35] font-extrabold">{copy.noPoints}</span>
    </span>
  );
}

// 12 Invitar: the golden cap, its slots, my referral code with whether it pays points right now, and the share buttons.
export default async function InvitePage() {
  const { home, invite: copy } = (await requestCopy()).copy;
  const [invites, me] = await Promise.all([apiGet("/api/invites/me", Invites), apiGet("/api/me", Me)]);
  const { link } = invites;
  // Every friend who joined through the code counts toward the cap, inside an event or not.
  const slots = Array.from({ length: invites.target }, (_, index) => invites.invitees[index] ?? null);
  return (
    <Screen width="focus">
      <Header close="/home" title={copy.title} />
      {invites.goldenCap ? (
        <CapEarned me={me} copy={copy} />
      ) : (
        <Card tone="sun-soft" className="flex items-center gap-[14px] px-4 py-[14px]">
          <span className="flex h-[108px] w-[92px] shrink-0 items-end justify-center rounded-button bg-white pb-[6px] border-ink">
            <Monito look={GOLDEN_LOOK} px={4} label={home.goldenCapLabel} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[6px]">
            <span className="font-display text-[22px] leading-[1.1] font-bold">{copy.prize}</span>
            <span className="text-[13px] leading-[1.35] font-extrabold">
              {copy.prizeDetail[0]}
              <span className="font-display">{copy.prizeDetail[1]}</span>
              {copy.prizeDetail[2]}
              <span className="font-display">{copy.prizeDetail[3]}</span>
              {copy.prizeDetail[4]}
            </span>
          </span>
        </Card>
      )}

      <Card className="flex flex-col gap-3 px-4 py-[14px]">
        <span className="flex items-baseline justify-between">
          <SectionLabel>{copy.invitees}</SectionLabel>
          <Muted className="text-[12px] font-extrabold">{copy.progress(Math.min(invites.invitees.length, invites.target), invites.target)}</Muted>
        </span>
        <div className="flex items-start gap-2">
          {slots.map((invitee, index) => (
            <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-[6px]">
              {invitee ? (
                <>
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sun-soft border-ink shadow-hard-2">
                    <Avatar person={avatarOf(invitee.person)} size={48} />
                  </span>
                  <span className="text-center text-[12px] font-extrabold">{firstName(invitee.person.name)}</span>
                  <Muted className="text-[11px] font-bold">{invitee.points > 0 ? `+${invitee.points} pts` : copy.noPointsShort}</Muted>
                </>
              ) : (
                <>
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white" style={{ border: "2.5px dashed #1E1B2E" }}>
                    <Icon name="plus" size={22} strokeWidth={3} className="text-muted" />
                  </span>
                  <Muted className="text-[12px] font-extrabold">{copy.friendSlot(index + 1)}</Muted>
                </>
              )}
            </div>
          ))}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-[6px]">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sun border-ink shadow-hard-2">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#1E1B2E" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 14c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4z" />
                <path d="M4 15h17l-1 3H5z" />
              </svg>
            </span>
            <span className="text-center font-display text-[12px] font-bold">{copy.cap}</span>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-[10px] px-4 py-[14px]">
        <SectionLabel>{copy.link}</SectionLabel>
        <PointsNotice event={link.event} copy={copy} />
        <InviteActions url={link.url} eventName={link.event?.name ?? null} />
      </Card>

      <Muted className="text-center text-[12px] leading-[1.4] font-bold">
        {copy.footer[0]}
        <br />
        {copy.footer[1]}
      </Muted>

      <div className="mt-auto md:mt-4">
        <ButtonLink href="/connect" variant="primary">
          <Icon name="qr" size={20} />
          {copy.showQr}
        </ButtonLink>
      </div>
    </Screen>
  );
}
