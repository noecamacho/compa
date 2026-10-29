import { LinkedInMark } from "@/components/brand/LinkedInMark";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/icons";
import { Crowd } from "@/components/landing/Crowd";
import { ButtonLink } from "@/components/ui/Button";
import { copyFor, type Dictionary } from "@/lib/copy";
import { currentMe } from "@/lib/server/current-event";
import { requestLocale } from "@/lib/server/locale";

type Props = { searchParams: Promise<{ error?: string }> };

type LandingCopy = Dictionary["landing"];

// One action per state (Von Restorff): visitors get the LinkedIn button, signed-in people get the way back to the app.
function PrimaryAction({ copy, signedIn, inEvent }: { copy: LandingCopy; signedIn: boolean; inEvent: boolean }) {
  if (signedIn) {
    return (
      <ButtonLink href="/home" variant="primary" height={60} className="text-[18px]">
        {inEvent ? copy.backToEvent : copy.goToAccount}
        <Icon name="chevronRight" size={20} strokeWidth={3} />
      </ButtonLink>
    );
  }
  return (
    <>
      <ButtonLink href="/auth/linkedin?next=/home" variant="linkedin" height={60} className="gap-3 text-[18px]">
        <LinkedInMark size={22} />
        {copy.signIn}
      </ButtonLink>
      <span className="text-center text-[13px] leading-[1.4] font-extrabold text-muted lg:text-left">{copy.signInNote}</span>
    </>
  );
}

// Secondary on purpose: a quiet row, no card or shadow, so it never competes with the button above it.
function EventQrHint({ copy }: { copy: LandingCopy }) {
  return (
    <div className="flex items-start gap-3 pt-4 dashed-ink">
      <span aria-hidden="true" className="mt-[2px] flex h-9 w-9 shrink-0 items-center justify-center rounded-chip bg-mint-soft border-ink">
        <Icon name="qr" size={20} />
      </span>
      <span className="flex min-w-0 flex-col gap-[2px]">
        <span className="text-[15px] leading-[1.3] font-extrabold">{copy.doorTitle}</span>
        <span className="text-[13px] leading-[1.4] font-bold text-muted">{copy.doorHint}</span>
      </span>
    </div>
  );
}

// compa.lol for everyone (API spec A10, amended 2026-10-29): one promise and one LinkedIn button that both signs up and
// signs in. Events stay exclusive: joining one still needs its QR (/e/<code>). Signed-in people get a way back to the app.
// On phones the button sits in the thumb zone and sticks to the bottom edge when a short screen would push it below the fold.
export default async function LandingPage({ searchParams }: Props) {
  const [{ error }, locale, me] = await Promise.all([searchParams, requestLocale(), currentMe()]);
  const copy = copyFor(locale).landing;
  return (
    <main lang={locale} className="paper-dots min-h-svh w-full overflow-x-clip">
      <div className="mx-auto flex min-h-svh w-full max-w-[1160px] flex-col px-[max(18px,env(safe-area-inset-left))] pt-[max(20px,env(safe-area-inset-top))] pb-6 sm:px-8 md:pt-10 lg:px-12">
        <header className="flex items-center justify-between">
          <Logo />
        </header>

        <div className="grid flex-1 content-center items-center gap-5 py-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:py-10">
          <div className="mx-auto w-full max-w-[300px] sm:max-w-[420px] lg:order-2 lg:max-w-none">
            <Crowd label={copy.sceneLabel} topic={copy.sampleTopic} />
          </div>

          <div className="flex w-full max-w-[560px] flex-col gap-4 justify-self-center lg:order-1 md:gap-6 lg:justify-self-start">
            <h1 className="m-0 font-display text-[clamp(32px,9vw,40px)] leading-[1.02] font-bold tracking-[-0.5px] text-balance sm:text-[52px] lg:text-[64px]">
              {copy.title[0]}
              <br />
              {copy.title[1]}
            </h1>
            <p className="m-0 max-w-[44ch] text-[15px] leading-[1.45] font-bold text-muted sm:text-[18px]">{copy.lead}</p>

            {error === "linkedin" && (
              <p role="alert" className="m-0 text-[14px] font-extrabold text-coral">
                {copy.signInError}
              </p>
            )}

            <div className="sticky bottom-0 z-10 -mx-[18px] flex flex-col gap-2 px-[18px] pt-3 pb-[max(12px,env(safe-area-inset-bottom))] [background:linear-gradient(to_bottom,transparent,var(--color-paper)_14px)] sm:mx-0 sm:max-w-[400px] sm:px-0 lg:static lg:p-0 lg:[background:none]">
              <PrimaryAction copy={copy} signedIn={Boolean(me)} inEvent={Boolean(me?.currentEvent)} />
            </div>

            <div className="sm:max-w-[440px]">
              <EventQrHint copy={copy} />
            </div>
          </div>
        </div>

        <footer className="text-[12px] font-extrabold text-muted">compa.lol</footer>
      </div>
    </main>
  );
}
