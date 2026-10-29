"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Header } from "@/components/ui/Header";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { useHydrated } from "@/components/ui/useHydrated";
import { apiCall, errorMessage } from "@/lib/api/client";
import { Me, VisibilitySettings, type MeT, type VisibilitySettingsT } from "@/lib/api/schemas";
import { profile } from "@/lib/copy/es";
import { forgetDraft, recallDraft, rememberDraft } from "@/lib/draft-store";
import { checkLink, displayLink } from "@/lib/links";
import { LinkToggles, SHARED_NETWORKS, type SharedFlags, type SharedNetwork, type SharedProblems, type SharedValues } from "./LinkToggles";

type Props = { me: MeT; next: string; back: string; onboarding: boolean };

const DRAFT = "profile";

const Draft = z.object({
  fields: z.object({ name: z.string(), headline: z.string(), company: z.string(), city: z.string() }),
  flags: z.record(z.enum(SHARED_NETWORKS), z.boolean()),
  values: z.record(z.enum(SHARED_NETWORKS), z.string()),
});
type DraftT = z.infer<typeof Draft>;

const flagsFrom = (visibility: VisibilitySettingsT): SharedFlags =>
  Object.fromEntries(SHARED_NETWORKS.map((key) => [key, visibility.links[key] !== "hidden"])) as SharedFlags;

const valuesFrom = (me: MeT): SharedValues => Object.fromEntries(SHARED_NETWORKS.map((key) => [key, displayLink(key, me.links?.[key])])) as SharedValues;

const visibilityFrom = (flags: SharedFlags) =>
  Object.fromEntries(SHARED_NETWORKS.map((key) => [key, flags[key] ? "connections" : "hidden"]));

// Problems in the handles of the networks that are on; an off network is not checked.
function problemsIn(flags: SharedFlags, values: SharedValues): SharedProblems {
  const problems: SharedProblems = {};
  for (const key of SHARED_NETWORKS) {
    if (!flags[key]) continue;
    const check = checkLink(key, values[key]);
    if (!check.ok) problems[key] = check.problem;
  }
  return problems;
}

// What to store: the checked short form for networks that are on, nothing for the ones turned off.
const linksPatch = (flags: SharedFlags, values: SharedValues) =>
  Object.fromEntries(
    SHARED_NETWORKS.map((key) => {
      const check = checkLink(key, values[key]);
      return [key, flags[key] && check.ok ? check.value : ""];
    }),
  );

const initialDraft = (me: MeT): DraftT => ({
  fields: { name: me.name, headline: me.headline ?? "", company: me.company ?? "", city: me.city ?? "" },
  flags: flagsFrom(me.visibility),
  values: valuesFrom(me),
});

// 02 Perfil: LinkedIn data, editable, plus which networks are shared and their handles. Also reached from "Editar perfil".
// What is typed survives a reload or going back (sessionStorage draft) until it is saved: the form mounts once
// from the server data, then again in the browser from the draft when there is one.
export function ProfileForm(props: Props) {
  const hydrated = useHydrated();
  const draft = useMemo(() => (hydrated ? recallDraft(DRAFT, props.me.id, Draft) : null), [hydrated, props.me.id]);
  return <Form key={hydrated ? "browser" : "server"} {...props} initial={draft ?? initialDraft(props.me)} restored={hydrated} />;
}

function Form({ me, next, back, onboarding, initial, restored }: Props & { initial: DraftT; restored: boolean }) {
  const router = useRouter();
  const [fields, setFields] = useState(initial.fields);
  const [flags, setFlags] = useState<SharedFlags>(initial.flags as SharedFlags);
  const [values, setValues] = useState<SharedValues>(initial.values as SharedValues);
  const [problems, setProblems] = useState<SharedProblems>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (restored) rememberDraft(DRAFT, me.id, { fields, flags, values });
  }, [restored, me.id, fields, flags, values]);

  const update = (key: keyof typeof fields) => (event: FormEvent<HTMLInputElement>) =>
    setFields({ ...fields, [key]: event.currentTarget.value });

  const setValue = (key: SharedNetwork, value: string) => {
    setValues({ ...values, [key]: value });
    if (problems[key]) setProblems({ ...problems, [key]: undefined });
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = problemsIn(flags, values);
    setProblems(found);
    if (Object.values(found).some(Boolean)) return;
    setSaving(true);
    setError(null);
    try {
      await apiCall("PATCH", "/api/me", Me, { ...fields, links: linksPatch(flags, values) });
      await apiCall("PATCH", "/api/me/visibility", VisibilitySettings, { links: visibilityFrom(flags) });
      forgetDraft(DRAFT, me.id);
      router.push(next);
    } catch (caught) {
      setError(errorMessage(caught));
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
      <form onSubmit={submit} className="flex flex-1 flex-col gap-[14px]" data-restored={restored ? "1" : undefined}>
        <div className="flex flex-col gap-[10px]">
          <Field id="name" label={profile.name} value={fields.name} onInput={update("name")} required maxLength={80} />
          <div className="grid grid-cols-2 gap-[10px]">
            <Field id="headline" label={profile.role} value={fields.headline} onInput={update("headline")} maxLength={120} />
            <Field id="company" label={profile.company} value={fields.company} onInput={update("company")} maxLength={80} />
          </div>
          <Field id="city" label={profile.city} value={fields.city} onInput={update("city")} maxLength={80} />
        </div>
        <div className="flex flex-col gap-2 rounded-button bg-white px-[14px] py-3 border-ink shadow-hard-3">
          <span className="flex items-baseline justify-between gap-2">
            <SectionLabel>{profile.linksLabel}</SectionLabel>
            <Muted className="text-[11px] font-extrabold whitespace-nowrap">{profile.linksOnlyConnections}</Muted>
          </span>
          <LinkToggles value={flags} onChange={setFlags} label={profile.linksLabel} values={values} onValueChange={setValue} problems={problems} />
          <Muted className="text-[12px] font-bold">{profile.linksHint}</Muted>
        </div>
        <div className="mt-auto flex flex-col gap-[10px]">
          {error && (
            <span role="alert" className="text-center text-[12px] font-extrabold text-coral">
              {error}
            </span>
          )}
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
