import { Pill } from "@/components/ui/Pill";
import type { Tone } from "@/components/ui/Card";
import type { EventStatusT } from "@/lib/api/admin-schemas";
import type { Dictionary } from "@/lib/copy";

const TONE: Record<EventStatusT, Tone> = { draft: "sky-soft", live: "mint", ended: "sun-soft", archived: "white" };

export function StatusPill({ status, copy }: { status: EventStatusT; copy: Dictionary["admin"] }) {
  return (
    <Pill tone={TONE[status]} shadow={false}>
      {copy.status[status]}
    </Pill>
  );
}

export function TestPill({ label }: { label: string }) {
  return (
    <Pill tone="gum-soft" shadow={false}>
      {label}
    </Pill>
  );
}
