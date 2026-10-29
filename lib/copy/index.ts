// Copy for one locale. Every section exists in lib/copy/es.ts and lib/copy/en.ts (lib/copy/copy.test.ts keeps them in step).
// Server Components call requestLocale() (lib/server/locale.ts); Client Components call useCopy() (components/LocaleProvider.tsx).
import type { Locale } from "../i18n";
import * as en from "./en";
import * as es from "./es";

export type Dictionary = typeof en;

const DICTIONARIES: Record<Locale, Dictionary> = { es, en };

export const copyFor = (locale: Locale): Dictionary => DICTIONARIES[locale];

const NUMBER_LOCALE: Record<Locale, string> = { es: "es-MX", en: "en-US" };

export const formatNumber = (locale: Locale, value: number): string => new Intl.NumberFormat(NUMBER_LOCALE[locale]).format(value);

export const formatTime = (locale: Locale, iso: string, timeZone = "America/Mexico_City"): string =>
  new Intl.DateTimeFormat(NUMBER_LOCALE[locale], { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));

export const intlLocale = (locale: Locale): string => NUMBER_LOCALE[locale];
