// Social links: what a person types (a handle, a phone number or a URL) becomes one canonical URL per network.
// The same rules run in the browser (inline errors) and on the server (PATCH /api/me rejects what fails them).
import { LINK_KEYS, type LinkKey, type Links } from "./profile-fields";

const BASE_URL: Record<Exclude<LinkKey, "web">, string> = {
  linkedin: "https://www.linkedin.com/in/",
  github: "https://github.com/",
  x: "https://x.com/",
  instagram: "https://www.instagram.com/",
  whatsapp: "https://wa.me/",
};

// Hosts a pasted URL may point to; `web` takes any public host.
const HOSTS: Record<Exclude<LinkKey, "web">, RegExp> = {
  linkedin: /^([a-z]{2,3}\.)?(www\.)?linkedin\.com$/,
  github: /^(www\.)?github\.com$/,
  x: /^(www\.|mobile\.)?(x|twitter)\.com$/,
  instagram: /^(www\.)?instagram\.com$/,
  whatsapp: /^(wa\.me|(api\.|www\.)?whatsapp\.com)$/,
};

// Each network's own username rules.
const HANDLE: Record<Exclude<LinkKey, "web" | "whatsapp">, RegExp> = {
  linkedin: /^[\p{L}\p{N}_-]{3,100}$/u,
  github: /^[a-z\d](?:[a-z\d-]{0,38})$/i,
  x: /^\w{1,15}$/,
  instagram: /^[\w.]{1,30}$/,
};

// E.164: up to 15 digits with the country code; 8 is the shortest real international number.
const PHONE_DIGITS = /^\d{8,15}$/;
const PHONE_CHARS = /^\+?[\d\s().-]+$/;
// "instagram.com/ana" is a URL without its scheme; "ana.lopez" stays a handle.
const LOOKS_LIKE_URL = /^(https?:\/\/|[^/\s]+\.[^/\s]+\/)/i;

function parseUrl(value: string): URL | null {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.username || url.password || !url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}

function whatsappLink(value: string): string | null {
  const url = LOOKS_LIKE_URL.test(value) ? parseUrl(value) : null;
  if (url && !HOSTS.whatsapp.test(url.hostname.toLowerCase())) return null;
  const number = url ? (url.searchParams.get("phone") ?? url.pathname.slice(1)) : value;
  if (!PHONE_CHARS.test(number)) return null;
  const digits = number.replace(/\D/g, "");
  return PHONE_DIGITS.test(digits) ? `${BASE_URL.whatsapp}${digits}` : null;
}

function urlLink(key: LinkKey, value: string): string | null {
  const url = parseUrl(value);
  if (!url) return null;
  if (key !== "web" && !HOSTS[key].test(url.hostname.toLowerCase())) return null;
  return url.href;
}

// The canonical URL for a non-empty value, or null when it is not a valid link for that network.
export function parseLink(key: LinkKey, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (key === "whatsapp") return whatsappLink(value);
  if (key === "web" || LOOKS_LIKE_URL.test(value)) return urlLink(key, value);
  const handle = value.replace(/^@/, "");
  return HANDLE[key].test(handle) ? `${BASE_URL[key]}${encodeURIComponent(handle)}` : null;
}

// Keys whose non-empty value fails parseLink; an empty value means "remove", which is always valid.
export const invalidLinks = (patch: Partial<Record<LinkKey, string>>): LinkKey[] =>
  LINK_KEYS.filter((key) => {
    const raw = patch[key];
    return raw !== undefined && raw.trim() !== "" && parseLink(key, raw) === null;
  });

// What the edit field shows for a stored link: the handle, the number or the address, never the boilerplate.
export function linkInputValue(key: LinkKey, url: string | undefined): string {
  if (!url) return "";
  if (key === "whatsapp") return url.startsWith(BASE_URL.whatsapp) ? `+${url.slice(BASE_URL.whatsapp.length)}` : url;
  if (key === "web") return url.replace(/^https:\/\//, "").replace(/\/$/, "");
  const base = BASE_URL[key];
  if (!url.startsWith(base)) return url;
  const rest = url.slice(base.length);
  if (!/^[^/?#]+$/.test(rest)) return url;
  // Links saved before handles were encoded may hold a stray "%".
  const handle = (() => {
    try {
      return decodeURIComponent(rest);
    } catch {
      return null;
    }
  })();
  if (handle === null) return url;
  return key === "linkedin" ? handle : `@${handle}`;
}

// Applies a patch of typed values: valid ones replace, empty ones remove. Callers reject invalidLinks first.
export function mergeLinks(current: Links, patch: Partial<Record<LinkKey, string>>): Links {
  const merged: Links = { ...current };
  for (const key of LINK_KEYS) {
    const raw = patch[key];
    if (raw === undefined) continue;
    const link = parseLink(key, raw);
    if (link) merged[key] = link;
    else delete merged[key];
  }
  return merged;
}
