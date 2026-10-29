"use client";

import { NETWORK_COLOR, NetworkIcon } from "@/components/brand/NetworkIcon";
import { Icon } from "@/components/icons";
import { Field } from "@/components/ui/Field";
import { useCopy } from "@/components/LocaleProvider";
import type { LinkKey, Visibility } from "@/lib/profile-fields";
import { VisibilityPicker } from "./VisibilityPicker";

const INPUT_MODE: Partial<Record<LinkKey, "tel" | "url">> = { whatsapp: "tel", web: "url" };

type Props = {
  network: LinkKey;
  value: string;
  level: Visibility;
  // Shown only once the person left the field or tried to save.
  error: boolean;
  // The value a "Quitar" just cleared, kept until save so "Deshacer" can bring it back.
  removed: string | undefined;
  onValue: (value: string) => void;
  onBlur: () => void;
  onLevel: (level: Visibility) => void;
  onRemove: () => void;
  onUndo: () => void;
};

// One network: its brand tile and name, the field, an explicit "Quitar" and who sees it (V2Perfil "Tus redes").
export function LinkEditor({ network, value, level, error, removed, onValue, onBlur, onLevel, onRemove, onUndo }: Props) {
  const { networks, profile: copy } = useCopy();
  const id = `link-${network}`;
  const name = networks[network];
  const filled = value.trim() !== "";
  return (
    <div className="flex flex-col gap-2" data-testid={id}>
      <div className="flex items-end gap-2">
        <span
          aria-hidden="true"
          className="box-border flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border-ink"
          style={{ background: NETWORK_COLOR[network].tint }}
        >
          <NetworkIcon network={network} />
        </span>
        <Field
          id={id}
          label={name}
          value={value}
          placeholder={copy.linkPlaceholder[network]}
          inputMode={INPUT_MODE[network]}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={200}
          aria-invalid={error}
          aria-describedby={error ? `${id}-error` : undefined}
          onInput={(event) => onValue(event.currentTarget.value)}
          onBlur={onBlur}
          className="flex-1"
        />
        {filled && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={copy.removeLabel(name)}
            className="box-border flex h-11 shrink-0 cursor-pointer items-center gap-1 rounded-[12px] bg-white px-3 text-[13px] font-extrabold text-ink border-ink active:scale-95"
          >
            <Icon name="trash" size={16} />
            {copy.remove}
          </button>
        )}
      </div>
      {error && (
        <span id={`${id}-error`} role="alert" className="text-[12px] font-extrabold text-coral">
          {copy.linkError[network]}
        </span>
      )}
      {removed !== undefined && !filled && (
        <span className="flex items-center justify-between gap-2 text-[12px] font-extrabold text-muted" role="status">
          {copy.removed(name)}
          <button type="button" onClick={onUndo} className="cursor-pointer rounded-[10px] bg-white px-3 py-1 text-[12px] font-extrabold text-ink border-ink">
            {copy.undo}
          </button>
        </span>
      )}
      {filled && <VisibilityPicker item={name} value={level} onChange={onLevel} />}
    </div>
  );
}
