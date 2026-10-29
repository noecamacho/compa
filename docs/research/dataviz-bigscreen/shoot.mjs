// Screenshots every concept x scenario at 1920x1080 into shots/<concept>/<scenario>.jpg.
// Needs the static server: `python3 -m http.server 4100` from docs/research.
// Usage: PW_DIR=<dir with playwright installed> bun shoot.mjs [concept,...] [scenario,...]
// Playwright is not a repo dependency (research only), so it is resolved from PW_DIR.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(process.env.PW_DIR || here, "package.json"));
const { chromium } = require("playwright");

const BASE = process.env.BASE || "http://localhost:4100";
const SCENARIOS = ["zero-activity", "one-attendee", "trickle", "steady", "rush", "huge", "end-of-event", "after-event", "tie-heavy", "long-names-and-missing-photos"];
// The most telling moment per scenario (docs/research/sim/README.md): rush peak, closing minutes, frozen end, final ties.
const SHOT_AT = { "zero-activity": 300, "one-attendee": 300, rush: 760, "end-of-event": 540, "after-event": 600, "tie-heavy": 1200, "clock-skew-and-reconnect": 1250 };
const scenarioDir = join(here, "..", "sim", "scenarios");

// Where in the replay each scenario is most telling. A scenario JSON may override with `shotAtSec`.
function shotTime(name) {
  const file = join(scenarioDir, name + ".json");
  if (!existsSync(file)) return 2400; // fixture
  const s = JSON.parse(readFileSync(file, "utf8"));
  if (typeof s.shotAtSec === "number") return s.shotAtSec;
  if (name in SHOT_AT) return SHOT_AT[name];
  return Math.round(0.7 * s.durationSec);
}

const [conceptArg, scenarioArg, extraArg] = process.argv.slice(2);
const concepts = conceptArg ? conceptArg.split(",") : readdirSync(join(here, "proto")).filter((f) => f.endsWith(".html") && !f.startsWith("_")).map((f) => f.replace(/\.html$/, ""));
const scenarios = scenarioArg ? scenarioArg.split(",") : SCENARIOS;
// Extra query per run, e.g. "stale=95&lang=es" -> file suffix.
const extra = extraArg || "";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("  pageerror:", e.message));
for (const concept of concepts) {
  mkdirSync(join(here, "shots", concept), { recursive: true });
  for (const scenario of scenarios) {
    const t = shotTime(scenario);
    const url = `${BASE}/dataviz-bigscreen/proto/${concept}.html?scenario=${scenario}&t=${t}&speed=0&shot=1${extra ? "&" + extra : ""}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 }).catch(() => console.error("  not ready:", url));
    await page.waitForTimeout(Number(process.env.SETTLE_MS || 2200));
    const suffix = extra ? "--" + extra.replace(/[^a-z0-9]+/gi, "-") : "";
    const out = join(here, "shots", concept, `${scenario}${suffix}.jpg`);
    await page.screenshot({ path: out, type: "jpeg", quality: 78 });
    console.log(`${concept}/${scenario}${suffix} t=${t} ${Math.round(statSync(out).size / 1024)} KB`);
  }
}
await browser.close();
