// The single visibility filter for every view of another person (API spec §6, data model §4.5).
import type { CardT } from "./api/schemas";
import type { MonitoLook } from "./monito/look";
import { LINK_KEYS, withDefaultVisibility, type Links, type Visibility, type VisibilitySettings } from "./profile-fields";

// public: anonymous or not connected; connected: an accepted connection at any event; self: the owner.
export type Relation = "public" | "connected" | "self";

export type CardSource = {
  id: string;
  handle: string;
  name: string;
  photoUrl: string | null;
  avatar: MonitoLook | null;
  headline: string | null;
  company: string | null;
  city: string | null;
  links: Links;
  visibility: VisibilitySettings;
  interests: string[];
};

export function canSee(level: Visibility | undefined, relation: Relation): boolean {
  if (relation === "self") return true;
  if (level === "public") return true;
  return level === "connections" && relation === "connected";
}

function visibleLinks(owner: CardSource, relation: Relation): Links {
  const entries = LINK_KEYS.filter((key) => owner.links[key] && canSee(owner.visibility.links[key], relation)).map(
    (key) => [key, owner.links[key]] as const,
  );
  return Object.fromEntries(entries);
}

const optionalField = <K extends string, V>(key: K, value: V | null | undefined, visible: boolean) =>
  visible && value !== null && value !== undefined ? ({ [key]: value } as Record<K, V>) : {};

// Never returns email, auth ids, LinkedIn claims or the admin flag: they are not in CardSource at all.
export function toCard(stored: CardSource, relation: Relation): CardT {
  const owner = { ...stored, visibility: withDefaultVisibility(stored.visibility) };
  const links = visibleLinks(owner, relation);
  return {
    id: owner.id,
    handle: owner.handle,
    name: owner.name,
    photoUrl: owner.photoUrl,
    // The monito and the city are public like the name and photo (design handoff).
    ...optionalField("avatar", owner.avatar, true),
    ...optionalField("headline", owner.headline, canSee(owner.visibility.headline, relation)),
    ...optionalField("company", owner.company, canSee(owner.visibility.company, relation)),
    ...optionalField("city", owner.city, true),
    ...optionalField("interests", owner.interests, canSee(owner.visibility.interests, relation)),
    ...optionalField("links", links, Object.keys(links).length > 0),
  };
}

export const relationOf = (viewerId: string | null, ownerId: string, connected: boolean): Relation => {
  if (viewerId === ownerId) return "self";
  return connected ? "connected" : "public";
};
