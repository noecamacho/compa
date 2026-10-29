"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { copyFor } from "@/lib/copy";
import { pickLocale } from "@/lib/i18n";

// A failed load keeps the console frame (nav stays usable) and offers the one way forward.
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  const [locale] = useState(() => pickLocale(typeof navigator === "undefined" ? [] : navigator.languages));
  const copy = copyFor(locale).admin;
  return (
    <AdminShell copy={copy} locale={locale}>
      <div role="alert" className="flex max-w-[480px] flex-col items-start gap-3">
        <h1 className="m-0 font-display text-[26px] leading-[1.1] font-bold">{copy.ui.pageError.title}</h1>
        <p className="m-0 text-[15px] font-bold text-muted">{copy.ui.pageError.body}</p>
        <Button variant="primary" height={48} className="w-auto! px-6" onClick={reset}>
          {copy.ui.retry}
        </Button>
      </div>
    </AdminShell>
  );
}
