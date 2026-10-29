"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { NETWORK_ORDER } from "@/components/brand/NetworkIcon";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Header } from "@/components/ui/Header";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { useHydrated } from "@/components/ui/useHydrated";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { apiCall } from "@/lib/api/client";
import { Me, VisibilitySettings, type MeT } from "@/lib/api/schemas";
import { useCopy } from "@/components/LocaleProvider";
import { errorText } from "@/lib/api/error-text";
import { forgetDraft, recallDraft, rememberDraft } from "@/lib/draft-store";
import { linkInputValue, parseLink } from "@/lib/links";
import { LINK_KEYS, type LinkKey, type Links, type Visibility, type VisibilitySettings as Settings } from "@/lib/profile-fields";
import { LinkEditor } from "./LinkEditor";
import { ProfilePreview } from "./ProfilePreview";
import { VisibilityLegend, VisibilityPicker } from "./VisibilityPicker";

type Props = { me: MeT; next: string; back: string; onboarding: boolean };

type LinkValues = Record<LinkKey, string>;
type Flags = Partial<Record<LinkKey, boolean>>;

const linkValuesOf = (links: Links | undefined): LinkValues =>
  Object.fromEntries(LINK_KEYS.map((key) => [key, linkInputValue(key, links?.[key])])) as LinkValues;

const isInvalid = (key: LinkKey, value: string) => value.trim() !== "" && parseLink(key, value) === null;

// The links the preview can show right now: stored ones as saved, edited ones once they pass validation.
const previewLinks = (values: LinkValues, initial: LinkValues, stored: Links | undefined): Links =>
  Object.fromEntries(LINK_KEYS.flatMap((key) => {
    const url = values[key] === initial[key] ? stored?.[key] : parseLink(key, values[key]);
    return url ? [[key, url]] : [];
  }));

// Only edited links go to the server, so an old stored value nobody touched can never block a save.
const changedLinks = (values: LinkValues, initial: LinkValues): Partial<LinkValues> =>
  Object.fromEntries(LINK_KEYS.filter((key) => values[key] !== initial[key]).map((key) => [key, values[key]]));

const DRAFT = "profile";

const Draft = z.object({
  fields: z.object({ name: z.string(), headline: z.string(), company: z.string(), city: z.string() }),
  links: z.record(z.enum(LINK_KEYS), z.string()),
  levels: VisibilitySettings,
});
type DraftT = z.infer<typeof Draft>;

// 02 Perfil: LinkedIn data, the person's links, and who sees each item before and after connecting, with a live preview.
// Also reached from "Editar perfil". Unsaved edits survive a reload or going back (sessionStorage draft): the form
// mounts from the server data, then again in the browser from the draft.
export function ProfileForm(props: Props) {
  const hydrated = useHydrated();
  const draft = useMemo(() => (hydrated ? recallDraft(DRAFT, props.me.id, Draft) : null), [hydrated, props.me.id]);
  return <Form key={hydrated ? "browser" : "server"} {...props} draft={draft} restored={hydrated} />;
}

