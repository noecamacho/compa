// Profile field vocabulary shared by the database schema, the API schemas and the visibility filter (M11, M12).
export const LINK_KEYS = ["linkedin", "github", "x", "instagram", "whatsapp", "web"] as const;
export type LinkKey = (typeof LINK_KEYS)[number];
export type Links = Partial<Record<LinkKey, string>>;

export const VISIBILITY_LEVELS = ["public", "connections", "hidden"] as const;
export type Visibility = (typeof VISIBILITY_LEVELS)[number];

export type VisibilitySettings = {
  headline: Visibility;
  company: Visibility;
  interests: Visibility;
  links: Record<LinkKey, Visibility>;
};

export const DEFAULT_VISIBILITY: VisibilitySettings = {
  headline: "public",
  company: "public",
  interests: "public",
  links: { linkedin: "connections", github: "connections", x: "connections", instagram: "connections", whatsapp: "connections", web: "connections" },
};

// What a stored row may hold at runtime: rows written before a key existed (e.g. `whatsapp` before migration 0001) lack it.
export type StoredVisibility = Partial<Omit<VisibilitySettings, "links">> & { links?: Partial<Record<LinkKey, Visibility>> };

export const withDefaultVisibility = (stored: StoredVisibility): VisibilitySettings => ({
  ...DEFAULT_VISIBILITY,
  ...stored,
  links: { ...DEFAULT_VISIBILITY.links, ...stored.links },
});
