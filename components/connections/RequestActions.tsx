"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ApiClientError, apiCall, errorText } from "@/lib/api/client";
import { Accepted } from "@/lib/api/schemas";
import { common, request as copy } from "@/lib/copy/es";

type Props = { connectionId: string };

// Accept (both earn the kind points) or decline silently (V2Solicitud).
export function RequestActions({ connectionId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy("accept");
    setError(null);
    try {
      await apiCall("POST", `/api/connections/${connectionId}/accept`, Accepted, {});
      router.push(`/connections/${connectionId}/done`);
    } catch (caught) {
      setError(errorText(caught));
      setBusy(null);
    }
  }

  // A failed decline stays on screen with the reason; only an answered request ("not_pending") is done anyway.
  async function decline() {
    setBusy("decline");
    setError(null);
    try {
      await apiCall("POST", `/api/connections/${connectionId}/decline`, z.undefined());
      router.push("/home");
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.code === "not_pending") return router.push("/home");
      setError(errorText(caught));
      setBusy(null);
    }
  }

  return (
    <div className="mt-auto flex flex-col gap-3 md:mt-4">
      {error && (
        <span role="alert" className="text-center text-[12px] font-extrabold text-coral">
          {error}
        </span>
      )}
      <Button variant="primary" onClick={accept} disabled={busy !== null}>
        <Icon name="check" size={20} strokeWidth={3} />
        {busy === "accept" ? copy.accepting : copy.accept}
      </Button>
      <Button onClick={decline} disabled={busy !== null}>
        {common.notNow}
      </Button>
    </div>
  );
}
