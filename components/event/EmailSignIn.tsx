"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { apiCall } from "@/lib/api/client";
import { NoBody } from "@/lib/api/route-spec";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";

type Props = { next: string; mock: boolean; locale: Locale };

type State = "idle" | "sending" | "sent" | "failed";

// Email magic link for people without LinkedIn: one form both creates the account and signs in (/auth/callback).
export function EmailSignIn({ next, mock, locale }: Props) {
  const copy = copyFor(locale).door;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mock) return router.push(next);
    setState("sending");
    const sent = await apiCall("POST", "/api/auth/email", NoBody, { email, next }).then(
      () => true,
      () => false,
    );
    setState(sent ? "sent" : "failed");
  }

  if (state === "sent") {
    return (
      <p role="status" className="m-0 rounded-button bg-mint-soft px-4 py-3 text-center text-[14px] leading-[1.4] font-extrabold border-ink">
        {copy.emailSent(email)}
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <span className="text-center text-[13px] font-extrabold text-muted">{copy.orEmail}</span>
      <Field
        id="door-email"
        label={copy.emailLabel}
        type="email"
        required
        autoComplete="email"
        placeholder={copy.emailPlaceholder}
        value={email}
        onChange={(change) => setEmail(change.target.value)}
      />
      {state === "failed" && (
        <p role="alert" className="m-0 text-center text-[13px] font-extrabold text-coral">
          {copy.emailFailed}
        </p>
      )}
      <Button type="submit" disabled={state === "sending"} height={48}>
        {state === "sending" ? copy.emailSending : copy.emailCta}
      </Button>
    </form>
  );
}
