"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};
// iPhone Safari has no Fullscreen API for pages, so the button stays out instead of doing nothing.
const canFullscreen = () => document.fullscreenEnabled;

export function FullscreenButton({ label, className }: { label: string; className: string }) {
  const supported = useSyncExternalStore(noSubscription, canFullscreen, () => false);
  if (!supported) return null;
  // A refused request (no user gesture, kiosk policy) leaves the page as it is; there is nothing else to do.
  const enter = () => void document.documentElement.requestFullscreen().catch(() => undefined);
  return (
    <button type="button" className={className} onClick={enter}>
      {label}
    </button>
  );
}
