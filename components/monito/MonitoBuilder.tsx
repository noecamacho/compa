"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/ui/Header";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { useHydrated } from "@/components/ui/useHydrated";
import { apiCall } from "@/lib/api/client";
import { AvatarMode, Me, type AvatarModeT, type MeT } from "@/lib/api/schemas";
import { useCopy } from "@/components/LocaleProvider";
import { errorText } from "@/lib/api/error-text";
import { forgetDraft, recallDraft, rememberDraft } from "@/lib/draft-store";
import {
  BODIES,
  BODY_HAIR,
  DEFAULT_BUILDER,
  EXTRA_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_OPTIONS,
  SHIRT_OPTIONS,
  SKIN_OPTIONS,
  builderFromLook,
  lookFromBuilder,
  randomBuilder,
  type BuilderState,
} from "@/lib/monito/look";
import { Avatar } from "./Avatar";
import { Monito } from "./Monito";
import { HIT_AREA } from "@/components/ui/hit-area";

type Props = { me: MeT; next: string; back: string; onboarding: boolean };

type SwatchProps = { hex: string; name: string; checked: boolean; onPick: () => void };

function Swatch({ hex, name, checked, onPick }: SwatchProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={name}
      onClick={onPick}
      className={`${HIT_AREA} h-8 w-8 shrink-0 cursor-pointer rounded-full p-0 border-ink transition-[box-shadow,transform] duration-200 active:scale-90`}
      style={{ background: hex, boxShadow: checked ? "0 0 0 3px #FFFFFF, 0 0 0 5px #1E1B2E" : "0 0 0 0 #FFFFFF, 0 0 0 0 #1E1B2E" }}
    />
  );
}

type OptionChipProps = { label: string; on: boolean; onClick: () => void; role?: "radio"; pressed?: boolean };

function OptionChip({ label, on, onClick, role }: OptionChipProps) {
  const state = role === "radio" ? { role, "aria-checked": on } : { "aria-pressed": on };
  return (
    <button
      type="button"
      {...state}
      onClick={onClick}
      className={`${HIT_AREA} h-8 cursor-pointer rounded-[10px] px-[11px] font-body text-[12px] font-extrabold whitespace-nowrap border-ink transition-[background-color,color,transform] duration-200 active:scale-95`}
      style={{ background: on ? "#1E1B2E" : "#FFFFFF", color: on ? "#FFF6E5" : "#1E1B2E" }}
    >
      {label}
    </button>
  );
}

