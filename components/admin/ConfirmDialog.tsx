"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";

export type ConfirmSpec = { title: string; body: string; confirmLabel: string; cancelLabel: string; danger?: boolean };

// `spec` stays set while the dialog closes so its text does not blank out mid-animation.
type Props = { spec: ConfirmSpec | null; open: boolean; onAnswer: (confirmed: boolean) => void };

// Blocking confirmation for stakes a toast-with-undo cannot cover. The native <dialog> traps focus, closes on Esc and
// hands focus back to the button that opened it. Cancel carries autofocus so Enter never destroys by accident.
// A bottom sheet on a phone (thumb reach), a centered modal from 768 px.
export function ConfirmDialog({ spec, open, onAnswer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  // A page can hold several dialogs (event actions and people); fixed ids would label them all with the first title.
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      onCancel={(event) => {
        event.preventDefault();
        onAnswer(false);
      }}
      onClick={(event) => event.target === ref.current && onAnswer(false)}
      className="m-0 mt-auto w-full max-w-none rounded-t-card bg-white p-0 text-ink border-ink backdrop:bg-ink/50 md:m-auto md:max-w-[440px] md:rounded-card md:shadow-hard-4"
    >
      <div className="flex flex-col gap-3 px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <h2 id={`${id}-title`} className="m-0 font-display text-[22px] leading-[1.15] font-bold">
          {spec?.title}
        </h2>
        <p id={`${id}-body`} className="m-0 text-[15px] leading-[1.4] font-bold text-muted">
          {spec?.body}
        </p>
        <div className="mt-2 flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Button height={48} className="md:w-auto!" autoFocus onClick={() => onAnswer(false)}>
            {spec?.cancelLabel}
          </Button>
          <Button height={48} variant={spec?.danger ? "ink" : "primary"} className="md:w-auto!" onClick={() => onAnswer(true)}>
            {spec?.confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
