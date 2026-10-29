// Self-check: proto/_shared.js stateAt() matches docs/research/sim/derive.js. Run: bun parity.check.mjs <path to docs/research>
import { readFileSync } from "node:fs";
const root = process.argv[2];
globalThis.window = globalThis; globalThis.location = { search: "" }; globalThis.matchMedia = () => ({ matches: false }); globalThis.navigator = { language: "en" };
(0, eval)(readFileSync(root + "/sim/derive.js", "utf8"));
(0, eval)(readFileSync(root + "/dataviz-bigscreen/proto/_shared.js", "utf8"));
for (const name of ["steady", "tie-heavy", "rush", "end-of-event", "clock-skew-and-reconnect"]) {
  const s = JSON.parse(readFileSync(`${root}/sim/scenarios/${name}.json`, "utf8"));
  const t = s.durationSec;
  const theirs = CompaSim.leaderboardAt(s, t).slice(0, 8);
  const sorted = { ...s, events: [...s.events].sort((x, y) => x.t - y.t) };
  const mine = COMPA.stateAt(sorted, t);
  const c = CompaSim.countersAt(s, t);
  const ok = theirs.every((r, i) => (r.id ?? r.userId) === mine.leaderboard[i].id && r.points === mine.leaderboard[i].points);
  console.log(name, ok ? "LEADERBOARD OK" : "MISMATCH", JSON.stringify(theirs.slice(0,3).map(r=>[r.id??r.userId,r.points])), JSON.stringify(mine.leaderboard.slice(0,3).map(p=>[p.id,p.points])), "counters", JSON.stringify(c), JSON.stringify(mine.counters));
}