function Form({ me, next, back, onboarding, draft, restored }: Props & { draft: DraftT | null; restored: boolean }) {
  const all = useCopy();
  const { profile, visibility: visibilityCopy } = all;
  const router = useRouter();
  const [fields, setFields] = useState(() => draft?.fields ?? { name: me.name, headline: me.headline ?? "", company: me.company ?? "", city: me.city ?? "" });
  // What is stored, so only edits are sent; a restored draft only changes what the inputs start with.
  const [initialLinks] = useState(() => linkValuesOf(me.links));
  const [links, setLinks] = useState<LinkValues>(() => draft?.links ?? initialLinks);
  const [levels, setLevels] = useState<Settings>(() => draft?.levels ?? me.visibility);
  const [removed, setRemoved] = useState<Partial<LinkValues>>({});
  const [touched, setTouched] = useState<Flags>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (restored) rememberDraft(DRAFT, me.id, { fields, links, levels });
  }, [restored, me.id, fields, links, levels]);

  const update = (key: keyof typeof fields) => (event: FormEvent<HTMLInputElement>) =>
    setFields({ ...fields, [key]: event.currentTarget.value });
  const setLink = (key: LinkKey, value: string) => setLinks((current) => ({ ...current, [key]: value }));
  const setLinkLevel = (key: LinkKey) => (level: Visibility) => setLevels((current) => ({ ...current, links: { ...current.links, [key]: level } }));
  const setFieldLevel = (key: "headline" | "company") => (level: Visibility) => setLevels((current) => ({ ...current, [key]: level }));

  function remove(key: LinkKey) {
    setRemoved((current) => ({ ...current, [key]: links[key] }));
    setLink(key, "");
  }

  function undo(key: LinkKey) {
    setLink(key, removed[key] ?? "");
    setRemoved((current) => {
      const rest = { ...current };
      delete rest[key];
      return rest;
    });
  }

  // A stored value is never re-judged: only what the person edits must pass today's rules.
  const isEditedInvalid = (key: LinkKey) => links[key] !== initialLinks[key] && isInvalid(key, links[key]);
  const invalid = LINK_KEYS.filter(isEditedInvalid);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (invalid.length) {
      setError(profile.fixErrors);
      document.getElementById(`link-${invalid[0]}`)?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const linkPatch = changedLinks(links, initialLinks);
      await apiCall("PATCH", "/api/me", Me, { ...fields, ...(Object.keys(linkPatch).length ? { links: linkPatch } : {}) });
      await apiCall("PATCH", "/api/me/visibility", VisibilitySettings, { headline: levels.headline, company: levels.company, links: levels.links });
      forgetDraft(DRAFT, me.id);
      router.push(next);
    } catch (caught) {
      setError(errorText(all, caught));
      setSaving(false);
    }
  }

  return (
    <Screen width="focus">
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
      <form onSubmit={submit} noValidate data-restored={restored ? "1" : undefined} className="flex flex-1 flex-col gap-[14px]">
        <section aria-label={visibilityCopy.title} className="flex flex-col gap-2 rounded-button bg-white px-[14px] py-3 border-ink shadow-hard-3">
          <span className="flex items-center gap-2">
            <Icon name="lock" size={16} />
            <SectionLabel>{visibilityCopy.title}</SectionLabel>
          </span>
          <VisibilityLegend />
        </section>

        <div className="flex flex-col gap-[10px]">
          <Field id="name" label={profile.name} value={fields.name} onInput={update("name")} maxLength={80} required />
          <Field id="headline" label={profile.role} value={fields.headline} onInput={update("headline")} maxLength={120} />
          <VisibilityPicker item={profile.role} value={levels.headline} onChange={setFieldLevel("headline")} />
          <Field id="company" label={profile.company} value={fields.company} onInput={update("company")} maxLength={80} />
          <VisibilityPicker item={profile.company} value={levels.company} onChange={setFieldLevel("company")} />
          <Field id="city" label={profile.city} value={fields.city} onInput={update("city")} maxLength={80} />
          <Muted className="text-[12px] font-bold">{profile.alwaysVisible}</Muted>
        </div>

        <section aria-label={profile.linksLabel} className="flex flex-col gap-3 rounded-button bg-white px-[14px] py-3 border-ink shadow-hard-3">
          <span className="flex flex-col gap-[2px]">
            <SectionLabel>{profile.linksLabel}</SectionLabel>
            <Muted className="text-[12px] font-bold">{profile.linksHint}</Muted>
          </span>
          {NETWORK_ORDER.map((key) => (
            <LinkEditor
              key={key}
              network={key}
              value={links[key]}
              level={levels.links[key]}
              error={(submitted || Boolean(touched[key])) && isEditedInvalid(key)}
              removed={removed[key]}
              onValue={(value) => setLink(key, value)}
              onBlur={() => setTouched((current) => ({ ...current, [key]: true }))}
              onLevel={setLinkLevel(key)}
              onRemove={() => remove(key)}
              onUndo={() => undo(key)}
            />
          ))}
        </section>

        <ProfilePreview me={me} draft={{ ...fields, links: previewLinks(links, initialLinks, me.links), visibility: levels }} />

        <div className="mt-auto flex flex-col gap-[10px] md:mt-4">
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
