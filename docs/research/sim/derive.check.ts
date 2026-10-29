// Self-check, kept out of the repo's `bun test` glob. Run: `bun test ./docs/research/sim/derive.check.ts`.
import { describe, expect, test } from "bun:test";
import { countersAt, feedAt, leaderboardAt, topicsAt, type Scenario } from "./derive";
import { buildAll } from "./generate";

const dir = new URL(".", import.meta.url).pathname;
const load = async (name: string): Promise<Scenario> => Bun.file(`${dir}scenarios/${name}.json`).json();

describe("simulator", () => {
  test("is deterministic and matches the committed files", async () => {
    const first = buildAll();
    expect(JSON.stringify(buildAll())).toBe(JSON.stringify(first));
    for (const scenario of first) expect(JSON.stringify(scenario)).toBe(await Bun.file(`${dir}scenarios/${scenario.name}.json`).text());
  });

  test("huge.json stays under 3 MB", () => {
    expect(Bun.file(`${dir}scenarios/huge.json`).size).toBeLessThan(3_000_000);
  });

  test("tie-heavy leaderboard follows points, connections, earliest check-in", async () => {
    const scenario = await load("tie-heavy");
    const rows = leaderboardAt(scenario, scenario.durationSec);
    const id = (n: number) => `u${String(n).padStart(4, "0")}`;
    const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => id(from + i));
    const checkin = new Map(scenario.events.filter((e) => e.type === "checkin").map((e) => [e.a, e.t]));
    const byCheckin = (ids: string[]) => [...ids].sort((x, y) => (checkin.get(x) ?? 0) - (checkin.get(y) ?? 0));
    const expected = [...byCheckin(range(1, 20)), ...byCheckin(range(31, 36)), ...byCheckin(range(21, 30)), ...byCheckin(range(37, 40))];
    expect(rows.map((row) => row.id)).toEqual(expected);
    expect(rows.slice(0, 20).every((row) => row.points === 150 && row.connections === 3)).toBe(true);
    expect(rows.slice(20, 26).every((row) => row.points === 100 && row.connections === 5)).toBe(true);
    expect(rows.slice(26, 36).every((row) => row.points === 100 && row.connections === 2)).toBe(true);
    expect(rows.slice(36).every((row) => row.points === 0)).toBe(true);
  });

  test("clock-skew duplicates and disorder do not change totals", async () => {
    const scenario = await load("clock-skew-and-reconnect");
    const sorted: Scenario = { ...scenario, events: [...new Set(scenario.events.map((e) => JSON.stringify(e)))].map((e) => JSON.parse(e)) };
    expect(countersAt(scenario, scenario.durationSec)).toEqual(countersAt(sorted, sorted.durationSec));
    const accepted = new Set(scenario.events.filter((e) => e.type === "connection_accepted").map((e) => [e.a, e.b].sort().join()));
    expect(countersAt(scenario, scenario.durationSec).connections).toBe(accepted.size);
  });

  test("derive.js matches derive.ts", async () => {
    const scenario = await load("steady");
    const root: { CompaSim?: Record<string, (...args: unknown[]) => unknown> } = {};
    new Function("window", await Bun.file(`${dir}derive.js`).text())(root);
    const sim = root.CompaSim ?? {};
    for (const t of [0, 1800, scenario.durationSec]) {
      expect(sim.leaderboardAt?.(scenario, t)).toEqual(leaderboardAt(scenario, t));
      expect(sim.topicsAt?.(scenario, t)).toEqual(topicsAt(scenario, t));
      expect(sim.countersAt?.(scenario, t)).toEqual(countersAt(scenario, t));
      expect(sim.feedAt?.(scenario, t, 6)).toEqual(feedAt(scenario, t, 6));
    }
  });

  test("empty scenarios derive empty state; after-event is frozen", async () => {
    const zero = await load("zero-activity");
    expect(leaderboardAt(zero, 600)).toEqual([]);
    expect(topicsAt(zero, 600)).toEqual([]);
    const after = await load("after-event");
    expect(countersAt(after, 0).eventState).toBe("ended");
    expect(leaderboardAt(after, 0)).toEqual(leaderboardAt(after, after.durationSec));
  });
});
