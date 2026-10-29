// Shared pieces of the system specs: every page route of app/**/page.tsx as a URL the mock server can render.
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext, Page } from "@playwright/test";
import * as X from "../../lib/api/examples";

const APP_DIR = fileURLToPath(new URL("../../app", import.meta.url));

// A value for every dynamic segment name; mock mode serves the documented examples whatever the value.
const SEGMENT_SAMPLES: Readonly<Record<string, string>> = {
  handle: X.valeriaPublic.handle,
  id: X.ids.connection,
  code: X.accessCode,
  slug: X.founders.slug,
};

// The projector screen is laid out for 1920×1080 and has its own specs (e2e/live/**).
export const NOT_AT_PHONE_SIZES = new Set(["/e/[code]/live"]);

function pageFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pageFiles(path);
    return entry.name === "page.tsx" ? [path] : [];
  });
}

// app/(app)/people/[handle]/page.tsx → /people/[handle]
export const routeOf = (file: string): string => {
  const segments = relative(APP_DIR, file).split(sep).slice(0, -1).filter((segment) => !/^\(.*\)$/.test(segment));
  return `/${segments.join("/")}`;
};

export function urlOf(route: string): string {
  return route.replace(/\[(\w+)\]/g, (_, name: string) => {
    const value = SEGMENT_SAMPLES[name];
    if (!value) throw new Error(`no sample value for [${name}] in ${route}: add one to e2e/system/helpers.ts`);
    return value;
  });
}

export const PAGE_ROUTES: readonly string[] = pageFiles(APP_DIR).map(routeOf).sort();

// Screens a person reaches at phone, tablet and desktop sizes.
export const SCREEN_ROUTES = PAGE_ROUTES.filter((route) => !NOT_AT_PHONE_SIZES.has(route));

// Browser errors and uncaught exceptions while a page is open.
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

// Nothing when the page has no horizontal scroll; otherwise the outermost elements that stick out on the right.
export const horizontalOverflow = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= width) return [];
    const sticksOut = (node: Element | null) => Boolean(node && node.getBoundingClientRect().right > width + 1);
    return [...document.body.querySelectorAll("*")]
      .filter((node) => sticksOut(node) && !sticksOut(node.parentElement))
      .slice(0, 5)
      .map((node) => `${Math.round(node.getBoundingClientRect().right)}px ${node.outerHTML.slice(0, 160)}`);
  });

// The first-visit tours (components/tour/Tour.tsx) cover the screen and swallow clicks: mark them seen up front.
export async function skipTours(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    for (const id of ["connect", "home", "me", "ranking", "register"]) {
      try {
        localStorage.setItem(`compa:tour:${id}`, "done");
      } catch {
        // Blocked storage: the tour shows and the click fails loudly.
      }
    }
  });
}
