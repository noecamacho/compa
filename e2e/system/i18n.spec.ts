// F-72: the first preferred language decides; es-MX and es-ES read Spanish, en-US and fr-FR read English, on
// every bilingual screen (lib/copy/en.ts sections: landing, door, join, event not found, notifications, admin).
import type { Browser, Page } from "@playwright/test";
import * as X from "../../lib/api/examples";
import { MOCK_ERROR_COOKIE } from "../../lib/api/mock-cookie";
import { copyFor, type Dictionary } from "../../lib/copy";
import type { Locale } from "../../lib/i18n";
import { expect, test } from "../fixtures";

const LANGUAGES: { header: string; expected: Locale }[] = [
  { header: "es-MX", expected: "es" },
  { header: "es-ES", expected: "es" },
  { header: "en-US", expected: "en" },
  { header: "fr-FR", expected: "en" },
];

type Screen = { name: string; path: string; check: (page: Page, copy: Dictionary) => Promise<void>; serverError?: string };

const heading = (page: Page, text: string) => expect(page.getByRole("heading", { level: 1 })).toContainText(text);

const first = (lines: readonly string[]): string => {
  const [line] = lines;
  if (!line) throw new Error("empty copy");
  return line;
};

const SCREENS: Screen[] = [
  { name: "door", path: `/e/${X.accessCode}`, check: (page, copy) => expect(page.getByText(copy.door.invitedTo)).toBeVisible() },
  { name: "join consent", path: `/e/${X.accessCode}/join`, check: (page, copy) => heading(page, copy.join.title) },
  { name: "event not found", path: "/e/zzzzzzzz00", serverError: "event_not_found", check: (page, copy) => heading(page, copy.eventNotFound.title) },
  { name: "notifications", path: "/notifications", check: (page, copy) => heading(page, copy.notifications.title) },
  { name: "admin console", path: "/admin", check: (page, copy) => expect(page.getByRole("navigation", { name: copy.admin.navLabel })).toContainText(copy.admin.nav.events) },
];

async function openIn(browser: Browser, baseURL: string, header: string, run: (page: Page) => Promise<void>, serverError?: string) {
  const context = await browser.newContext({ baseURL, locale: header, extraHTTPHeaders: { "Accept-Language": header } });
  try {
    if (serverError) await context.addCookies([{ name: MOCK_ERROR_COOKIE, value: serverError, url: baseURL }]);
    await run(await context.newPage());
  } finally {
    await context.close();
  }
}

test.describe("language detection", () => {
  // Each test sets its own languages, so one viewport per locale is enough.
  test.beforeEach(({}, testInfo) => test.skip(!testInfo.project.name.startsWith("desktop-1440"), "languages are set per test"));

  for (const { header, expected } of LANGUAGES) {
    test(`${header} reads the landing in ${expected}`, async ({ browser, baseURL }) => {
      await openIn(browser, baseURL ?? "", header, async (page) => {
        await page.goto("/");
        await heading(page, first(copyFor(expected).landing.title));
      });
    });

    test(`${header} reads every bilingual screen in ${expected} @mock`, async ({ browser, baseURL }) => {
      for (const screen of SCREENS) {
        await test.step(screen.name, () =>
          openIn(browser, baseURL ?? "", header, async (page) => {
            await page.goto(screen.path);
            await screen.check(page, copyFor(expected));
          }, screen.serverError),
        );
      }
    });

    test(`${header} sets <html lang> to ${expected}`, async ({ browser, baseURL }) => {
      test.fixme(expected !== "es", 'BUG: app/layout.tsx hard-codes <html lang="es">, so English pages are announced as Spanish');
      await openIn(browser, baseURL ?? "", header, async (page) => {
        await page.goto("/");
        await expect(page.locator("html")).toHaveAttribute("lang", expected);
      });
    });
  }

  test("a wildcard or missing language falls back to English @mock", async ({ browser, baseURL }) => {
    for (const header of ["*", ""]) {
      await openIn(browser, baseURL ?? "", "en-US", async (page) => {
        await page.setExtraHTTPHeaders({ "Accept-Language": header });
        await page.goto(`/e/${X.accessCode}`);
        await expect(page.getByText(copyFor("en").door.invitedTo)).toBeVisible();
      });
    }
  });
});
