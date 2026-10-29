// Normalizes social links: "@user" or a bare handle becomes a URL; an empty value removes the link.
// Also validates what a person types for the four shared networks (profile and "my profile" screens) and
// turns a stored URL back into the short form the inputs show.
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

// ---- Validation of typed handles (V2 "Redes que compartes") ----

export const SHARED_LINK_KEYS = ["linkedin", "instagram", "whatsapp", "x"] as const;
export type SharedLinkKey = (typeof SHARED_LINK_KEYS)[number];

export type LinkProblem = "duplicate_at" | "bad_handle" | "country_code" | "bad_phone" | "bad_linkedin";

export type LinkCheck = { ok: true; value: string } | { ok: false; problem: LinkProblem };

const HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const LINKEDIN_USER = /^[A-Za-z0-9-]{3,100}$/;
const LINKEDIN_URL = /^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([A-Za-z0-9-]{3,100})\/?(?:[?#].*)?$/i;

// Instagram and X: a handle, with or without one leading "@"; "@@user" or "user@x" are mistakes.
function checkHandle(raw: string): LinkCheck {
  const value = raw.trim();
  if (/^@@+/.test(value) || /^@.*@/.test(value)) return { ok: false, problem: "duplicate_at" };
  const handle = value.replace(/^@/, "");
  if (!HANDLE.test(handle)) return { ok: false, problem: "bad_handle" };
  return { ok: true, value: handle };
}

// WhatsApp: the number with its country code, so wa.me works from any country ("+52 81 1234 5678").
function checkWhatsapp(raw: string): LinkCheck {
  const value = raw.trim();
  const digits = whatsappNumber(value);
  if (!/^\+?[\d\s().-]+$/.test(value) || digits.length < 8 || digits.length > 15) return { ok: false, problem: "bad_phone" };
  if (!value.startsWith("+") && digits.length <= 10) return { ok: false, problem: "country_code" };
  return { ok: true, value: `+${digits}` };
}

// LinkedIn: the public username or the profile URL; either way the username is kept.
function checkLinkedin(raw: string): LinkCheck {
  const value = raw.trim().replace(/^@/, "");
  const fromUrl = value.match(LINKEDIN_URL)?.[1];
  if (fromUrl) return { ok: true, value: fromUrl };
  if (LINKEDIN_USER.test(value) && !value.includes("/")) return { ok: true, value };
  return { ok: false, problem: "bad_linkedin" };
}

// An empty value is valid and means "no handle"; `value` is the short form to store or show.
export function checkLink(key: SharedLinkKey, raw: string): LinkCheck {
  if (!raw.trim()) return { ok: true, value: "" };
  if (key === "whatsapp") return checkWhatsapp(raw);
  if (key === "linkedin") return checkLinkedin(raw);
  return checkHandle(raw);
}

// The short form of a stored link, for the inputs: ".../in/ana" → "ana", "wa.me/5281…" → "+5281…".
export function displayLink(key: SharedLinkKey, url: string | undefined): string {
  if (!url) return "";
  if (key === "whatsapp") {
    const digits = whatsappNumber(url.replace(/^https?:\/\/wa\.me\//i, ""));
    return digits ? `+${digits}` : url;
  }
  if (key === "linkedin") return url.match(LINKEDIN_URL)?.[1] ?? url;
  const handle = url.replace(/^https?:\/\/(?:www\.)?(?:instagram\.com|x\.com|twitter\.com)\//i, "").replace(/[/?#].*$/, "");
  return handle;
}
