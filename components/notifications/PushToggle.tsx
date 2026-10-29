"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push/client";

// Turns Web Push on or off for this browser, and says plainly why it cannot when it cannot (T-080).
export function PushToggle({ locale }: { locale: Locale }) {
  const copy = copyFor(locale).notifications;
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void pushState().then(setState, () => setState("unsupported"));
  }, []);

  async function run(action: () => Promise<PushState>) {
    setBusy(true);
    setFailed(false);
    try {
      setState(await action());
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  if (state === null) return null;
  const note = { unsupported: copy.pushUnsupported, install: copy.pushInstall, denied: copy.pushDenied, on: copy.pushOn, off: copy.pushHint }[state];
  return (
    <Card tone={state === "on" ? "mint-soft" : "sun-soft"} size="sm" className="flex flex-col gap-2 px-4 py-3">
      <span className="font-display text-[17px] leading-tight font-bold">{copy.pushTitle}</span>
      <span data-testid="push-state" data-state={state} className="text-[13px] font-extrabold">
        {failed ? copy.pushFailed : note}
      </span>
      {state === "off" && (
        <Button variant="primary" height={46} disabled={busy} onClick={() => run(() => enablePush(locale))}>
          {copy.pushEnable}
        </Button>
      )}
      {state === "on" && (
        <Button height={46} disabled={busy} onClick={() => run(disablePush)}>
          {copy.pushDisable}
        </Button>
      )}
    </Card>
  );
}
