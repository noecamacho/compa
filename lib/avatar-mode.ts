// Which picture a person shows: the LinkedIn photo (default) or their monito (captain decision, 2026-10-29).
export const AVATAR_MODES = ["photo", "monito"] as const;
export type AvatarMode = (typeof AVATAR_MODES)[number];

// Without a photo there is nothing to show but the monito, whatever was stored.
export const effectiveAvatarMode = (mode: AvatarMode | null | undefined, photoUrl: string | null | undefined): AvatarMode =>
  photoUrl ? (mode ?? "photo") : "monito";
