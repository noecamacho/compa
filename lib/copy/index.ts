// Copy for one locale. Only the sections in lib/copy/en.ts are bilingual; the rest of the app reads lib/copy/es.ts directly.
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
