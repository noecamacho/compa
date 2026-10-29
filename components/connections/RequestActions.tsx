"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { apiCall } from "@/lib/api/client";
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
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(null);
    }
  }

  async function decline() {
    setBusy("decline");
    try {
      await apiCall("POST", `/api/connections/${connectionId}/decline`, z.undefined());
    } finally {
      router.push("/home");
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
