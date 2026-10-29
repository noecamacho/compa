import { describe, expect, test } from "bun:test";
import { localeFromAcceptLanguage, parseAcceptLanguage, pickLocale } from "./i18n";

describe("pickLocale", () => {
  test("any es* first language reads Spanish", () => {
    for (const tag of ["es", "es-MX", "es-419", "es_ES", "ES-mx"]) expect(pickLocale([tag, "en"])).toBe("es");
  });

  test("everything else reads English", () => {
    for (const tag of ["en-US", "pt-BR", "fr", "eu", "est"]) expect(pickLocale([tag, "es"])).toBe("en");
  });

  test("no preference falls back to English", () => {
    expect(pickLocale([])).toBe("en");
    expect(pickLocale(["*"])).toBe("en");
  });
});

describe("Accept-Language", () => {
  test("orders by q, ties in header order, drops q=0", () => {
    expect(parseAcceptLanguage("en;q=0.5, es-MX, fr;q=0, es;q=0.9")).toEqual(["es-MX", "es", "en"]);
  });

  test("picks the locale from the header", () => {
    expect(localeFromAcceptLanguage("es-MX,es;q=0.9,en;q=0.8")).toBe("es");
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,es;q=0.8")).toBe("en");
    expect(localeFromAcceptLanguage("en;q=0.4,es-419;q=0.7")).toBe("es");
    expect(localeFromAcceptLanguage(null)).toBe("en");
  });
});
