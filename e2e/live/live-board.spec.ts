// The projected live board under every scenario it must survive (docs/research/live-dataviz.md). Runs against
// `API_MODE=mock bun run dev`: the server renders the mock snapshot, then the board's 3 s poll is answered here
// with scripted frames from lib/testing/live-scenarios.ts. No database, no LinkedIn.
// LIVE_SHOTS=<dir> also writes the screenshots used in the research doc. Each test sets its own viewport and locale,
// so the spec runs once, in the live-1920-en project.
import type { Page, Route } from "@playwright/test";
import path from "node:path";
import { VIZ_IDS, type VizId } from "../../lib/live/rotation";
import { FRAME_MS, SCENARIOS, scenarioFrames, type ScenarioName } from "../../lib/testing/live-scenarios";
import { expect, test } from "../fixtures";

const LIVE_PATH = "/e/k7m2p9xq4t/live";
// The board's own scenarios pin the loom; the visualization tests below pick each view.
const LOOM = "?viz=loom";
const POLL = "**/api/e/*/live";
const inLocale = (locale: "es-MX" | "en-US") => ({ locale, extraHTTPHeaders: { "Accept-Language": locale } });
const VIEWPORTS = { phone: { width: 390, height: 844 }, tablet: { width: 834, height: 1112 }, laptop: { width: 1440, height: 900 }, screen: { width: 1920, height: 1080 } } as const;

type Serve = { fail?: (poll: number) => boolean; frames?: ReturnType<typeof scenarioFrames>; query?: string };

// Answers the board's polls in order; after the last frame it keeps answering with the last one, a poll later each
// time, like a live server in a quiet room (a repeated `generatedAt` would read as a stuck snapshot).
async function serveScenario(page: Page, name: ScenarioName, options: Serve = {}) {
  const frames = options.frames ?? scenarioFrames(name);
  const polls: number[] = [];
  await page.route(POLL, async (route: Route) => {
    const poll = polls.length;
    polls.push(Date.now());
    if (options.fail?.(poll)) return route.abort("internetdisconnected");
    const frame = frames[Math.min(poll, frames.length - 1)];
    const extra = Math.max(0, poll - frames.length + 1);
    if (!frame || extra === 0) return route.fulfill({ json: frame });
    return route.fulfill({ json: { ...frame, generatedAt: new Date(Date.parse(frame.generatedAt) + extra * FRAME_MS).toISOString() } });
  });
  return polls;
}

async function openBoard(page: Page, name: ScenarioName, polls = 1, options: Serve = {}) {
  const seen = await serveScenario(page, name, options);
  await page.goto(`${LIVE_PATH}${options.query ?? LOOM}`);
  await expect.poll(() => seen.length, { timeout: 15_000 * polls }).toBeGreaterThanOrEqual(polls);
  // Let React commit the last answered frame.
  await page.waitForTimeout(400);
  return seen;
}

async function shot(page: Page, name: string) {
  const dir = process.env.LIVE_SHOTS;
  // Let entrance animations (feed rows, podium) finish; the endless ones (live dot, rush pill) never do.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  await page.screenshot({ path: test.info().outputPath(`${name}.png`) });
  if (dir) await page.screenshot({ path: path.join(dir, `${name}.jpg`), type: "jpeg", quality: 70 });
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.beforeEach(async ({}, testInfo) => test.skip(testInfo.project.name.endsWith("-es"), "each test sets its own locale"));

const counter = (page: Page, label: string) =>
  page
    .locator("dl > div")
    .filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) })
    .locator("dd");

