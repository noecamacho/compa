"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/monito/Avatar";
import { Button } from "@/components/ui/Button";
import { EVENT_STACK } from "./layout";
import { eventPath } from "@/lib/access-code";
import { ApiClientError, apiCall } from "@/lib/api/client";
import { CheckIn } from "@/lib/api/schemas";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import type { MonitoLook } from "@/lib/monito/look";

type Props = { code: string; eventName: string; person: { name: string; look?: MonitoLook }; locale: Locale };

// Check-in with the big-screen notice (A1, M13): accepting is the consent the API records.
export function JoinConsent({ code, eventName, person, locale }: Props) {
  const copy = copyFor(locale).join;
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setSending(true);
    setError(null);
    try {
      await apiCall("POST", `/api/e/${code}/check-in`, CheckIn, { screenConsent: true });
      router.replace("/home");
    } catch (caught) {
      const notRunning = caught instanceof ApiClientError && caught.code === "event_not_running";
      setError(notRunning ? copy.notRunning : copy.failed);
      setSending(false);
    }
  }

  return (
    <div className={EVENT_STACK}>
      <div className="flex flex-1 flex-col justify-center gap-5 md:flex-none">
        <span className="text-[15px] font-extrabold text-muted [overflow-wrap:anywhere]">{eventName}</span>
        <h1 className="m-0 font-display text-[clamp(32px,9vw,36px)] leading-[1.05] font-bold text-balance sm:text-[44px]">{copy.title}</h1>
        <div className="flex items-center gap-4 rounded-card bg-white px-4 py-4 border-ink shadow-hard-4">
          <Avatar person={person} size={56} shadow={2} />
          <p className="m-0 text-[15px] leading-[1.45] font-extrabold">{copy.notice}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {error && (
          <p role="alert" className="m-0 text-center text-[14px] font-extrabold text-coral">
            {error}
          </p>
        )}
        <Button variant="primary" height={60} className="text-[18px]" onClick={accept} disabled={sending} aria-busy={sending}>
          {sending ? copy.sending : copy.accept}
        </Button>
        <Link href={eventPath(code)} className="tappable flex min-h-11 items-center justify-center text-[14px] font-extrabold text-muted">
          {copy.cancel}
        </Link>
      </div>
    </div>
  );
}
