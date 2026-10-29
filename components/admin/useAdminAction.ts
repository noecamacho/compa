"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// One admin write at a time: confirm, run, refresh the server data, or show the failure.
export function useAdminAction(failedText: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, confirmText?: string): Promise<boolean> {
    if (confirmText && !window.confirm(confirmText)) return false;
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
      return true;
    } catch {
      setError(failedText);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, run };
}
