// Page-level helpers shared by the specs.
import type { BrowserContext, Locator, Page } from "@playwright/test";

const TOUR_IDS = ["home", "connect", "register", "me", "ranking"];

// The guided tour runs once per screen and overlays everything; most specs mark it as seen first.
export async function skipTours(context: BrowserContext): Promise<void> {
  await context.addInitScript((ids: string[]) => {
    for (const id of ids) {
      try {
        localStorage.setItem(`compa:tour:${id}`, "done");
      } catch {
        // Storage blocked: the tour will simply show.
      }
    }
  }, TOUR_IDS);
}

export type ConsoleRecord = { type: string; text: string };

// Collects console errors/warnings and uncaught page errors for the console spec and for debugging.
export function watchConsole(page: Page): ConsoleRecord[] {
  const records: ConsoleRecord[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") records.push({ type: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) => records.push({ type: "pageerror", text: error.message }));
  return records;
}

export const dock = (page: Page): Locator => page.getByRole("navigation", { name: "Navegación principal" });

// Bounding box of a locator; throws when the element is not rendered.
export async function box(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error("element has no bounding box");
  return rect;
}

// The app's own alert, leaving out Next's route announcer (also role=alert, outside <main>).
export const alertIn = (page: Page): Locator => page.locator("main").getByRole("alert");
