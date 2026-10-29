"use client";

import { useRouter } from "next/navigation";
import { createElement, useState, type ReactNode } from "react";
import { ConfirmDialog, type ConfirmSpec } from "./ConfirmDialog";

export type Outcome = { confirm?: ConfirmSpec; done?: string };

// One admin write at a time: confirm (when the stakes call for it), run, refresh the server data, then say what happened.
// `dialog` must be rendered by the caller; `notice` goes in an aria-live region.
export function useAdminAction(failedText: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [spec, setSpec] = useState<ConfirmSpec | null>(null);
  const [open, setOpen] = useState(false);
  const [resolver, setResolver] = useState<((confirmed: boolean) => void) | null>(null);

  const ask = (next: ConfirmSpec) =>
    new Promise<boolean>((resolve) => {
      setSpec(next);
      setResolver(() => resolve);
      setOpen(true);
    });

  const answer = (confirmed: boolean) => {
    setOpen(false);
    resolver?.(confirmed);
  };

  async function run(action: () => Promise<unknown>, { confirm, done }: Outcome = {}): Promise<boolean> {
    if (confirm && !(await ask(confirm))) return false;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      router.refresh();
      setNotice(done ?? null);
      return true;
    } catch {
      setError(failedText);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const dialog: ReactNode = createElement(ConfirmDialog, { spec, open, onAnswer: answer });
  return { busy, error, notice, run, dialog };
}
