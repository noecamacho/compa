// D6: the director that records the demo video. It walks the /demo guide (D3) by hand with fixed holds, so every take
// has the same pacing, then shows the organizer console, and saves a 1920×1080 video to recordings/ (git-ignored).
// Opt-in: it runs only with DEMO_RECORD=1 against an API_MODE=demo server (README "Record the demo video").
import type { FrameLocator, Page } from "@playwright/test";
import { copyFor } from "../../lib/copy";
import { demoCast } from "../../lib/demo/cast";
import { DEMO_EVENT_SLUG } from "../../lib/demo/scenario";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { firstName } from "../../lib/format";
import { expect, test } from "../fixtures";

const SIZE = { width: 1920, height: 1080 };
// How long each shot stays on screen once it is ready; the waits before it absorb the server's speed.
const HOLD_MS = 5_000;
const LONG_HOLD_MS = 7_000;
const RECORDING_MS = 3_000;
const OUT_DIR = process.env.DEMO_RECORD_DIR ?? "recordings";

// A fresh visitor has met nobody, so the guide connects them with the first person of the cast.
const alina = demoCast()[0]!;

// Skipped before any fixture, so a normal @demo run opens no page and records nothing.
test.skip(!process.env.DEMO_RECORD, "Records a video; run it with DEMO_RECORD=1.");
test.use({ viewport: SIZE, video: { mode: "on", size: SIZE } });

test("records the demo video @demo", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const locale = localeFromAcceptLanguage(testInfo.project.use.locale);
  const { demo, connect, confirmation, note } = copyFor(locale);
  const phone = page.frameLocator(`iframe[title="${demo.phoneTitle}"]`);
  const screen = page.frameLocator(`iframe[title="${demo.screenTitle}"]`);
  const hold = (ms = HOLD_MS) => page.waitForTimeout(ms);
  const goTo = async (index: number) => {
    await page.getByRole("button", { name: demo.steps[index]!.label }).click();
    await expect(page.getByText(demo.stepOf(index + 1, demo.steps.length))).toBeVisible();
  };

  await page.goto("/demo");
  // The director sets the pace, not the guide's own timer.
  await expect(async () => {
    await page.getByRole("button", { name: demo.pause }).click({ timeout: 1_000 });
    await expect(page.getByRole("button", { name: demo.play })).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await ready(page, screen, /^\/e\/[^/]+\/live$/);
  await ready(page, phone, /^\/home$/);
  await hold(LONG_HOLD_MS);

  await goTo(1);
  await ready(page, phone, /^\/connect$/);
  await hold();
  // The simulated scan "reads" the next person without a camera.
  await phone.getByRole("button", { name: connect.scan }).click();
  await expect(phone.getByRole("link", { name: `${connect.connectButton}: ${alina.name}` })).toBeVisible();
  await hold();

  await goTo(2);
  await ready(page, phone, new RegExp(`^/connect/${alina.handle}$`));
  await hold();

  await goTo(3);
  // The fictional person accepts a few seconds later; meanwhile the big screen draws the new thread.
  await expect(phone.getByRole("heading", { name: confirmation.titleNew(firstName(alina.name)) })).toBeVisible({ timeout: 20_000 });
  await hold(LONG_HOLD_MS);

  await goTo(4);
  await ready(page, phone, /\/note$/);
  await phone.getByRole("button", { name: note.rerecord }).click();
  await page.waitForTimeout(RECORDING_MS);
  await phone.getByRole("button", { name: note.stop }).click();
  await expect(phone.getByText(note.understood)).toBeVisible();
  await hold(LONG_HOLD_MS);

  await goTo(5);
  await ready(page, phone, /^\/ranking$/);
  await hold(LONG_HOLD_MS);

  // "The computer" of the video: the organizer console of the same room.
  await page.goto(`/admin/events/${DEMO_EVENT_SLUG}`);
  await expect(page.getByRole("heading", { name: "COMPA Community Night" })).toBeVisible();
  await hold(LONG_HOLD_MS);

  await page.close();
  const file = `${OUT_DIR}/compa-demo-${locale}.webm`;
  await page.video()!.saveAs(file);
  testInfo.annotations.push({ type: "video", description: file });
});

// A frame is ready once it shows the page at that path and that page has painted its main content.
async function ready(page: Page, frame: FrameLocator, path: RegExp) {
  await expect.poll(() => page.frames().some((each) => path.test(new URL(each.url()).pathname))).toBe(true);
  await expect(frame.locator("main").first()).toBeVisible({ timeout: 20_000 });
}
