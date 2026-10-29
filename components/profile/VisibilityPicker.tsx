"use client";

import { Segmented } from "@/components/ui/Segmented";
import { useCopy } from "@/components/LocaleProvider";
import { VISIBILITY_LEVELS, type Visibility } from "@/lib/profile-fields";

type Props = { item: string; value: Visibility; onChange: (value: Visibility) => void };

// Todos / Conexiones / Solo yo for one field or link (data model §4.5); the server enforces it in toCard.
export function VisibilityPicker({ item, value, onChange }: Props) {
  const copy = useCopy().visibility;
  const options = VISIBILITY_LEVELS.map((level) => ({ value: level, label: copy.levels[level] }));
  return <Segmented options={options} value={value} onChange={onChange} label={copy.pickerLabel(item)} height={30} />;
}

// The three levels spelled out once per screen, so the short labels are never a guess.
export function VisibilityLegend() {
  const copy = useCopy().visibility;
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[12px] leading-[1.35] font-bold text-muted">
      {VISIBILITY_LEVELS.map((level) => (
        <li key={level}>{copy.legend[level]}</li>
      ))}
    </ul>
  );
}
