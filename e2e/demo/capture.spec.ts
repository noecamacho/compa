// D4: the simulated scan and voice note of demo mode (API_MODE=demo). Neither asks for the camera or the microphone:
// the scan "reads" the next person the visitor has not met, and a recording returns the demo's prepared transcript.
import type { Page } from "@playwright/test";
import { copyFor } from "../../lib/copy";
import { demoCast } from "../../lib/demo/cast";
import { demoConnectionId } from "../../lib/demo/visitor";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { firstName } from "../../lib/format";
import { skipTours } from "../connect/helpers";
import { expect, test } from "../fixtures";

const cast = demoCast();
const alina = cast[0]!;
let copy = copyFor("es");

// Any camera or microphone request fails the test: demo mode must never ask for one.
async function forbidMedia(page: Page) {
  await page.addInitScript(() => {
    const refuse = () => {
      Reflect.set(window, "__mediaAsked", true);
      return Promise.reject(new DOMException("demo", "NotAllowedError"));
    };
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: refuse }, configurable: true });
  });
}

const mediaAsked = (page: Page) => page.evaluate(() => Reflect.get(window, "__mediaAsked") === true);

test.beforeEach(async ({ context, page }, testInfo) => {
  copy = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale));
  await skipTours(context);
  await forbidMedia(page);
});

test.describe("demo mode: simulated scan and voice note", () => {
  test("the scan finds the next person without the camera and opens their register screen @demo", async ({ page }) => {
    await page.goto("/connect?tab=scan");
    await expect(page.getByRole("status")).toHaveText(copy.demoCapture.scanning);
    const connect = page.getByRole("link", { name: `${copy.connect.connectButton}: ${alina.name}` });
    await expect(connect).toBeVisible();
    await connect.click();
    await expect(page).toHaveURL(new RegExp(`/connect/${alina.handle}$`));
    expect(await mediaAsked(page)).toBe(false);
  });

  test("a voice note on the register screen records and saves without the microphone @demo", async ({ page }) => {
    await page.goto(`/connect/${alina.handle}`);
    await page.getByRole("button", { name: new RegExp(copy.register.noteTitle) }).click();
    await page.getByRole("button", { name: new RegExp(copy.register.tapToStop) }).click();
    await expect(page.getByText(copy.register.noteSavedHint)).toBeVisible();
    expect(await mediaAsked(page)).toBe(false);
  });

  test("the note screen records, drafts the prepared transcript and saves it +15 @demo", async ({ page }) => {
    await page.goto(`/connect/${alina.handle}`);
    await page.getByRole("button", { name: copy.register.confirm(50) }).click();
    // The fictional person accepts a few seconds later; only an accepted connection takes a note.
    await expect(page.getByRole("heading", { name: copy.confirmation.titleNew(firstName(alina.name)) })).toBeVisible({ timeout: 15_000 });

    await page.goto(`/connections/${demoConnectionId(0)}/note`);
    await page.getByRole("button", { name: copy.note.rerecord }).click();
    await page.getByRole("button", { name: copy.note.stop }).click();
    await expect(page.getByText(copy.note.understood)).toBeVisible();
    await expect(page.getByText(copy.demoApi.transcript)).toBeVisible();
    await page.getByRole("button", { name: copy.note.save }).click();
    await expect(page).toHaveURL(new RegExp(`/people/${alina.handle}$`));
    expect(await mediaAsked(page)).toBe(false);
  });
});
