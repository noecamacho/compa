// Mock-mode fixture (docs/flows/README.md "Two modes"): every API request the page sends to the app carries
// `x-compa-mock: 1`, and a spec can ask for a documented error, status or named example on every API call or one URL.
import { test as base, type Page, type Route } from "@playwright/test";
import { MOCK_ERROR_COOKIE } from "../../lib/api/mock-cookie";
import { MOCK_HEADERS } from "../../lib/api/mock-headers";
import { LOCAL_URL } from "./real-mode";

type UrlMatcher = string | RegExp;

export type MockControls = {
  // `url` limits the choice to one route (a page.route glob or regex); without it every API call gets it.
  mockError: (code: string, url?: UrlMatcher) => Promise<void>;
  mockStatus: (status: number, url?: UrlMatcher) => Promise<void>;
  mockExample: (name: string, url?: UrlMatcher) => Promise<void>;
  // A documented error on the server-rendered fetches of the next navigation (needs a server with API_MODE=mock).
  mockServerError: (code: string) => Promise<void>;
};

type Headers = Record<string, string>;

// Routes read the header objects on every request, so later choices for the same URL merge instead of replacing.
const continueWith = (route: Route, ...extra: Headers[]) =>
  route.continue({ headers: { ...route.request().headers(), [MOCK_HEADERS.mock]: "1", ...Object.assign({}, ...extra) } });

async function mockControls(page: Page, origin: string): Promise<Omit<MockControls, "mockServerError">> {
  const everyCall: Headers = {};
  const perUrl = new Map<UrlMatcher, Headers>();
  await page.route(`${origin}/api/**`, (route) => continueWith(route, everyCall));

  const choose = async (header: string, value: string, url?: UrlMatcher) => {
    if (!url) {
      everyCall[header] = value;
      return;
    }
    const known = perUrl.get(url);
    if (known) {
      known[header] = value;
      return;
    }
    const headers: Headers = { [header]: value };
    perUrl.set(url, headers);
    await page.route(url, (route) => continueWith(route, everyCall, headers));
  };

  return {
    mockError: (code, url) => choose(MOCK_HEADERS.error, code, url),
    mockStatus: (status, url) => choose(MOCK_HEADERS.status, `${status}`, url),
    mockExample: (name, url) => choose(MOCK_HEADERS.example, name, url),
  };
}

export const test = base.extend<{ mock: MockControls }>({
  mock: async ({ page, context, baseURL }, use) => {
    const origin = new URL(baseURL ?? LOCAL_URL).origin;
    const controls = await mockControls(page, origin);
    await use({ ...controls, mockServerError: (code) => context.addCookies([{ name: MOCK_ERROR_COOKIE, value: code, url: origin }]) });
  },
});

export { expect } from "@playwright/test";
