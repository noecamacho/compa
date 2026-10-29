// Normalizes social links: "@user" or a bare handle becomes a URL; an empty value removes the link.
import { LINK_KEYS, type LinkKey, type Links } from "./profile-fields";

const BASE_URL: Record<LinkKey, string> = {
  linkedin: "https://www.linkedin.com/in/",
  github: "https://github.com/",
  x: "https://x.com/",
  instagram: "https://www.instagram.com/",
  whatsapp: "https://wa.me/",
  web: "https://",
};

// WhatsApp links take the phone number in international format with digits only.
const whatsappNumber = (value: string) => value.replace(/[^\d]/g, "");

export function normalizeLink(key: LinkKey, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (key === "whatsapp") return whatsappNumber(value) ? `${BASE_URL.whatsapp}${whatsappNumber(value)}` : null;
  return `${BASE_URL[key]}${value.replace(/^@/, "")}`;
}

export function mergeLinks(current: Links, patch: Partial<Record<LinkKey, string>>): Links {
  const merged: Links = { ...current };
  for (const key of LINK_KEYS) {
    const raw = patch[key];
    if (raw === undefined) continue;
    const link = normalizeLink(key, raw);
    if (link) merged[key] = link;
    else delete merged[key];
  }
  return merged;
}
