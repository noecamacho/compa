import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/icons";
import { Crowd } from "@/components/landing/Crowd";
import { ButtonLink } from "@/components/ui/Button";
import { copyFor } from "@/lib/copy";
import { currentMe } from "@/lib/server/current-event";
import { requestLocale } from "@/lib/server/locale";

type Props = { searchParams: Promise<{ error?: string }> };

// compa.lol for everyone (API spec A10): one promise, no sign-up. People get in only through their event's QR;
// someone already checked in gets one way back to their event.
export default async function LandingPage({ searchParams }: Props) {
  const [{ error }, locale, me] = await Promise.all([searchParams, requestLocale(), currentMe()]);
  const copy = copyFor(locale).landing;
  const inEvent = Boolean(me?.currentEvent);
  return (
    <main lang={locale} className="paper-dots min-h-dvh w-full overflow-x-hidden">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1160px] flex-col px-[18px] pt-12 pb-8 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <Logo />
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12 lg:py-12">
          <div className="flex max-w-[520px] flex-col gap-5 md:order-2 md:max-w-none">
            <Crowd label={copy.sceneLabel} topic={copy.sampleTopic} />
          </div>

          <div className="flex max-w-[560px] flex-col gap-6 md:order-1">
            <h1 className="m-0 font-display text-[38px] leading-[1.02] font-bold tracking-[-0.5px] text-balance sm:text-[48px] lg:text-[60px]">
              {copy.title[0]}
              <br />
              {copy.title[1]}
            </h1>
            <p className="m-0 max-w-[46ch] text-[16px] leading-[1.45] font-bold text-muted sm:text-[18px]">{copy.lead}</p>

            <div className="flex items-center gap-4 rounded-card bg-white px-4 py-4 border-ink shadow-hard-4 sm:px-5">
              <span
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-button bg-mint border-ink shadow-hard-2"
                style={{ transform: "rotate(-5deg)" }}
              >
                <Icon name="qr" size={30} />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-display text-[19px] leading-[1.15] font-bold sm:text-[21px]">{copy.doorTitle}</span>
                <span className="text-[13px] leading-[1.35] font-extrabold text-muted sm:text-[14px]">{copy.doorHint}</span>
              </span>
            </div>

            {error === "linkedin" && (
              <p role="alert" className="m-0 text-[14px] font-extrabold text-coral">
                {copy.signInError}
              </p>
            )}

            {inEvent && (
              <ButtonLink href="/home" variant="primary" className="sm:max-w-[320px]">
                {copy.backToEvent}
                <Icon name="chevronRight" size={20} strokeWidth={3} />
              </ButtonLink>
            )}
          </div>
        </div>

        <footer className="text-[12px] font-extrabold text-muted">compa.lol</footer>
      </div>
    </main>
  );
}
