"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useUserEvent } from "@/components/notifications/LiveNotifications";
import { apiCall } from "@/lib/api/client";
import { ConnectionDetail } from "@/lib/api/schemas";

const POLL_MS = 3000;

// While a request is pending, re-renders the confirmation as soon as the other person answers (gap analysis U16):
// at once on the Realtime `request.accepted`, else on the next poll.
export function PendingWatcher({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const check = useCallback(async () => {
    const detail = await apiCall("GET", `/api/connections/${connectionId}`, ConnectionDetail).catch(() => null);
    if (detail && detail.status !== "pending") router.refresh();
  }, [connectionId, router]);
  useUserEvent((event) => {
    if (event === "request.accepted") void check();
  });
  useEffect(() => {
    const timer = setInterval(check, POLL_MS);
    return () => clearInterval(timer);
  }, [check]);
  return null;
}
