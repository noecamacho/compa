// Locale picking (API spec A10): Spanish for any `es*` language the person prefers first, English otherwise.
// Pure, so the server (Accept-Language) and the browser (navigator.languages) share one rule.
export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const FALLBACK_LOCALE: Locale = "en";

const isSpanish = (tag: string): boolean => /^es(?:$|[-_])/i.test(tag.trim());

// Only the most preferred language decides: ["en-US", "es"] reads English, ["es-MX", "en"] reads Spanish.
export function pickLocale(languages: readonly string[]): Locale {
  const first = languages.find((tag) => tag.trim() !== "" && tag.trim() !== "*");
  if (!first) return FALLBACK_LOCALE;
  return isSpanish(first) ? "es" : "en";
}

type Weighted = { tag: string; q: number; order: number };

function parseEntry(entry: string, order: number): Weighted | null {
  const [tag = "", ...params] = entry.split(";").map((part) => part.trim());
  if (!tag) return null;
  const qParam = params.find((param) => param.startsWith("q="));
  const q = qParam ? Number(qParam.slice(2)) : 1;
  if (!Number.isFinite(q) || q <= 0) return null;
  return { tag, q, order };
}

// "es-MX,es;q=0.9,en;q=0.8" → ["es-MX", "es", "en"], highest q first, ties in header order.
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map(parseEntry)
    .filter((entry): entry is Weighted => entry !== null)
    .sort((a, b) => b.q - a.q || a.order - b.order)
    .map((entry) => entry.tag);
}

export const localeFromAcceptLanguage = (header: string | null | undefined): Locale => pickLocale(parseAcceptLanguage(header));

// Browser side; the server's guess stands until hydration so the first paint never flips language.
export function browserLocale(): Locale | null {
  if (typeof navigator === "undefined") return null;
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return pickLocale(languages);
}
