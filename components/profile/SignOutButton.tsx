"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { apiCall } from "@/lib/api/client";
import { NoBody } from "@/lib/api/route-spec";
import { me as copy } from "@/lib/copy/es";

// Two taps on purpose: getting back in needs the event QR, so signing out by accident is costly.
export function SignOutButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    // A 401 means the session was already gone; either way the person ends up signed out.
    await apiCall("POST", "/api/auth/signout", NoBody).catch(() => undefined);
    router.replace("/");
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button height={46} onClick={() => setConfirming(true)}>
        {copy.signOut}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-[10px]" role="group" aria-label={copy.signOut}>
      <span className="text-center text-[13px] font-extrabold text-muted">{copy.signOutWarning}</span>
      <div className="flex gap-[10px]">
        <Button height={46} onClick={() => setConfirming(false)} disabled={busy}>
          {copy.signOutCancel}
        </Button>
        <Button variant="ink" height={46} onClick={signOut} disabled={busy}>
          {copy.signOutConfirm}
        </Button>
      </div>
    </div>
  );
}
