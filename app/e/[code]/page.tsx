import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { EmailSignIn } from "@/components/event/EmailSignIn";
import { Icon } from "@/components/icons";
import { Card, type Tone } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { eventPath } from "@/lib/access-code";
import type { EventDoorT } from "@/lib/api/schemas";
import { copyFor, formatNumber, formatTime, type Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { currentMe } from "@/lib/server/current-event";
import { loadEventDoor } from "@/lib/server/event-door";
import { requestLocale } from "@/lib/server/locale";

type Props = { params: Promise<{ code: string }> };

type DoorCopy = Dictionary["door"];

const joinPath = (code: string) => `${eventPath(code)}/join`;

// Visitors sign in first and come back to the consent step; signed-in people go straight to it. Mock mode has no LinkedIn.
function entryHref(code: string, signedIn: boolean): string {
  if (signedIn || process.env.API_MODE === "mock") return joinPath(code);
  return `/auth/linkedin?next=${encodeURIComponent(joinPath(code))}`;
}

function Counter({ value, label, tone, locale }: { value: number; label: string; tone: Tone; locale: Locale }) {
  return (
    <Card tone={tone} size="sm" className="flex flex-col gap-1 px-4 py-3">
      <span className="font-display text-[40px] leading-none font-bold tabular-nums sm:text-[48px]">{formatNumber(locale, value)}</span>
      <span className="text-[13px] font-extrabold">{label}</span>
    </Card>
  );
}

function ClosedNotice({ event, copy, locale }: { event: EventDoorT; copy: DoorCopy; locale: Locale }) {
  return (
    <p role="status" className="m-0 rounded-button bg-sun-soft px-4 py-3 text-[15px] leading-[1.4] font-extrabold border-ink">
      {event.phase === "upcoming" ? copy.notStarted(formatTime(locale, event.startsAt)) : copy.ended}
    </p>
  );
}

// The event door (API spec A10): reached only through the event QR, /e/<code>.
export default async function EventDoorPage({ params }: Props) {
  const { code } = await params;
  const [event, locale, me] = await Promise.all([loadEventDoor(code), requestLocale(), currentMe()]);
  if (!event) notFound();
  // Already inside: straight to the app. Mock mode (everyone is Diego, checked in) keeps the door visible for the demo.
  if (me?.currentEvent?.code === event.code && process.env.API_MODE !== "mock") redirect("/home");
  const copy = copyFor(locale).door;
  const signedIn = me !== null;
  return (
    <main lang={locale} className="paper-dots flex min-h-dvh w-full flex-col items-center overflow-x-hidden px-[18px] pt-12 pb-8 sm:px-8">
      <div className="flex w-full max-w-[480px] flex-1 flex-col gap-6">
        <Logo />
        <div className="flex flex-1 flex-col justify-center gap-5">
          <div className="flex flex-col gap-2">
            {event.isRunning && (
              <Pill tone="coral" rotate={-2} className="self-start">
                <span className="animate-beat h-2 w-2 rounded-full bg-white" style={{ border: "1.5px solid #1E1B2E" }} />
                {copy.live}
              </Pill>
            )}
            <span className="text-[15px] font-extrabold text-muted">{copy.invitedTo}</span>
            <h1 className="m-0 font-display text-[40px] leading-[1.02] font-bold tracking-[-0.5px] text-balance sm:text-[52px]">{event.name}</h1>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Counter value={event.counters.checkedIn} label={copy.checkedIn} tone="sky-soft" locale={locale} />
            <Counter value={event.counters.connections} label={copy.connections} tone="mint-soft" locale={locale} />
          </div>
          {!event.isRunning && <ClosedNotice event={event} copy={copy} locale={locale} />}
        </div>

        <div className="flex flex-col gap-3">
          {event.isRunning && (
            <>
              <ButtonLink href={entryHref(event.code, signedIn)} variant={signedIn ? "primary" : "linkedin"} height={56} className="text-[17px]">
                <Icon name={signedIn ? "chevronRight" : "linkedin"} size={20} />
                {signedIn ? copy.ctaSignedIn : copy.cta}
              </ButtonLink>
              {!signedIn && <span className="text-center text-[12px] leading-[1.4] font-extrabold text-muted">{copy.note}</span>}
              {!signedIn && <EmailSignIn next={joinPath(event.code)} mock={process.env.API_MODE === "mock"} locale={locale} />}
            </>
          )}
          <a
            href={`${eventPath(event.code)}/live`}
            className="flex min-h-11 items-center justify-center gap-2 text-[14px] font-extrabold underline decoration-2 underline-offset-4"
          >
            {copy.watchLive}
          </a>
        </div>
      </div>
    </main>
  );
}
