// Screenshot every concept x scenario x viewport. Needs `python3 -m http.server 4200` from docs/research.
// Usage: node shoot.mjs [concept,...] [scenario,...]   (PW=/abs/path/to/playwright/index.mjs if not installed locally)
import { readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || "http://localhost:4200/dataviz-phone/proto";
const all = readdirSync(join(here, "proto")).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5));
const concepts = process.argv[2] ? process.argv[2].split(",") : all;
const SCENARIOS = process.argv[3] ? process.argv[3].split(",") : ["zero-activity", "one-attendee", "trickle", "steady", "rush", "huge", "end-of-event", "after-event", "tie-heavy", "long-names-and-missing-photos"];
const SIZES = [[360, 740], [390, 844], [430, 932], [834, 1194]];
// Extra persona shots at 390: me at rank 1, last, tied, anonymous, zero connections, offline, English.
const EXTRA = [["me-top", "steady", "me=@top"], ["me-last", "steady", "me=@last"], ["me-tied", "tie-heavy", "me=@tied"], ["me-anon", "steady", "me=@anon"], ["me-zero", "trickle", "me=@zero"], ["offline", "steady", "stale=180"], ["en", "long-names-and-missing-photos", "lang=en"]];

// PW: absolute path to playwright/index.mjs when it is not installed in the repo.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch();
for (const c of concepts) {
  mkdirSync(join(here, "shots", c), { recursive: true });
  const jobs = [];
  for (const s of SCENARIOS) for (const [w, h] of SIZES) jobs.push([`${s}-${w}`, s, "", w, h]);
  for (const [n, s, q] of EXTRA) jobs.push([`${n}-390`, s, q, 390, 844]);
  for (const [file, s, q, w, h] of jobs) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    await page.goto(`${BASE}/${c}.html?scenario=${s}&speed=0&${q}`, { waitUntil: "networkidle" });
    await page.waitForSelector("body[data-ready]", { timeout: 8000 }).catch(() => console.log("not ready", c, s));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(here, "shots", c, `${file}.png`), fullPage: false });
    await page.close();
  }
  console.log("done", c, jobs.length);
}
await browser.close();
