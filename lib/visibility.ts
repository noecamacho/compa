// The single visibility filter for every view of another person (API spec §6, data model §4.5).
import type { CardT } from "./api/schemas";
import { effectiveAvatarMode, type AvatarMode } from "./avatar-mode";
import { accessoriesOf } from "./monito/accessories";
import type { MonitoLook } from "./monito/look";
import { DEFAULT_VISIBILITY, LINK_KEYS, type Links, type Visibility, type VisibilitySettings } from "./profile-fields";

// public: anonymous or not connected; connected: an accepted connection at any event; self: the owner.
export type Relation = "public" | "connected" | "self";

export type CardSource = {
  id: string;
  handle: string;
  name: string;
  photoUrl: string | null;
  avatar: MonitoLook | null;
  avatarMode?: AvatarMode | null;
  // Optional so sources without them (the profile preview) still build a card; absent means no accessories.
  goldenCapAt?: Date | null;
  showAccessories?: boolean;
  headline: string | null;
  company: string | null;
  city: string | null;
  links: Links;
  visibility: VisibilitySettings;
  interests: string[];
};

// Rows written before a setting existed (e.g. `whatsapp` in migration 0001) lack its key; defaults fill the gap.
export const withDefaultVisibility = (stored: Partial<VisibilitySettings> | null | undefined): VisibilitySettings => ({
  ...DEFAULT_VISIBILITY,
  ...stored,
  links: { ...DEFAULT_VISIBILITY.links, ...stored?.links },
});

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
  const accessories = accessoriesOf({ goldenCapAt: owner.goldenCapAt ?? null, showAccessories: owner.showAccessories ?? true });
  return {
    id: owner.id,
    handle: owner.handle,
    name: owner.name,
    photoUrl: owner.photoUrl,
    avatarMode: effectiveAvatarMode(owner.avatarMode, owner.photoUrl),
    // The monito and the city are public like the name and photo (design handoff).
    ...optionalField("avatar", owner.avatar, true),
    ...optionalField("accessories", accessories, accessories.length > 0),
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
