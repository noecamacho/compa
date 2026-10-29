import "server-only";
import { headers } from "next/headers";
import { copyFor, type Dictionary } from "../copy";
import { localeFromAcceptLanguage, type Locale } from "../i18n";

// The locale of the current request, from its Accept-Language header (lib/i18n.ts).
export async function requestLocale(): Promise<Locale> {
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
}

export async function requestCopy(): Promise<{ locale: Locale; copy: Dictionary }> {
  const locale = await requestLocale();
  return { locale, copy: copyFor(locale) };
}