test.describe("live board scenarios @live @mock", () => {
  test.use({ viewport: VIEWPORTS.screen, ...inLocale("en-US") });

  test("zero: nobody in, the board invites the first person", async ({ page }) => {
    await openBoard(page, "zero");
    await expect(page.getByTestId("live-empty")).toContainText("Nobody is in yet");
    await expect(page.getByTestId("live-pulse")).toHaveAttribute("data-mood", "empty");
    await expect(page.getByTestId("live-feed")).toContainText("New connections show up here.");
    await expect(page.getByTestId("live-leaderboard")).toContainText("No connections yet");
    await shot(page, "zero-1920");
  });

  test("upcoming: doors-open card and the SOON pill", async ({ page }) => {
    await openBoard(page, "upcoming");
    await expect(page.getByTestId("live-upcoming")).toContainText("Doors open at");
    await expect(page.getByText("SOON")).toBeVisible();
    await expect(page.getByText("LIVE", { exact: true })).toHaveCount(0);
    await shot(page, "upcoming-1920");
  });

  test("one attendee: still empty, the loom is ready", async ({ page }) => {
    await openBoard(page, "oneAttendee");
    await expect(page.getByTestId("live-empty")).toContainText("The loom is ready");
    await expect(counter(page, "people")).toHaveText("1");
    await shot(page, "one-attendee-1920");
  });

  test("trickle: counters, feed and pulse follow each poll", async ({ page }) => {
    const frames = scenarioFrames("trickle");
    await openBoard(page, "trickle", 3);
    const shown = Number(await counter(page, "connections").innerText());
    expect(shown).toBeGreaterThanOrEqual(frames[1]!.counters.connections);
    await expect(page.getByTestId("live-pulse")).toHaveAttribute("data-mood", "steady");
    await expect(page.getByTestId("live-feed").locator("li")).toHaveCount(4);
    await expect(page.getByTestId("live-empty")).toHaveCount(0);
    await shot(page, "trickle-1920");
  });

  test("quiet: a nudge instead of a dead screen", async ({ page }) => {
    await openBoard(page, "quiet");
    await expect(page.getByTestId("live-pulse")).toHaveAttribute("data-mood", "quiet");
    await expect(page.getByTestId("live-pulse")).toContainText("say hi to someone new");
    await shot(page, "quiet-1920");
  });

  test("rush: the pulse calls it and the feed keeps four rows", async ({ page }) => {
    await openBoard(page, "rush", 2);
    await expect(page.getByTestId("live-pulse")).toHaveAttribute("data-mood", "rush");
    await expect(page.getByTestId("live-pulse")).toContainText("connections in 5 min!");
    await expect(page.getByTestId("live-feed").locator("li")).toHaveCount(4);
    await expectNoHorizontalScroll(page);
    await shot(page, "rush-1920");
  });

  test("ended: wrap-up card, final podium, ENDED pill", async ({ page }) => {
    const last = scenarioFrames("ended").at(-1)!;
    await openBoard(page, "ended");
    await expect(page.getByTestId("live-ended")).toContainText("That's a wrap!");
    await expect(page.getByTestId("live-ended")).toContainText(`${last.counters.connections} connections`);
    await expect(page.getByTestId("live-podium").locator("li")).toHaveCount(3);
    await expect(page.getByTestId("live-podium")).toContainText(last.people[0]!.name);
    await expect(page.getByTestId("live-feed")).toHaveCount(0);
    await expect(page.getByText("ENDED")).toBeVisible();
    await shot(page, "ended-1920");
  });

  test("after the event: same wrap-up hours later", async ({ page }) => {
    await openBoard(page, "afterEvent");
    await expect(page.getByTestId("live-ended")).toBeVisible();
    await expect(page.getByTestId("live-pulse")).toHaveAttribute("data-mood", "ended");
    await shot(page, "after-event-1920");
  });

  test("ties: equal people share first place", async ({ page }) => {
    await openBoard(page, "ties");
    const ranks = await page.getByTestId("live-leaderboard").locator("li button > span:first-child").allInnerTexts();
    expect(ranks.length).toBeGreaterThan(1);
    expect(new Set(ranks)).toEqual(new Set(["1"]));
    await shot(page, "ties-1920");
  });

  test("reconnects: reconnections counted apart", async ({ page }) => {
    const last = scenarioFrames("reconnects").at(-1)!;
    await openBoard(page, "reconnects", 6);
    await expect(counter(page, "reconnections")).toHaveText(String(last.counters.reconnections));
    await shot(page, "reconnects-1920");
  });

  test("long names never push the layout sideways", async ({ page }) => {
    await openBoard(page, "longNames", 2);
    await expectNoHorizontalScroll(page);
    await shot(page, "long-names-1920");
  });

  test("missing and broken photos fall back to the monito", async ({ page }) => {
    await openBoard(page, "missingPhotos", 2);
    await page.waitForLoadState("networkidle");
    const broken = await page.locator("img").evaluateAll((images) => images.filter((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 0).length);
    expect(broken).toBe(0);
    await shot(page, "missing-photos-1920");
  });

  test("thousands: 2,500 people and 4,000+ threads stay flat and responsive", async ({ page }) => {
    await openBoard(page, "thousands", 2);
    await expect(counter(page, "people")).toHaveText("2,500");
    // One mesh per peg and per thread drew ~13,000 calls (0.2 fps); instanced pegs and a merged weave stay near 60.
    // fps is not asserted: headless software WebGL on a loaded machine says nothing about a venue GPU.
    const host = page.locator("[data-draw-calls]");
    await expect.poll(async () => Number(await host.getAttribute("data-draw-calls"))).toBeGreaterThan(0);
    expect(Number(await host.getAttribute("data-draw-calls"))).toBeLessThan(120);
    await page.getByTestId("live-leaderboard").locator("li button").first().click();
    await expect(page.getByTestId("live-person")).toBeVisible();
    await page.getByRole("button", { name: "Show leaderboard" }).click();
    await shot(page, "thousands-1920");
  });
});

test.describe("live board resilience @live @mock", () => {
  test.use({ viewport: VIEWPORTS.laptop, ...inLocale("en-US") });

  test("network loss: reconnecting pill with the age of the data, backoff, then recovery", async ({ page }) => {
    const polls = await openBoard(page, "trickle", 3, { fail: (poll) => poll === 1 || poll === 2 });
    await expect(page.getByTestId("live-stale")).toContainText(/Reconnecting… data from \d+ s ago/);
    // A failure backs off to about 6 s (±20 % jitter), so the next poll must not come 3 s later.
    const gap = (polls[2] ?? 0) - (polls[1] ?? 0);
    expect(gap).toBeGreaterThan(4000);
    await expect.poll(() => polls.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(4);
    await expect(page.getByTestId("live-stale")).toHaveCount(0);
  });

  test("an older snapshot never replaces a newer one", async ({ page }) => {
    const frames = scenarioFrames("rush");
    const newest = frames.at(-1)!;
    await openBoard(page, "rush", 2, { frames: [newest, frames[0]!] });
    await expect(counter(page, "connections")).toHaveText(String(newest.counters.connections));
  });

  test("a stuck snapshot (same time twice) reads as stale", async ({ page }) => {
    const frame = scenarioFrames("trickle")[0]!;
    await openBoard(page, "trickle", 3, { frames: [frame, frame, frame] });
    await expect(page.getByTestId("live-stale")).toBeVisible();
  });

  test("the last ten minutes show an ends-in pill", async ({ page }) => {
    const frames = scenarioFrames("trickle").map((frame) => ({
      ...frame,
      event: { ...frame.event, endsAt: new Date(Date.parse(frame.generatedAt) + 8 * 60_000).toISOString() },
    }));
    await openBoard(page, "trickle", 1, { frames });
    await expect(page.getByTestId("live-closing")).toHaveText("Ends in 8 min");
  });

  test("the tab coming back polls at once", async ({ page }) => {
    const polls = await openBoard(page, "trickle", 1);
    const before = polls.length;
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect.poll(() => polls.length, { timeout: 1500 }).toBeGreaterThan(before);
  });

  test("tap a leaderboard row for the person card, close back to the board", async ({ page }) => {
    await openBoard(page, "trickle");
    await page.getByTestId("live-leaderboard").locator("li button").first().click();
    await expect(page.getByTestId("live-person")).toBeVisible();
    await page.getByRole("button", { name: "Show leaderboard" }).click();
    await expect(page.getByTestId("live-leaderboard")).toBeVisible();
  });

  test("a failing person card says so instead of spinning", async ({ page }) => {
    await page.route("**/api/e/*/live/people/*", (route) => route.fulfill({ status: 500, json: { error: { code: "internal", message: "boom" } } }));
    await openBoard(page, "trickle");
    await page.getByTestId("live-leaderboard").locator("li button").first().click();
    await expect(page.getByTestId("live-person")).toContainText("Reconnecting…");
  });
});

test.describe("live board reduced motion @live @mock", () => {
  test.use({ viewport: VIEWPORTS.laptop, ...inLocale("en-US"), reducedMotion: "reduce" });

  test("feed rows and pulse bars do not animate", async ({ page }) => {
    await openBoard(page, "rush", 2);
    const durations = await page.getByTestId("live-feed").locator("li").evaluateAll((items) => items.map((item) => parseFloat(getComputedStyle(item).animationDuration)));
    expect(durations.every((duration) => duration < 0.01)).toBe(true);
  });
});

// The 1920 screen is covered above; smaller screens check fit in both locales on the busiest and the final states.
const MATRIX: [keyof typeof VIEWPORTS, ScenarioName][] = [
  ["phone", "rush"],
  ["phone", "ended"],
  ["phone", "zero"],
  ["phone", "longNames"],
  ["tablet", "rush"],
  ["tablet", "ended"],
  ["laptop", "rush"],
  ["laptop", "ended"],
];

for (const locale of ["es-MX", "en-US"] as const) {
  test.describe(`live board fit ${locale} @live @mock`, () => {
    test.use(inLocale(locale));
    for (const [size, name] of MATRIX) {
      test(`${name} at ${size} fits without sideways scroll`, async ({ page }) => {
        const viewport = VIEWPORTS[size];
        await page.setViewportSize(viewport);
        await openBoard(page, name, 2);
        await expectNoHorizontalScroll(page);
        await expect(page.getByTestId("live-pulse")).toBeVisible();
        await expect(page.locator("main")).toHaveAttribute("lang", locale.slice(0, 2));
        if (locale === "en-US") await shot(page, `${name}-${viewport.width}`);
      });
    }
  });
}

// Two captures of the stage 700 ms apart: different bytes mean the view itself moved. Overlays that change on their
// own (the reconnecting pill, state cards, the rotation strip) are masked out.
async function stageMoves(page: Page): Promise<boolean> {
  const stage = page.getByTestId("live-stage");
  const mask = [page.getByTestId("live-stale"), page.getByTestId("live-viz-indicator"), page.locator('[data-testid="live-empty"] > div, [data-testid="live-ended"] > div, [data-testid="live-upcoming"] > div')];
  const before = await stage.screenshot({ animations: "allow", mask });
  await page.waitForTimeout(700);
  const after = await stage.screenshot({ animations: "allow", mask });
  return !before.equals(after);
}

const viewIn = (page: Page, id: VizId) => page.locator(`[data-testid="live-stage"][data-current="${id}"] [data-viz="${id}"]`);

test.describe("live visualizations @live @mock", () => {
  test.use({ viewport: VIEWPORTS.screen, ...inLocale("en-US") });

  for (const id of VIZ_IDS) {
    for (const name of ["zero", "rush", "ended", "thousands"] as const satisfies readonly ScenarioName[]) {
      test(`${id} in ${name}: shows, keeps moving, fits`, async ({ page }) => {
        // Two polls, two stage captures and two screenshots of a WebGL or canvas view: slow on a loaded machine.
        test.slow();
        await openBoard(page, name, 2, { query: `?viz=${id}` });
        await expect(viewIn(page, id)).toBeVisible();
        await expect(page.getByTestId("live-viz-indicator")).toHaveCount(0);
        expect(await stageMoves(page)).toBe(true);
        await expectNoHorizontalScroll(page);
        await shot(page, `viz-${id}-${name}-1920`);
      });
    }
  }

  for (const name of ["longNames", "missingPhotos", "trickle"] as const satisfies readonly ScenarioName[]) {
    test(`race in ${name}: names and photos hold up`, async ({ page }) => {
      await openBoard(page, name, 2, { query: "?viz=race" });
      await expect(viewIn(page, "race")).toBeVisible();
      await expectNoHorizontalScroll(page);
      const broken = await page.locator("img").evaluateAll((images) => images.filter((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 0).length);
      expect(broken).toBe(0);
      await shot(page, `viz-race-${name}-1920`);
    });
  }

  test("network loss keeps the view moving under the reconnecting pill", async ({ page }) => {
    await openBoard(page, "trickle", 3, { query: "?viz=orbit", fail: (poll) => poll >= 1 });
    await expect(page.getByTestId("live-stale")).toBeVisible();
    expect(await stageMoves(page)).toBe(true);
  });

  test("rotates to the next view on its timer, with the indicator", async ({ page }) => {
    await openBoard(page, "trickle", 1, { query: "?rotate=5" });
    const stage = page.getByTestId("live-stage");
    await expect(page.getByTestId("live-viz-indicator")).toBeVisible();
    const first = await stage.getAttribute("data-current");
    await expect.poll(() => stage.getAttribute("data-current"), { timeout: 12_000 }).not.toBe(first);
  });

  test("a reload starts on a different view than the one on screen", async ({ page }) => {
    await openBoard(page, "trickle", 1, { query: "?rotate=0" });
    const stage = page.getByTestId("live-stage");
    for (let reload = 0; reload < 3; reload++) {
      const before = await stage.getAttribute("data-current");
      await page.reload();
      await expect(stage).toHaveAttribute("data-current", /.+/);
      expect(await stage.getAttribute("data-current")).not.toBe(before);
    }
  });

  test("a bad viz or rotate value falls back to rotating views", async ({ page }) => {
    await openBoard(page, "trickle", 1, { query: "?viz=nope&rotate=abc" });
    await expect(page.getByTestId("live-viz-indicator")).toBeVisible();
  });

  test("tapping a race row opens the person card", async ({ page }) => {
    await openBoard(page, "trickle", 1, { query: "?viz=race" });
    await viewIn(page, "race").getByRole("button").first().click();
    await expect(page.getByTestId("live-person")).toBeVisible();
  });

  for (const id of VIZ_IDS) {
    test(`${id} fits a phone`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await openBoard(page, "rush", 2, { query: `?viz=${id}` });
      await expect(viewIn(page, id)).toBeVisible();
      await expectNoHorizontalScroll(page);
      await shot(page, `viz-${id}-rush-390`);
    });
  }
});

const NEW_VIEWS = ["cosmos", "garden", "marquee", "marbles", "skyline"] as const satisfies readonly VizId[];

test.describe("live visualization switcher @live @mock", () => {
  test.use({ viewport: VIEWPORTS.screen, ...inLocale("en-US") });

  test("tap a view to hold it past the rotation, tap again to release", async ({ page }) => {
    await openBoard(page, "trickle", 1, { query: "?rotate=5" });
    const stage = page.getByTestId("live-stage");
    const switcher = page.getByTestId("live-viz-indicator");
    await switcher.getByRole("button", { name: "Garden" }).click();
    await expect(stage).toHaveAttribute("data-current", "garden");
    await expect(switcher).toHaveAttribute("data-held", "garden");
    await expect(switcher.getByRole("button", { name: /Garden/ })).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(6500);
    await expect(stage).toHaveAttribute("data-current", "garden");
    await switcher.getByRole("button", { name: /Garden/ }).click();
    await expect(switcher).not.toHaveAttribute("data-held", /.+/);
    await expect.poll(() => stage.getAttribute("data-current"), { timeout: 12_000 }).not.toBe("garden");
  });

  test("the switcher works from the keyboard", async ({ page }) => {
    await openBoard(page, "trickle", 1, { query: "?rotate=0" });
    const button = page.getByTestId("live-viz-indicator").getByRole("button", { name: "Skyline" });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("live-stage")).toHaveAttribute("data-current", "skyline");
    await expect(button).toHaveAttribute("aria-pressed", "true");
  });

  test("a URL-pinned view shows no switcher", async ({ page }) => {
    await openBoard(page, "trickle", 1, { query: "?viz=marbles" });
    await expect(page.getByTestId("live-viz-indicator")).toHaveCount(0);
  });
});

test.describe("live visualization events @live @mock", () => {
  test.use({ viewport: VIEWPORTS.screen, ...inLocale("en-US") });

  for (const id of NEW_VIEWS) {
    test(`${id}: calm while nothing happens, says who connected when it does`, async ({ page }) => {
      test.slow();
      // Quiet: the frames only move time forward, so after the first one lands nothing is announced any more.
      await openBoard(page, "quiet", 2, { query: `?viz=${id}` });
      await expect(viewIn(page, id)).toBeVisible();
      await expect(page.getByTestId("live-event-caption")).toHaveCount(0, { timeout: 15_000 });
      expect(await stageMoves(page)).toBe(true);
      await shot(page, `viz-${id}-idle-1920`);
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await openBoard(page, "rush", 2, { query: `?viz=${id}` });
      await expect(page.getByTestId("live-event-caption")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("live-event-caption")).toHaveAttribute("data-kind", "connection");
      await expect(page.getByTestId("live-event-caption")).toContainText("⇄");
      await shot(page, `viz-${id}-reacting-1920`);
    });
  }

  test("a quiet room announces nothing, and a rush is cut to the newest few with a count", async ({ page }) => {
    await openBoard(page, "quiet", 3, { query: "?viz=garden" });
    await expect(page.getByTestId("live-event-caption")).toHaveCount(0, { timeout: 15_000 });
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await openBoard(page, "thousands", 2, { query: "?viz=marquee" });
    await expect(page.getByTestId("live-event-caption")).toContainText(/\+\d+ more/, { timeout: 15_000 });
  });

  test("a bilingual caption: Spanish says who joined", async ({ browser }) => {
    const context = await browser.newContext({ viewport: VIEWPORTS.screen, ...inLocale("es-MX") });
    const page = await context.newPage();
    const frames = scenarioFrames("trickle");
    const first = frames[0]!;
    const newcomer = { id: "00000000-0000-4000-8000-00000000abcd", name: "Zoe Nueva", photoUrl: null, points: 0, connections: 0 };
    const second = { ...first, people: [...first.people, newcomer], counters: { ...first.counters, checkedIn: first.counters.checkedIn + 1 }, generatedAt: new Date(Date.parse(first.generatedAt) + FRAME_MS).toISOString() };
    await openBoard(page, "trickle", 2, { query: "?viz=skyline", frames: [first, second] });
    await expect(page.getByTestId("live-event-caption")).toContainText("Zoe Nueva entró");
    await context.close();
  });
});

test.describe("live visualizations, reduced motion @live @mock", () => {
  test.use({ viewport: VIEWPORTS.laptop, ...inLocale("en-US"), reducedMotion: "reduce" });

  for (const id of VIZ_IDS) {
    test(`${id} holds still`, async ({ page }) => {
      // One frame repeated (time still moves): no new data may land between the two captures.
      await openBoard(page, "trickle", 1, { query: `?viz=${id}`, frames: scenarioFrames("trickle").slice(-1) });
      await expect(viewIn(page, id)).toBeVisible();
      await page.waitForTimeout(800);
      expect(await stageMoves(page)).toBe(false);
    });
  }
});

test("every scenario frame passes the snapshot schema", async () => {
  const { LiveSnapshot } = await import("../../lib/api/schemas");
  for (const name of SCENARIOS) for (const frame of scenarioFrames(name)) LiveSnapshot.parse(frame);
});
