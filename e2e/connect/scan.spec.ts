// F-17, F-18, F-20 Scan in the app. Chromium's fake camera feeds the viewfinder; desktop Linux Chromium has no
// BarcodeDetector, so a stand-in detector returns whatever QR text the spec shows it. WebKit grants no camera.
import type { BrowserContext, Page } from "@playwright/test";
import { valeriaPublic } from "../../lib/api/examples";
import { connect, register } from "../../lib/copy/es";
import { expect, test } from "../fixtures";
import { connectLink, skipTours } from "./helpers";

// The stand-in counts its calls so a spec can wait for detection rounds instead of sleeping.
async function fakeDetector(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    class FakeBarcodeDetector {
      async detect(): Promise<{ rawValue: string }[]> {
        Reflect.set(globalThis, "__compaDetections", Number(Reflect.get(globalThis, "__compaDetections") ?? 0) + 1);
        const raw: unknown = Reflect.get(globalThis, "__compaQr");
        return typeof raw === "string" ? [{ rawValue: raw }] : [];
      }
    }
    Reflect.set(globalThis, "BarcodeDetector", FakeBarcodeDetector);
  });
}

async function showQr(page: Page, text: string): Promise<void> {
  await page.evaluate((value) => Reflect.set(globalThis, "__compaQr", value), text);
}

const detections = (page: Page) => page.evaluate(() => Number(Reflect.get(globalThis, "__compaDetections") ?? 0));

async function openScanner(page: Page): Promise<void> {
  await page.goto("/connect?tab=scan");
  await expect(page.getByText(connect.aim)).toBeVisible();
}

test.describe("connect: scan with the camera", () => {
  test.beforeEach(async ({ context, browserName }) => {
    test.skip(browserName === "webkit", "WebKit grants no camera here: the denied path has its own test");
    await skipTours(context);
    await fakeDetector(context);
  });

  test("a personal QR shows the person and Conectar opens the register screen @mock", async ({ page, baseURL }) => {
    await openScanner(page);
    const lookup = page.waitForRequest((request) => request.url().endsWith(`/api/users/${valeriaPublic.handle}`));
    await showQr(page, `${baseURL}/u/${valeriaPublic.handle}`);
    await lookup;
    await expect(page.getByText(valeriaPublic.name)).toBeVisible();
    await connectLink(page).click();
    await expect(page).toHaveURL(new RegExp(`/connect/${valeriaPublic.handle}$`));
    await expect(page.getByRole("heading", { name: register.title })).toBeVisible();
  });

  test("a QR from any other site or an event QR is ignored @mock", async ({ page }) => {
    await openScanner(page);
    const lookups: string[] = [];
    page.on("request", (request) => request.url().includes("/api/users/") && lookups.push(request.url()));
    for (const text of ["https://example.com/menu", "WIFI:S:venue;T:WPA;P:secret;;", "https://compa.lol/e/k7m2p9xq4t"]) {
      await showQr(page, text);
      const seen = await detections(page);
      await expect.poll(() => detections(page)).toBeGreaterThan(seen + 1);
    }
    expect(lookups).toEqual([]);
    await expect(connectLink(page)).toHaveCount(0);
  });

  test("a personal QR of an unknown handle says nobody was found @mock", async ({ page, mock, baseURL }) => {
    await mock.mockError("user_not_found", "**/api/users/**");
    await openScanner(page);
    await showQr(page, `${baseURL}/u/nobody-here`);
    await expect(page.getByText(connect.notFound)).toBeVisible();
    await expect(connectLink(page)).toHaveCount(0);
  });

  test("scanning a real attendee's QR opens their register screen @real", async ({ page, realUser, testUsers, baseURL }) => {
    const [target] = await testUsers(1);
    if (!target) throw new Error("test user not created");
    expect(realUser.user.id).not.toBe(target.id);
    await openScanner(page);
    await showQr(page, `${baseURL}/u/${target.handle}`);
    await expect(page.getByText(target.name)).toBeVisible();
    await connectLink(page).click();
    await expect(page).toHaveURL(new RegExp(`/connect/${target.handle}$`));
    await expect(page.getByText(target.name).first()).toBeVisible();
  });
});

test.describe("connect: no camera", () => {
  test.beforeEach(async ({ context, browserName }) => {
    await skipTours(context);
    if (browserName === "webkit") return;
    // Chromium auto-grants the fake camera; deny it the way a person tapping "Block" would.
    await context.addInitScript(() => {
      const deny = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
      if (navigator.mediaDevices) Reflect.set(navigator.mediaDevices, "getUserMedia", deny);
    });
  });

  test("a denied camera says so and keeps the name search and my QR @mock", async ({ page }) => {
    await page.goto("/connect?tab=scan");
    await expect(page.getByText(connect.cameraUnavailable)).toBeVisible();
    await expect(page.getByText(connect.aim)).toHaveCount(0);
    await expect(page.getByRole("searchbox", { name: connect.searchLabel })).toBeVisible();
    await page.getByRole("button", { name: connect.myQr }).click();
    await expect(page).toHaveURL(/\/connect$/);
  });
});
