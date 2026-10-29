const SLUG_MAX = 48;

// The create form's default slug (admin spec §5.2, M8): "Fundadores Mérida" → "fundadores-merida". Accents are stripped
// (NFD + drop combining marks), anything else outside [a-z0-9] collapses to one hyphen, and it never ends in one.
export const slugify = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
