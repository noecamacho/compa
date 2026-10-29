import { Icon } from "@/components/icons";
import { InviteActions } from "@/components/invite/InviteActions";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { Monito } from "@/components/monito/Monito";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Screen } from "@/components/ui/Screen";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { Invites } from "@/lib/api/schemas";
import { apiGet } from "@/lib/api/server-fetch";
import { requestCopy } from "@/lib/server/locale";
import { firstName } from "@/lib/format";
import { GOLDEN_CAP, withDefaults } from "@/lib/monito/look";

const GOLDEN_LOOK = withDefaults({ ...GOLDEN_CAP, outfit: "compa", shirt: "#FFFFFF" });

// 12 Invitar: the golden cap, four slots, my link and the share buttons.
export default async function InvitePage() {
  const { home, invite: copy } = (await requestCopy()).copy;
  const invites = await apiGet("/api/invites/me", Invites);
  const done = invites.invitees.filter((invitee) => invitee.firstConnectionAt);
  const slots = Array.from({ length: invites.target }, (_, index) => done[index] ?? null);
  return (
    <Screen width="focus">
      <Header close="/home" title={copy.title} />
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

      <Card className="flex flex-col gap-3 px-4 py-[14px]">
        <span className="flex items-baseline justify-between">
          <SectionLabel>{copy.invitees}</SectionLabel>
          <Muted className="text-[12px] font-extrabold">{copy.progress(done.length, invites.target)}</Muted>
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
                  <Muted className="text-[11px] font-bold">+{invitee.points} pts</Muted>
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
        <InviteActions url={invites.url} />
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
