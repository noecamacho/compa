"use client";

import { useState } from "react";
import { apiCall } from "@/lib/api/client";
import { VisibilitySettings, type VisibilitySettingsT } from "@/lib/api/schemas";
import { me as copy } from "@/lib/copy/es";
import type { Links } from "@/lib/profile-fields";
import { LinkToggles, SHARED_NETWORKS, type SharedFlags } from "./LinkToggles";

type Props = { visibility: VisibilitySettingsT; links: Links };

const flagsFrom = (visibility: VisibilitySettingsT): SharedFlags =>
  Object.fromEntries(SHARED_NETWORKS.map((key) => [key, visibility.links[key] !== "hidden"])) as SharedFlags;

// The four toggles on my profile save on each tap (V2MiPerfil "Redes que compartes").
export function MyLinkToggles({ visibility, links }: Props) {
  const [flags, setFlags] = useState<SharedFlags>(flagsFrom(visibility));

  function change(next: SharedFlags) {
    const changed = SHARED_NETWORKS.find((key) => next[key] !== flags[key]);
    setFlags(next);
    if (!changed) return;
    void apiCall("PATCH", "/api/me/visibility", VisibilitySettings, { links: { [changed]: next[changed] ? "connections" : "hidden" } }).catch(() => setFlags(flags));
  }

  const titles = Object.fromEntries(SHARED_NETWORKS.map((key) => [key, flags[key] ? (links[key] ?? "") : copy.hidden]));
  return <LinkToggles value={flags} onChange={change} label={copy.linksLabel} titles={titles} />;
}
