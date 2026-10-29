// F-28 Voice note on the register screen: Chromium's fake microphone records, POST /api/transcribe (multipart)
// answers the mock example, and the note waits in sessionStorage for the done page. Errors fall back to no note.
import { E } from "../../lib/api/errors";
import type { Page } from "@playwright/test";
import { ids, valeriaPublic } from "../../lib/api/examples";
import { register } from "../../lib/copy/es";
import { formatClock } from "../../lib/format";
import { transcribe } from "../../lib/api/routes";
import { errorCopy, expect, test } from "../fixtures";
import { expectError, skipTours } from "./helpers";

const TRANSCRIPT = transcribe.success.example?.text ?? "";
const noteButton = (page: Page) => page.getByRole("button", { name: new RegExp(register.noteTitle) });
const recordingButton = (page: Page) => page.getByRole("button", { name: new RegExp(register.tapToStop) });
const confirmButton = (page: Page, points: number) => page.getByRole("button", { name: register.confirm(points) });

async function openRegister(page: Page): Promise<void> {
  await page.goto(`/connect/${valeriaPublic.handle}`);
  await expect(confirmButton(page, 20)).toBeVisible();
}

test.describe("connect: voice note on the register screen", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test.describe("with a microphone", () => {
    test.beforeEach(({ browserName }) => test.skip(browserName === "webkit", "WebKit has no fake microphone here"));

    test("record, stop, transcribe: the note is saved, adds +15 and travels to the done page @mock", async ({ page }) => {
      await openRegister(page);
      await noteButton(page).click();
      await expect(recordingButton(page)).toBeVisible();
      await expect(recordingButton(page)).toContainText(register.recording(formatClock("es", 1)));
      const upload = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith("/api/transcribe"));
      await recordingButton(page).click();
      expect((await upload).headers()["content-type"]).toContain("multipart/form-data");
      await expect(page.getByText(register.noteSavedHint)).toBeVisible();
      await expect(page.getByText(new RegExp(register.noteSaved("").trim()))).toBeVisible();
      await expect(page.getByRole("button", { name: register.rerecord })).toBeVisible();
      await confirmButton(page, 35).click();
      await expect(page).toHaveURL(new RegExp(`/connections/${ids.connection}/done$`));
      const stored = await page.evaluate((key) => sessionStorage.getItem(key), `compa:note:${ids.connection}`);
      expect(JSON.parse(stored ?? "{}")).toMatchObject({ text: TRANSCRIPT });
    });

    test("re-record replaces the saved note @mock", async ({ page }) => {
      await openRegister(page);
      await noteButton(page).click();
      await recordingButton(page).click();
      await page.getByRole("button", { name: register.rerecord }).click();
      await expect(recordingButton(page)).toBeVisible();
      await recordingButton(page).click();
      await expect(page.getByText(register.noteSavedHint)).toBeVisible();
      await expect(confirmButton(page, 35)).toBeVisible();
    });

    test("recording stops by itself at two minutes @mock", async ({ page }) => {
      await page.clock.install();
      await openRegister(page);
      await noteButton(page).click();
      await expect(recordingButton(page)).toBeVisible();
      const upload = page.waitForRequest((request) => request.url().endsWith("/api/transcribe"));
      await page.clock.runFor(120_000);
      await upload;
      await expect(page.getByText(register.noteSaved(formatClock("es", 120)))).toBeVisible();
    });

    for (const error of [E.invalidAudio, E.transcriptionFailed, E.rateLimited, E.unauthorized]) {
      test(`${error.code} from /api/transcribe keeps the recording for a retry and the request still goes out @mock`, async ({ page, mock }) => {
        await mock.mockError(error.code, "**/api/transcribe");
        await openRegister(page);
        await noteButton(page).click();
        await recordingButton(page).click();
        await expect(page.getByText(errorCopy(error))).toBeVisible();
        await expect(page.getByRole("button", { name: register.retryUpload })).toBeVisible();
        await expect(noteButton(page)).toBeVisible();
        await confirmButton(page, 20).click();
        await expect(page).toHaveURL(/\/done$/);
      });
    }
  });

  test("a denied microphone says so and the form still works @mock", async ({ page, context }) => {
    await context.addInitScript(() => {
      const deny = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
      if (navigator.mediaDevices) Reflect.set(navigator.mediaDevices, "getUserMedia", deny);
    });
    await openRegister(page);
    await noteButton(page).click();
    await expect(page.getByText(register.micUnavailable)).toBeVisible();
    await confirmButton(page, 20).click();
    await expect(page).toHaveURL(/\/done$/);
  });

  test("/api/transcribe without audio is 400 invalid_audio, signed out 401 @real", async ({ page, realUser, browser, baseURL }) => {
    expect(realUser.user.id).toBeTruthy();
    await expectError(await page.request.post("/api/transcribe", { multipart: { note: "no audio here" } }), 400, "invalid_audio");
    const anonymous = await browser.newContext({ baseURL });
    await expectError(await anonymous.request.post("/api/transcribe", { multipart: { note: "x" } }), 401, "unauthorized");
    await anonymous.close();
  });
});
