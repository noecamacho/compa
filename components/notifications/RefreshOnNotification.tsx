"use client";

import { useRouter } from "next/navigation";
import { useUserEvent } from "./LiveNotifications";

// Re-renders a server-rendered screen (the /notifications list) when something new reaches my channel.
export function RefreshOnNotification() {
  const router = useRouter();
  useUserEvent((event) => {
    if (event !== "notifications.seen") router.refresh();
  });
  return null;
}
