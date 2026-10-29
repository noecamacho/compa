import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { BADGES } from "../badges/catalog";
import { copyFor } from "./index";
import * as en from "./en";
import * as es from "./es";

type Tree = Record<string, unknown>;

// Every leaf path of a dictionary with the kind of its value, so a missing or mistyped key shows up as a diff.
function shape(value: unknown, path = ""): string[] {
  if (typeof value === "function") return [`${path}: fn/${value.length}`];
  if (typeof value === "string") return [`${path}: string`];
  if (Array.isArray(value)) return [`${path}: array/${value.length}`, ...value.flatMap((item, index) => shape(item, `${path}[${index}]`))];
  if (value && typeof value === "object") return Object.entries(value as Tree).flatMap(([key, child]) => shape(child, path ? `${path}.${key}` : key));
  return [`${path}: ${typeof value}`];
}

function strings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, index) => strings(item, `${path}[${index}]`));
  if (value && typeof value === "object") return Object.entries(value as Tree).flatMap(([key, child]) => strings(child, path ? `${path}.${key}` : key));
  return [];
}

// Words that read the same in both languages (brand, networks, loanwords) are allowed to repeat.
const SAME_IN_BOTH = new Set(["x (twitter)", "github", "staff", "founder", "coral", "extras", "color", "proptech", "fintech", "founders fest 2026"].concat(["admin", "whatsapp", "instagram", "linkedin", "compa", "x", "og", "live", "ok"]));

// Tour targets are element ids (data-tour), not copy.
const isIdentifier = (path: string): boolean => path.endsWith(".target");

describe("copy dictionaries", () => {
  test("English has every section Spanish has, and nothing else", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  test("both locales share one shape: same keys, same value kinds, same function arity", () => {
    for (const section of Object.keys(es)) {
      expect(shape((en as Tree)[section], section)).toEqual(shape((es as Tree)[section], section));
    }
  });

  test("no string is empty in either locale", () => {
    for (const locale of ["es", "en"] as const) {
      for (const [path, text] of strings(copyFor(locale))) expect(`${locale}:${path}:${text.trim() === ""}`).toBe(`${locale}:${path}:false`);
    }
  });

  test("English strings are translated, not copied from Spanish", () => {
    const spanish = new Map(strings(es));
    const untranslated = strings(en).filter(([path, text]) => spanish.get(path) === text && text.length > 3 && !SAME_IN_BOTH.has(text.toLowerCase()) && !isIdentifier(path) && !/^[+\d\s/·ptsA-Z:.-]*$/.test(text));
    expect(untranslated.map(([path]) => path)).toEqual([]);
  });

  test("English copy carries no Spanish accents or inverted punctuation", () => {
    const offenders = strings(en).filter(([, text]) => /[áéíóúñ¿¡]/i.test(text));
    expect(offenders).toEqual([]);
  });

  test("Spanish badge names match the badge catalog, which the API serves", () => {
    for (const [id, badge] of Object.entries(BADGES)) {
      expect(es.badgeNames[id as keyof typeof es.badgeNames]).toEqual({ name: badge.name, short: badge.shortName });
    }
  });

  test("every badge has a progress label in both locales", () => {
    expect(Object.keys(en.badgeProgress.labels).sort()).toEqual(Object.keys(es.badgeProgress.labels).sort());
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("no hard-coded locale", () => {
  const files = ["app", "components", "lib"].flatMap(sourceFiles).filter((file) => !file.startsWith("lib/copy/"));

  test("nothing outside lib/copy imports a single locale's dictionary directly", () => {
    const offenders = files.filter((file) => /copy\/(es|en)["']/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  test("attendee screens carry no Spanish string literals", () => {
    // /design is the internal style guide, admin copy is bilingual through lib/copy, and the rest of lib is fixtures and data.
    const screens = files.filter((file) => (file.startsWith("components/") || file.startsWith("app/")) && !file.startsWith("app/design/"));
    const spanish = />[^<>{}]*[áéíóúñ¿¡][^<>{}]*<|(?:aria-label|title|alt|placeholder|label)="[^"]*[áéíóúñ¿¡]/;
    const offenders = screens.filter((file) => spanish.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
