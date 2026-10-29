"use client";

import { useRef, useState } from "react";
import { apiCall } from "@/lib/api/client";
import { Me, VisibilitySettings, type MeT, type VisibilitySettingsT } from "@/lib/api/schemas";
import { me as copy } from "@/lib/copy/es";
import { checkLink, displayLink } from "@/lib/links";
import type { Links } from "@/lib/profile-fields";
import { LinkToggles, SHARED_NETWORKS, type SharedFlags, type SharedNetwork, type SharedProblems, type SharedValues } from "./LinkToggles";

type Props = { visibility: VisibilitySettingsT; links: Links };

const flagsFrom = (visibility: VisibilitySettingsT): SharedFlags =>
  Object.fromEntries(SHARED_NETWORKS.map((key) => [key, visibility.links[key] !== "hidden"])) as SharedFlags;

const valuesFrom = (links: Links): SharedValues => Object.fromEntries(SHARED_NETWORKS.map((key) => [key, displayLink(key, links[key])])) as SharedValues;

// The four toggles on my profile save on each tap, and each handle saves when its input is left (V2MiPerfil).
export function MyLinkToggles({ visibility, links }: Props) {
  const [flags, setFlags] = useState<SharedFlags>(flagsFrom(visibility));
  // Latest flags, updated inside the handler, so a second tap before the re-render still flips from the right state.
  const latest = useRef(flags);
  const [values, setValues] = useState<SharedValues>(() => valuesFrom(links));
  const [stored, setStored] = useState<SharedValues>(() => valuesFrom(links));
  const [problems, setProblems] = useState<SharedProblems>({});
  const [saved, setSaved] = useState<Partial<Record<SharedNetwork, boolean>>>({});

  function toggle(key: SharedNetwork) {
    const previous = latest.current;
    const next = { ...previous, [key]: !previous[key] };
    latest.current = next;
    setFlags(next);
    void apiCall("PATCH", "/api/me/visibility", VisibilitySettings, { links: { [key]: next[key] ? "connections" : "hidden" } }).catch(() => {
      latest.current = { ...latest.current, [key]: previous[key] };
      setFlags(latest.current);
    });
  }

  function setValue(key: SharedNetwork, value: string) {
    setValues({ ...values, [key]: value });
    setSaved({ ...saved, [key]: false });
    if (problems[key]) setProblems({ ...problems, [key]: undefined });
  }

  async function commit(key: SharedNetwork) {
    const check = checkLink(key, values[key]);
    if (!check.ok) return setProblems({ ...problems, [key]: check.problem });
    if (check.value === stored[key]) return;
    try {
      const me: MeT = await apiCall("PATCH", "/api/me", Me, { links: { [key]: check.value } });
      const fresh = valuesFrom(me.links ?? {});
      setStored(fresh);
      setValues({ ...values, [key]: fresh[key] });
      setSaved({ ...saved, [key]: true });
    } catch {
      setProblems({ ...problems, [key]: "bad_handle" });
    }
  }

  const titles = Object.fromEntries(SHARED_NETWORKS.map((key) => [key, flags[key] ? (links[key] ?? "") : copy.hidden]));
  return <LinkToggles value={flags} onToggle={toggle} label={copy.linksLabel} titles={titles} values={values} onValueChange={setValue} onValueCommit={commit} problems={problems} saved={saved} />;
}
