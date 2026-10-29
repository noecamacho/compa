"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";

type Props = { open: boolean; onClose: () => void; title: string; closeLabel: string; children: ReactNode };

// A non-destructive modal task (check someone in, assign an organizer). Native <dialog>: focus trap, Esc and focus return
// for free. A bottom sheet on a phone (thumb reach), centered from 768 px, like ConfirmDialog.
export function PickDialog({ open, onClose, title, closeLabel, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!open && dialog.open) dialog.close();
    if (!open || dialog.open) return;
    dialog.showModal();
    // The search box, not the close button the browser would pick (React's autoFocus fires before showModal).
    (dialog.querySelector("input") ?? dialog.querySelector("select"))?.focus();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => event.target === ref.current && onClose()}
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card bg-white p-0 text-ink border-ink backdrop:bg-ink/50 md:m-auto md:max-w-[520px] md:rounded-card md:shadow-hard-4"
    >
      <div className="flex flex-col gap-4 px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="m-0 font-display text-[22px] leading-[1.15] font-bold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={closeLabel} title={closeLabel} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[12px] hover:bg-sun-soft">
            <Icon name="close" size={22} />
          </button>
        </div>
        {open && children}
      </div>
    </dialog>
  );
}
