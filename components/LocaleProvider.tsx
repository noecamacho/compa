"use client";

import { createContext, useContext, type ReactNode } from "react";
import { copyFor, type Dictionary } from "@/lib/copy";
import { FALLBACK_LOCALE, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(FALLBACK_LOCALE);

// The server picks the locale from Accept-Language once (app/layout.tsx); every Client Component reads it from here.
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export const useLocale = (): Locale => useContext(LocaleContext);

export const useCopy = (): Dictionary => copyFor(useLocale());
