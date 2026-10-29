// Fixes ported from the QA pass of #55 (Iker's Playwright review), in mock mode: the client keeps state the server
// examples cannot hold. Server-side fixes (connections list, first-night home) are covered by unit tests.
import QRCode from "qrcode";
import { foundersDoor, rodrigo, valeriaProfile, valeriaPublic } from "../lib/api/examples";
import { BADGE_IDS } from "../lib/badges/catalog";
import { copyFor } from "../lib/copy";
import { localeFromAcceptLanguage } from "../lib/i18n";
import { fakeCamera } from "./fake-camera";
import { expect, test } from "./fixtures";

const copyOf = (testInfo: { project: { use: { locale?: string } } }) => copyFor(localeFromAcceptLanguage(testInfo.project.use.locale));

test.describe("monito builder", () => {
  test("a reload keeps the unsaved choices @mock", async ({ page }, testInfo) => {
    const { monito } = copyOf(testInfo);
    await page.goto("/onboarding/monito");
    // The draft is restored after hydration; picking before that would be overwritten.
    await expect(page.locator("main[data-restored]")).toBeVisible();
    const shirt = page.getByRole("group", { name: monito.shirt }).getByRole("radio", { name: monito.shirtNames.gum });
    const hair = page.getByRole("group", { name: monito.hair }).getByRole("radio", { name: monito.hairNames.curly });
    await shirt.click();
    await hair.click();
    await expect(shirt).toHaveAttribute("aria-checked", "true");
    await page.reload();
    await expect(page.locator("main[data-restored]")).toBeVisible();
    await expect(shirt).toHaveAttribute("aria-checked", "true");
    await expect(hair).toHaveAttribute("aria-checked", "true");
  });

  test("server render and hydration draw the same first look @mock", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => message.type() === "error" && /hydrat/i.test(message.text()) && errors.push(message.text()));
    await page.goto("/onboarding/monito");
    await expect(page.locator("main[data-restored]")).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("profile form", () => {
  test("a reload keeps the unsaved fields @mock", async ({ page }, testInfo) => {
    const { profile } = copyOf(testInfo);
    await page.goto("/onboarding/profile");
    await expect(page.locator("form[data-restored]")).toBeVisible();
    const company = page.getByLabel(profile.company, { exact: true });
    await company.fill("Persistente SA");
    await page.reload();
    await expect(page.locator("form[data-restored]")).toBeVisible();
    await expect(company).toHaveValue("Persistente SA");
  });
});

test.describe("connect screen", () => {
  test("a QR that is not a personal Compa QR says so @mock", async ({ page }, testInfo) => {
    const { connect } = copyOf(testInfo);
    await fakeCamera(page, await QRCode.toDataURL("https://example.com/menu", { margin: 4, width: 480 }));
    await page.goto("/connect?tab=scan");
    await expect(page.getByRole("alert").filter({ hasText: connect.invalidQr })).toBeVisible({ timeout: 30_000 });
  });

  test("searching by name lists the people found, each with its own Conectar @mock", async ({ page }, testInfo) => {
    const { connect } = copyOf(testInfo);
    await page.goto("/connect?tab=scan");
    const box = page.getByLabel(connect.searchLabel);
    await expect(async () => {
      await box.fill("vale");
      await box.press("Enter");
      await expect(page.locator(`a[href="/connect/${rodrigo.handle}"]`)).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 45_000 });
    await expect(page.locator(`a[href="/connect/${valeriaPublic.handle}"]`)).toBeVisible();
  });
});

test.describe("connections list", () => {
  test("the search button opens a name filter and the event chip toggles @mock", async ({ page }, testInfo) => {
    const { connections } = copyOf(testInfo);
    await page.goto("/connections");
    await page.getByRole("button", { name: connections.search }).click();
    await page.getByRole("searchbox").fill("rodri");
    await expect(page.getByRole("link", { name: new RegExp(rodrigo.name) })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(valeriaPublic.name) })).toHaveCount(0);
    // Closing the search shows everyone again.
    await page.getByRole("button", { name: connections.search }).click();
    await expect(page.getByRole("link", { name: new RegExp(valeriaPublic.name) })).toBeVisible();
    const chip = page.getByRole("button", { name: foundersDoor.name });
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("ranking and badges", () => {
  test("every podium place opens that person @mock", async ({ page }) => {
    await page.goto("/ranking");
    await expect(page.locator(`a[href="/people/${valeriaPublic.handle}"]`).first()).toBeVisible();
    await expect(page.locator(`a[href="/people/${rodrigo.handle}"]`).first()).toBeVisible();
  });

  test("another person's badges are theirs, not mine @mock", async ({ page }, testInfo) => {
    const { badges } = copyOf(testInfo);
    await page.goto(`/me/badges?of=${valeriaPublic.handle}`);
    await expect(page.getByText(badges.earned(valeriaProfile.badges?.length ?? 0, BADGE_IDS.length))).toBeVisible();
  });
});
