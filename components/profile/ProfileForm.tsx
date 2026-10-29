"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Header } from "@/components/ui/Header";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { apiCall } from "@/lib/api/client";
import { Me, VisibilitySettings, type MeT, type VisibilitySettingsT } from "@/lib/api/schemas";
import { profile } from "@/lib/copy/es";
import { LinkToggles, SHARED_NETWORKS, type SharedFlags } from "./LinkToggles";

type Props = { me: MeT; next: string; back: string; onboarding: boolean };

const flagsFrom = (visibility: VisibilitySettingsT): SharedFlags =>
  Object.fromEntries(SHARED_NETWORKS.map((key) => [key, visibility.links[key] !== "hidden"])) as SharedFlags;

const visibilityFrom = (flags: SharedFlags) =>
  Object.fromEntries(SHARED_NETWORKS.map((key) => [key, flags[key] ? "connections" : "hidden"]));

// 02 Perfil: LinkedIn data, editable, plus which networks are shared. Also reached from "Editar perfil".
export function ProfileForm({ me, next, back, onboarding }: Props) {
  const router = useRouter();
  const [fields, setFields] = useState({ name: me.name, headline: me.headline ?? "", company: me.company ?? "", city: me.city ?? "" });
  const [flags, setFlags] = useState<SharedFlags>(flagsFrom(me.visibility));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof typeof fields) => (event: FormEvent<HTMLInputElement>) =>
    setFields({ ...fields, [key]: event.currentTarget.value });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiCall("PATCH", "/api/me", Me, fields);
      await apiCall("PATCH", "/api/me/visibility", VisibilitySettings, { links: visibilityFrom(flags) });
      router.push(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Header
        back={back}
        right={
          <Pill tone="sky-soft" kind="text" height={30} shadow={false} className="rounded-[10px] text-[12px]" style={{ borderWidth: 2 }}>
            <Icon name="check" size={13} strokeWidth={3} />
            {profile.fromLinkedIn}
          </Pill>
        }
      />
      <div className="flex flex-col gap-[2px]">
        <h1 className="m-0 font-display text-[28px] leading-[1.1] font-bold">{profile.title}</h1>
        <Muted className="text-[14px] font-bold">{profile.subtitle}</Muted>
      </div>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-[14px]">
        <div className="flex flex-col gap-[10px]">
          <Field id="name" label={profile.name} value={fields.name} onInput={update("name")} required />
          <div className="grid grid-cols-2 gap-[10px]">
            <Field id="headline" label={profile.role} value={fields.headline} onInput={update("headline")} />
            <Field id="company" label={profile.company} value={fields.company} onInput={update("company")} />
          </div>
          <Field id="city" label={profile.city} value={fields.city} onInput={update("city")} />
        </div>
        <div className="flex flex-col gap-2 rounded-button bg-white px-[14px] py-3 border-ink shadow-hard-3">
          <span className="flex items-baseline justify-between gap-2">
            <SectionLabel>{profile.linksLabel}</SectionLabel>
            <Muted className="text-[11px] font-extrabold whitespace-nowrap">{profile.linksOnlyConnections}</Muted>
          </span>
          <LinkToggles value={flags} onChange={setFlags} label={profile.linksLabel} />
          <Muted className="text-[12px] font-bold">{profile.linksHint}</Muted>
        </div>
        <div className="mt-auto flex flex-col gap-[10px]">
          {error && <span className="text-center text-[12px] font-extrabold text-coral">{error}</span>}
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? profile.saving : onboarding ? profile.next : profile.save}
            {!saving && onboarding && <Icon name="chevronRight" size={18} strokeWidth={3} />}
          </Button>
          {onboarding && <Muted className="self-center text-[12px] font-extrabold">{profile.step}</Muted>}
        </div>
      </form>
    </Screen>
  );
}
