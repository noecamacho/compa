"use client";

import { useEffect, useSyncExternalStore } from "react";
import { copyFor } from "@/lib/copy";
import { browserLocale } from "@/lib/i18n";

const RETRY_MS = 10_000;
const noSubscription = () => () => {};

type Props = { error: Error & { digest?: string }; retry: () => void };

// The projector has no one at the keyboard: when the live page fails to render, say so in big type and retry on a timer.
export default function LiveError({ retry }: Props) {
  const locale = useSyncExternalStore(noSubscription, () => browserLocale() ?? "es", () => "es" as const);
  const copy = copyFor(locale).live;

  useEffect(() => {
    const timer = window.setInterval(retry, RETRY_MS);
    return () => window.clearInterval(timer);
  }, [retry]);

  return (
    <main lang={locale} className="paper-dots flex min-h-dvh w-full flex-col items-center justify-center gap-4 px-4 text-center">
      <div role="alert" className="flex flex-col items-center gap-3">
        <span className="font-display text-[22px] leading-none font-bold lg:text-[clamp(22px,1.7vw,40px)]">compa</span>
        <h1 className="m-0 font-display text-[28px] leading-[1.05] font-bold lg:text-[clamp(28px,3vw,72px)]">{copy.outageTitle}</h1>
        <p className="m-0 max-w-[40ch] text-[16px] font-extrabold text-muted lg:text-[clamp(16px,1.4vw,32px)]">{copy.outageBody}</p>
      </div>
    </main>
  );
}
