"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { apiCall } from "@/lib/api/client";
import { ConnectionDetail } from "@/lib/api/schemas";

const POLL_MS = 3000;

// While a request is pending, re-renders the confirmation as soon as the other person answers (gap analysis U16).
export function PendingWatcher({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(async () => {
      const detail = await apiCall("GET", `/api/connections/${connectionId}`, ConnectionDetail).catch(() => null);
      if (detail && detail.status !== "pending") router.refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [connectionId, router]);
  return null;
}
