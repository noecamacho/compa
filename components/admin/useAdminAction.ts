"use client";

import { useRouter } from "next/navigation";
import { createElement, useState, type ReactNode } from "react";
import { ApiClientError } from "@/lib/api/client";
import { ConfirmDialog, type ConfirmSpec } from "./ConfirmDialog";

// `errors` maps an API error to its own message instead of the generic failure: by code (`attendee_not_found`) first,
// then by status (`404`: the gate's answer once the session is gone, edge case 29).
export type Outcome = { confirm?: ConfirmSpec; done?: string; errors?: Record<string, string> };
// `summary` gets the items that failed (empty when every one succeeded) and says what happened.
export type ManyOutcome<T> = { confirm?: ConfirmSpec; summary: (failed: T[]) => string };

const BULK_CHUNK = 3;

const byCode = (error: unknown, errors: Record<string, string>) => (error instanceof ApiClientError ? errors[error.code] : undefined);
const byStatus = (error: unknown, errors: Record<string, string>) => (error instanceof ApiClientError ? errors[String(error.status)] : undefined);

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

  async function run(action: () => Promise<unknown>, { confirm, done, errors }: Outcome = {}): Promise<boolean> {
    if (confirm && !(await ask(confirm))) return false;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      router.refresh();
      setNotice(done ?? null);
      return true;
    } catch (caught) {
      const known = byCode(caught, errors ?? {});
      // A known code means the data moved on (someone else removed them): show the server's truth. A bare status
      // (an expired session) must not refresh, or the page turns into a 404 with no explanation.
      if (known) router.refresh();
      setError(known ?? byStatus(caught, errors ?? {}) ?? failedText);
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Bulk writes (spec §5.1, edge case 23): one confirm, then the items in chunks of 3 so the API is not flooded, one
  // refresh, one notice built from the failures. Succeeded items are not rolled back. Resolves false when cancelled.
  async function runMany<T>(items: T[], action: (item: T) => Promise<unknown>, { confirm, summary }: ManyOutcome<T>): Promise<boolean> {
    if (confirm && !(await ask(confirm))) return false;
    setBusy(true);
    setError(null);
    setNotice(null);
    const failed: T[] = [];
    for (let start = 0; start < items.length; start += BULK_CHUNK) {
      const chunk = items.slice(start, start + BULK_CHUNK);
      const results = await Promise.allSettled(chunk.map(action));
      failed.push(...chunk.filter((_, index) => results[index]?.status === "rejected"));
    }
    router.refresh();
    if (failed.length) setError(summary(failed));
    else setNotice(summary(failed));
    setBusy(false);
    return true;
  }

  // A result that needs no server write (a copied link): the same live regions, no refresh. `dismiss` clears both.
  const announce = (text: string, tone: "success" | "error" = "success") => {
    setError(tone === "error" ? text : null);
    setNotice(tone === "success" ? text : null);
  };
  const dismiss = () => {
    setError(null);
    setNotice(null);
  };

  const dialog: ReactNode = createElement(ConfirmDialog, { spec, open, onAnswer: answer });
  return { busy, error, notice, run, runMany, announce, dismiss, dialog };
}
