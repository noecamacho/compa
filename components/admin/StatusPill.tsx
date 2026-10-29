import { Pill } from "@/components/ui/Pill";
import type { Tone } from "@/components/ui/Card";
import type { EventStatusT } from "@/lib/api/admin-schemas";
import type { Dictionary } from "@/lib/copy";

const TONE: Record<EventStatusT, Tone> = { draft: "sky-soft", live: "mint", ended: "sun-soft", archived: "white" };

// The derived phase of lib/admin/event-phase.ts (spec §6.2): what admins act on, rather than the stored status.
export type EventPhaseName = "draft" | "upcoming" | "running" | "ended" | "archived";

const PHASE_LOOK: Record<EventPhaseName, { tone: Tone; className?: string }> = {
  running: { tone: "mint" },
  upcoming: { tone: "sky-soft" },
  draft: { tone: "white", className: "border-dashed!" },
  ended: { tone: "sun-soft" },
  archived: { tone: "paper", className: "text-muted!" },
};

type Props = { copy: Dictionary["admin"] } & ({ status: EventStatusT; phase?: never } | { phase: EventPhaseName; status?: never });

// Always text, never color alone (spec §6.4); the running dot is decorative.
export function StatusPill({ status, phase, copy }: Props) {
  if (phase) {
    const look = PHASE_LOOK[phase];
    return (
      <Pill tone={look.tone} shadow={false} className={look.className}>
        {phase === "running" && <span aria-hidden className="size-2 rounded-full bg-ink" />}
        {copy.ui.phase[phase]}
      </Pill>
    );
  }
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
