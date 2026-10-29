// Conference-scale client resilience (docs/research/conference-load.md findings 10 and 17), in mock mode.
// The camera is faked in the page: a canvas stream of a real personal QR, or a refused permission.
import QRCode from "qrcode";
import { valeriaProfile } from "../lib/api/examples";
import { copyFor } from "../lib/copy";
import { localeFromAcceptLanguage } from "../lib/i18n";
import { expect, test } from "./fixtures";

const copyOf = (testInfo: { project: { use: { locale?: string } } }) => copyFor(localeFromAcceptLanguage(testInfo.project.use.locale));

const REQUEST_ID = "0d9c8b7a-6f5e-4d3c-8b1a-0f9e8d7c6b5a";
const HANDLE = valeriaProfile.card.handle;

test.describe("request screen on a bad network", () => {
  test("a decline that cannot reach the server stays on screen with a localized reason @mock", async ({ page }, testInfo) => {
    const { apiErrors, common } = copyOf(testInfo);
    await page.goto(`/requests/${REQUEST_ID}`);
    await page.route("**/api/connections/*/decline", (route) => route.abort("internetdisconnected"));
    await expect(async () => {
      await page.getByRole("button", { name: common.notNow }).click();
      await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(apiErrors.codes.network_error, { timeout: 5_000 });
    }).toPass({ timeout: 45_000 });
    await expect(page).toHaveURL(new RegExp(`/requests/${REQUEST_ID}$`));
  });

  test("an accept that never answers times out instead of spinning forever @mock", async ({ page }, testInfo) => {
    const { apiErrors, request } = copyOf(testInfo);
    await page.goto(`/requests/${REQUEST_ID}`);
    await page.route("**/api/connections/*/accept", () => undefined);
    await expect(async () => {
      await page.getByRole("button", { name: request.accept }).click();
      await expect(page.getByRole("button", { name: request.accepting })).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 45_000 });
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(apiErrors.codes.timeout, { timeout: 25_000 });
    await expect(page.getByRole("button", { name: request.accept })).toBeEnabled();
  });

  test("a documented error shows localized copy, never the English server message @mock", async ({ page, mock }, testInfo) => {
    const { apiErrors, request } = copyOf(testInfo);
    await page.goto(`/requests/${REQUEST_ID}`);
    await mock.mockError("event_ended", "**/api/connections/*/accept");
    await expect(async () => {
      await page.getByRole("button", { name: request.accept }).click();
      await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(apiErrors.codes.event_ended, { timeout: 5_000 });
    }).toPass({ timeout: 45_000 });
  });
});

test.describe("in-app scanner without BarcodeDetector", () => {
  test("reads a personal QR with the JS decoder and offers to connect @mock", async ({ page, baseURL }, testInfo) => {
    const {  } = copyOf(testInfo);
    const qr = await QRCode.toDataURL(`${baseURL}/u/${HANDLE}`, { margin: 4, width: 480 });
    await page.addInitScript((src: string) => {
      delete (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector;
      const fake = async (): Promise<MediaStream> => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const context = canvas.getContext("2d");
        const draw = () => {
          context?.fillRect(0, 0, 640, 480);
          context?.drawImage(image, 80, 0, 480, 480);
        };
        draw();
        setInterval(draw, 100);
        return canvas.captureStream(10);
      };
      Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: fake }, configurable: true });
    }, qr);
    await page.goto("/connect?tab=scan");
    await expect(page.locator(`a[href="/connect/${HANDLE}"]`)).toBeVisible({ timeout: 30_000 });
  });

  test("a refused camera says how to fix it and points to the camera app @mock", async ({ page }, testInfo) => {
    const { connect } = copyOf(testInfo);
    await page.addInitScript(() => {
      const refuse = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
      Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: refuse }, configurable: true });
    });
    await page.goto("/connect?tab=scan");
    await expect(page.getByRole("status").filter({ hasText: connect.camera.denied })).toBeVisible({ timeout: 30_000 });
  });
});
