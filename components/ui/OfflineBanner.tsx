"use client";

import { useSyncExternalStore } from "react";
import { useCopy } from "@/components/LocaleProvider";

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

// A clear state for every screen while the device has no network: a status strip at the top (no spinner, no blank page).
export function OfflineBanner() {
  const copy = useCopy().offline;
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 top-0 z-40 flex justify-center px-[18px] pt-2">
      <span className="inline-flex min-h-9 items-center rounded-[12px] bg-coral-soft px-3 text-center text-[12px] leading-[1.3] font-extrabold border-ink shadow-hard-2">
        {copy.banner}
      </span>
    </div>
  );
}
