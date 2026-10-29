import type { CSSProperties } from "react";
import { Logo } from "@/components/brand/Logo";
import { Monito } from "@/components/monito/Monito";
import { ButtonLink } from "@/components/ui/Button";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { SAMPLE_PEOPLE } from "@/lib/monito/sample-people";
import { EVENT_MAIN, EVENT_STACK } from "./layout";

// Unknown, malformed or rotated event code. Deliberately the same for every case (API spec A10).
export function EventNotFound({ locale }: { locale: Locale }) {
  const copy = copyFor(locale).eventNotFound;
  return (
    <main lang={locale} className={EVENT_MAIN}>
      <div className="flex w-full max-w-[440px] flex-1 flex-col gap-6">
        <Logo />
        <div className={EVENT_STACK}>
          <div className="flex flex-1 flex-col justify-center gap-4 md:flex-none">
            <span aria-hidden="true" className="animate-bob block w-[96px] origin-bottom" style={{ "--tilt": "-4deg" } as CSSProperties}>
              <Monito look={SAMPLE_PEOPLE.MG.look} className="h-auto w-full" />
            </span>
            <h1 className="m-0 font-display text-[32px] leading-[1.05] font-bold text-balance sm:text-[40px]">{copy.title}</h1>
            <p className="m-0 text-[16px] leading-[1.45] font-bold text-muted">{copy.body}</p>
          </div>
          <ButtonLink href="/" variant="secondary">
            {copy.home}
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
