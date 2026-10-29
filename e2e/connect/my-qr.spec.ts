// F-16 Show my QR: /connect renders a QR that encodes <site>/u/<handle> (ADR-004), the tab switch and the invite chip.
import { existsSync, readFileSync } from "node:fs";
import QRCode from "qrcode";
import type { Page } from "@playwright/test";
import { me } from "../../lib/api/examples";
import { connect, screenState } from "../../lib/copy/es";
import { expect, test } from "../fixtures";
import { skipTours } from "./helpers";

// Same options as app/(app)/connect/page.tsx, so an identical SVG proves an identical payload.
const QR_OPTIONS = { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1E1B2E", light: "#FFFFFF" } } as const;

// Next reads NEXT_PUBLIC_SITE_URL from the environment or .env.local; only that one public key is read here.
function configuredSiteUrl(): string | undefined {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const file = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
  return file.match(/^NEXT_PUBLIC_SITE_URL=["']?([^"'\s]+)/m)?.[1];
}

// The page builds the link from NEXT_PUBLIC_SITE_URL, else the request origin; the spec accepts either.
function candidateOrigins(baseURL: string | undefined): string[] {
  const origins = [configuredSiteUrl()?.replace(/\/$/, ""), baseURL ? new URL(baseURL).origin : undefined];
  return [...new Set(origins.filter((origin): origin is string => Boolean(origin)))];
}

async function qrPayload(page: Page, name: string, handle: string, baseURL: string | undefined): Promise<string | null> {
  const shown = page.getByRole("img", { name: connect.qrLabel(name) });
  for (const origin of candidateOrigins(baseURL)) {
    const url = `${origin}/u/${handle}`;
    const expected = await QRCode.toString(url, QR_OPTIONS);
    // Compare after the browser's own serialization, so whitespace in the generated string does not matter.
    const same = await shown.evaluate((element, svg) => {
      const probe = document.createElement("div");
      probe.innerHTML = svg;
      return probe.innerHTML === element.innerHTML;
    }, expected);
    if (same) return url;
  }
  return null;
}

test.describe("connect: my QR", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("the QR encodes my personal link and my card shows @mock", async ({ page, baseURL }) => {
    await page.goto("/connect");
    await expect(page.getByRole("heading", { level: 1, name: connect.title })).toBeVisible();
    await expect(page.getByRole("button", { name: connect.myQr })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(me.name).first()).toBeVisible();
    await expect(page.getByText(connect.showIt)).toBeVisible();
    expect(await qrPayload(page, me.name, me.handle, baseURL)).toMatch(new RegExp(`/u/${me.handle}$`));
  });

  test("the tabs switch between my QR and the scanner and follow the URL @mock", async ({ page }) => {
    await page.goto("/connect");
    await page.getByRole("button", { name: connect.scan }).click();
    await expect(page).toHaveURL(/\/connect\?tab=scan$/);
    await expect(page.getByRole("button", { name: connect.scan })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("searchbox", { name: connect.searchLabel })).toBeVisible();
    await expect(page.getByRole("img", { name: connect.qrLabel(me.name) })).toHaveCount(0);

    await page.getByRole("button", { name: connect.myQr }).click();
    await expect(page).toHaveURL(/\/connect$/);
    await expect(page.getByRole("img", { name: connect.qrLabel(me.name) })).toBeVisible();

    await page.goto("/connect?tab=scan");
    await expect(page.getByRole("button", { name: connect.scan })).toHaveAttribute("aria-pressed", "true");
  });

  test("the invite chip opens /invite @mock", async ({ page }) => {
    await page.goto("/connect");
    await page.getByRole("link", { name: connect.invite }).click();
    await expect(page).toHaveURL(/\/invite$/);
  });

  test("a failed /api/me shows the screen error with a retry @mock", async ({ page, mock }) => {
    await mock.mockServerError("unauthorized");
    await page.goto("/connect");
    await expect(page.getByRole("alert").filter({ hasText: screenState.errorTitle })).toBeVisible();
    await expect(page.getByRole("button", { name: screenState.retry })).toBeVisible();
  });

  test("a real user's QR encodes their own handle @real", async ({ page, realUser, baseURL }) => {
    await page.goto("/connect");
    await expect(page.getByText(realUser.user.name).first()).toBeVisible();
    expect(await qrPayload(page, realUser.user.name, realUser.user.handle, baseURL)).toMatch(new RegExp(`/u/${realUser.user.handle}$`));
  });
});
