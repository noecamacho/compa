// Playwright e2e harness (docs/flows/README.md "E2E tests", backlog T-000). Every viewport runs in Spanish and English.
import { defineConfig, devices, type Project } from "@playwright/test";
import { isProductionUrl } from "./e2e/targets";

const LOCAL_URL = "http://localhost:3000";
const baseURL = process.env.E2E_BASE_URL ?? LOCAL_URL;
const isProduction = isProductionUrl(baseURL);
const isMockServer = process.env.API_MODE === "mock";

const LOCALES = [
  { id: "es", locale: "es-MX", timezoneId: "America/Mexico_City" },
  { id: "en", locale: "en-US", timezoneId: "America/Mexico_City" },
] as const;

type Viewport = { name: string; use: Project["use"]; live?: boolean };

const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
// A fake camera and microphone; scan specs add `--use-file-for-fake-video-capture=<qr.y4m>` through test.use.
const chrome = { ...devices["Desktop Chrome"], launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } };

const VIEWPORTS: Viewport[] = [
  { name: "mobile-390", use: { ...chrome, ...mobile } },
  // WebKit grants no media permission: the denied-camera path.
  { name: "mobile-390-webkit", use: { ...devices["Desktop Safari"], ...mobile, permissions: [] } },
  { name: "tablet-834", use: { ...chrome, viewport: { width: 834, height: 1194 } } },
  { name: "desktop-1440", use: { ...chrome, viewport: { width: 1440, height: 900 } } },
  { name: "live-1920", use: { ...chrome, viewport: { width: 1920, height: 1080 } }, live: true },
];

function project(viewport: Viewport, { id, locale, timezoneId }: (typeof LOCALES)[number]): Project {
  const scope = viewport.live ? { testMatch: "live/**/*.spec.ts" } : { testIgnore: "live/**" };
  return { name: `${viewport.name}-${id}`, ...scope, use: { ...viewport.use, locale, timezoneId, extraHTTPHeaders: { "Accept-Language": locale } } };
}

const reducedMotion: Project = {
  name: "mobile-390-es-reduced-motion",
  testIgnore: "live/**",
  use: { ...chrome, ...mobile, locale: "es-MX", extraHTTPHeaders: { "Accept-Language": "es-MX" }, reducedMotion: "reduce" },
};

// Production only runs read-only @prod specs; a mock-mode server cannot serve real-mode (@real) specs.
function tagFilter(): Pick<Parameters<typeof defineConfig>[0], "grep" | "grepInvert"> {
  if (isProduction) return { grep: /@prod/ };
  if (isMockServer) return { grepInvert: /@real/ };
  return { grepInvert: /@mock/ };
}

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  // `bun run dev` compiles each route on its first request.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  ...tagFilter(),
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", video: "retain-on-failure" },
  projects: [...VIEWPORTS.flatMap((viewport) => LOCALES.map((locale) => project(viewport, locale))), reducedMotion],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // CI serves a production build: `next dev` compiles each route on its first hit, too slow for the full matrix.
        command: process.env.CI ? "bun run build && bun run start" : "bun run dev",
        url: LOCAL_URL,
        // A running dev server may lack API_MODE=mock, so mock runs always start their own.
        reuseExistingServer: !process.env.CI && !isMockServer,
        timeout: 600_000,
        env: { API_MODE: process.env.API_MODE ?? "" },
      },
});
