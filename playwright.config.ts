import { defineConfig, devices } from "@playwright/test";

// The suite runs against the real route handlers on a local Postgres (scripts/e2e/db.sh) with the test sign-in
// (lib/server/test-auth.ts). scripts/e2e/server.sh prepares both and starts `next dev` on port 3902.
const PORT = Number(process.env.E2E_PORT ?? 3902);
const baseURL = `http://localhost:${PORT}`;

const chromium = { ...devices["Desktop Chrome"], deviceScaleFactor: 1, hasTouch: false, isMobile: false };

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  retries: 1,
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/report" }]],
  outputDir: "e2e/results",
  use: {
    baseURL,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium-390", use: { ...chromium, viewport: { width: 390, height: 844 } } },
    { name: "chromium-375", use: { ...chromium, viewport: { width: 375, height: 667 } } },
    { name: "chromium-1280", use: { ...chromium, viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: "scripts/e2e/server.sh",
    url: `${baseURL}/api/docs`,
    reuseExistingServer: true,
    timeout: 240_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
