import { describe, expect, mock, test } from "bun:test";
import type { Ranked } from "./scores";

mock.module("server-only", () => ({}));
const { sharedRanking } = await import("./scores");

const board = (points: number): Ranked[] => [{ userId: "u1", name: "Ana", photoUrl: null, points, connections: 1 }];

describe("sharedRanking (conference-scale finding 2)", () => {
  test("callers within 3 s share one load; later callers reload", async () => {
    let loads = 0;
    const load = async () => board(++loads);
    const [a, b] = await Promise.all([sharedRanking("k1", load, 1_000), sharedRanking("k1", load, 3_999)]);
    expect(loads).toBe(1);
    expect(a).toBe(b);
    expect((await sharedRanking("k1", load, 4_000))[0]?.points).toBe(2);
  });

  test("a failed load is not shared", async () => {
    let loads = 0;
    const load = async () => {
      loads += 1;
      if (loads === 1) throw new Error("db down");
      return board(loads);
    };
    expect(sharedRanking("k2", load, 1_000)).rejects.toThrow("db down");
    await Bun.sleep(0);
    expect((await sharedRanking("k2", load, 1_001))[0]?.points).toBe(2);
  });
});
