// One `test` with every fixture: mock (mock mode), realUser, testEvent and twoUsers (real mode).
import { expect, mergeTests, type Page, type Request } from "@playwright/test";
import { ApiClientError } from "../../lib/api/client";
import { errorText } from "../../lib/api/error-text";
import { copyFor } from "../../lib/copy";
import { localeFromAcceptLanguage, type Locale } from "../../lib/i18n";
import type { ErrorSpec } from "../../lib/api/errors";
import { test as mockTest } from "./mock";
import { test as realTest } from "./two-users";

export const test = mergeTests(mockTest, realTest);
export { expect };
export { TEST_EVENT_SLUG } from "./real-mode";

// What the attendee reads for an API error: the copy errorText picks (lib/api/error-text.ts), never the API message.
export const errorCopy = (error: ErrorSpec, locale: Locale = localeFromAcceptLanguage(test.info().project.use.locale)): string => errorText(copyFor(locale), new ApiClientError(error.status, error.code, error.message));

// A goto that cancels a client navigation's RSC payload makes WebKit report "Load failed", and Next falls back to a hard
// navigation to that screen, which interrupts the goto. Start before the click; await the result before the next goto.
// Prefetches are left out: they have no fallback, and Chromium may never report them done.
export function navigationsSettled(page: Page): () => Promise<void> {
  const inFlight = new Set<Request>();
  const isPayload = (request: Request) => request.headers()["rsc"] === "1" && !request.headers()["next-router-prefetch"];
  page.on("request", (request) => isPayload(request) && inFlight.add(request));
  page.on("requestfinished", (request) => inFlight.delete(request));
  page.on("requestfailed", (request) => inFlight.delete(request));
  return () => expect.poll(() => inFlight.size).toBe(0);
}
