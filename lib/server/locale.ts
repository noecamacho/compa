import "server-only";
import type { Metadata } from "next";
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

// A page's tab title in the request's locale: `export const generateMetadata = pageTitle("home");`.
export function pageTitle(tab: keyof Dictionary["titles"]["tabs"]): () => Promise<Metadata> {
  return async () => ({ title: (await requestCopy()).copy.titles.tabs[tab] });
}
