"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useUserEvent } from "@/components/notifications/LiveNotifications";
import { apiCall } from "@/lib/api/client";
import { ConnectionDetail } from "@/lib/api/schemas";
import { usePoll } from "@/lib/use-poll";

const POLL_MS = 3000;

// While a request is pending, re-renders the confirmation as soon as the other person answers (gap analysis U16):
// at once on the Realtime `request.accepted`, else on the next poll (shared poller: hidden-tab pause, backoff, jitter).
export function PendingWatcher({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const check = useCallback(
    async (signal?: AbortSignal) => {
      const detail = await apiCall("GET", `/api/connections/${connectionId}`, ConnectionDetail, undefined, { signal });
      if (detail.status !== "pending") router.refresh();
    },
    [connectionId, router],
  );
  useUserEvent((event) => {
    if (event === "request.accepted") void check().catch(() => undefined);
  });
  usePoll(check, POLL_MS);
  return null;
}