function Row({ label, children, first = false }: { label: string; children: React.ReactNode; first?: boolean }) {
  return (
    <div className={`flex min-h-10 items-center gap-[10px] ${first ? "" : "dashed-ink pt-2"}`}>
      <SectionLabel className="w-[62px] shrink-0">{label}</SectionLabel>
      <div className="flex flex-1 flex-wrap items-center gap-2" role="group" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

type ChoiceProps = { title: string; hint: string; on: boolean; disabled?: boolean; onPick: () => void };

function Choice({ title, hint, on, disabled = false, onPick }: ChoiceProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={disabled}
      onClick={onPick}
      className="flex min-h-[54px] cursor-pointer flex-col items-start justify-center gap-[2px] rounded-button px-[14px] py-2 text-left border-ink shadow-hard-2 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: on ? "#1E1B2E" : "#FFFFFF", color: on ? "#FFF6E5" : "#1E1B2E" }}
    >
      <span className="font-display text-[16px] leading-[1.1] font-bold">{title}</span>
      <span className="text-[12px] font-extrabold opacity-80">{hint}</span>
    </button>
  );
}

// Preselect the LinkedIn photo when there is one (captain decision); the API already reports `monito` without a photo.
const initialMode = (me: MeT): AvatarModeT => (me.photoUrl ? (me.avatarMode ?? "photo") : "monito");

const DRAFT = "monito";

const Draft = z.object({
  state: z.object({
    body: z.enum(BODIES),
    skin: z.string(),
    hair: z.enum(HAIR_OPTIONS),
    hairColor: z.string(),
    shirt: z.string(),
    extras: z.object({ cap: z.boolean(), glasses: z.boolean(), beard: z.boolean() }),
  }),
  mode: AvatarMode,
});
type DraftT = z.infer<typeof Draft>;

// 02b Monito: few options on purpose (README "Monito"); the rest is earned by connecting. Choices survive a reload or
// going back (sessionStorage draft): the builder mounts from the server data, then again in the browser from the draft.
export function MonitoBuilder(props: Props) {
  const hydrated = useHydrated();
  const draft = useMemo(() => (hydrated ? recallDraft(DRAFT, props.me.id, Draft) : null), [hydrated, props.me.id]);
  return <Builder key={hydrated ? "browser" : "server"} {...props} draft={draft} restored={hydrated} />;
}

function Builder({ me, next, back, onboarding, draft, restored }: Props & { draft: DraftT | null; restored: boolean }) {
  const all = useCopy();
  const copy = all.monito;
  const router = useRouter();
  const base = me.avatar;
  // The server render and hydration must agree, so the random first look is drawn only in the browser mount.
  const [state, setState] = useState<BuilderState>(() => draft?.state ?? (base ? builderFromLook(base) : restored ? randomBuilder() : DEFAULT_BUILDER));
  const [mode, setMode] = useState<AvatarModeT>(() => draft?.mode ?? initialMode(me));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const look = lookFromBuilder(state, base);

  useEffect(() => {
    if (restored) rememberDraft(DRAFT, me.id, { state, mode });
  }, [restored, me.id, state, mode]);
  const usePhoto = mode === "photo" && Boolean(me.photoUrl);
  const toggleExtra = (key: (typeof EXTRA_OPTIONS)[number]) => setState((prev) => ({ ...prev, extras: { ...prev.extras, [key]: !prev.extras[key] } }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // The look is always saved: everyone gets a monito, even when the LinkedIn photo is what others see.
      await apiCall("PATCH", "/api/me", Me, { avatar: look, avatarMode: usePhoto ? "photo" : "monito" });
      forgetDraft(DRAFT, me.id);
      router.push(next);
    } catch (caught) {
      setError(errorText(all, caught));
      setSaving(false);
    }
  }

  return (
    <Screen data-restored={restored ? "1" : undefined}>
      <Header
        back={back}
        title={copy.title}
        titleSize={22}
        right={
          <IconButton label={copy.random} onClick={() => setState(randomBuilder(state.body))}>
            <Icon name="dice" size={20} />
          </IconButton>
        }
      />
      {/* Phone: one column. From 834: the preview stays in view on the left while the options scroll on the right. */}
      <div className="flex flex-1 flex-col gap-[14px] md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start md:gap-6">
        <div className="flex flex-col gap-[14px] md:sticky md:top-[76px]">
          <div role="radiogroup" aria-label={copy.choiceLabel} className="grid grid-cols-2 gap-[10px]">
            <Choice title={copy.usePhoto} hint={me.photoUrl ? copy.usePhotoHint : copy.noPhoto} on={usePhoto} disabled={!me.photoUrl} onPick={() => setMode("photo")} />
            <Choice title={copy.createMonito} hint={copy.createMonitoHint} on={!usePhoto} onPick={() => setMode("monito")} />
          </div>
          <div className="flex items-center gap-4 rounded-card bg-sun-soft px-4 py-3 border-ink shadow-hard-4 md:flex-col md:items-stretch md:py-4">
            <span className="flex h-[150px] w-[124px] shrink-0 items-end justify-center rounded-[18px] bg-white pb-[6px] border-ink md:h-[210px] md:w-full">
              {/* Keyed by the look so the monito bounces every time an option changes. */}
              <span key={JSON.stringify(look)} className="animate-bump block origin-bottom">
                <Monito look={look} px={7} label={copy.labelOwn} />
              </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[6px]">
              <span className="flex items-center gap-2">
                {usePhoto && <Avatar person={{ name: me.name, photoUrl: me.photoUrl, avatarMode: "photo" }} size={32} shadow={2} />}
                <span className="font-display text-[22px] leading-[1.1] font-bold">{me.name}</span>
              </span>
              <Muted className="text-[13px] leading-[1.35] font-bold">{usePhoto ? copy.hintPhoto : copy.hint}</Muted>
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-[14px]">
          <div className="flex flex-col gap-2 rounded-button bg-white px-3 py-[10px] border-ink shadow-hard-3">
            <Row label={copy.body} first>
              {BODIES.map((option) => (
                <OptionChip key={option} role="radio" label={copy.bodyNames[option]} on={state.body === option} onClick={() => setState({ ...state, body: option, hair: BODY_HAIR[option] })} />
              ))}
            </Row>
            <Row label={copy.skin}>
              {SKIN_OPTIONS.map((option) => (
                <Swatch key={option.key} hex={option.hex} name={copy.skinNames[option.key]} checked={state.skin === option.hex} onPick={() => setState({ ...state, skin: option.hex })} />
              ))}
            </Row>
            <Row label={copy.hair}>
              {HAIR_OPTIONS.map((option) => (
                <OptionChip key={option} role="radio" label={copy.hairNames[option]} on={state.hair === option} onClick={() => setState({ ...state, hair: option })} />
              ))}
            </Row>
            <Row label={copy.hairColor}>
              {HAIR_COLOR_OPTIONS.map((option) => (
                <Swatch key={option.key} hex={option.hex} name={copy.hairColorNames[option.key]} checked={state.hairColor === option.hex} onPick={() => setState({ ...state, hairColor: option.hex })} />
              ))}
            </Row>
            <Row label={copy.shirt}>
              {SHIRT_OPTIONS.map((option) => (
                <Swatch key={option.key} hex={option.hex} name={copy.shirtNames[option.key]} checked={state.shirt === option.hex} onPick={() => setState({ ...state, shirt: option.hex })} />
              ))}
            </Row>
            <Row label={copy.extras}>
              {EXTRA_OPTIONS.map((option) => (
                <OptionChip key={option} label={copy.extraNames[option]} on={state.extras[option]} onClick={() => toggleExtra(option)} />
              ))}
            </Row>
          </div>
          <div className="mt-auto flex flex-col gap-[10px] md:mt-2">
            {error && (
              <span role="alert" className="text-center text-[12px] font-extrabold text-coral">
                {error}
              </span>
            )}
            <Button variant="primary" onClick={save} disabled={saving}>
              {copy.done}
            </Button>
            {onboarding && <Muted className="self-center text-[12px] font-extrabold">{copy.step}</Muted>}
          </div>
        </div>
      </div>
    </Screen>
  );
}
