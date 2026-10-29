import { Icon } from "@/components/icons";
import { Pill } from "@/components/ui/Pill";

// Marks a connection made outside an event, which pays no points (wiki/points-rules.md).
export function OutsideEventTag({ label }: { label: string }) {
  return (
    <Pill tone="paper" kind="text" height={28} shadow={false} className="rounded-[9px] px-[9px] text-[11px]" style={{ borderWidth: 2 }}>
      <Icon name="calendar" size={12} strokeWidth={2.8} />
      {label}
    </Pill>
  );
}
