import { describe, expect, mock, test } from "bun:test";
import { DEFAULT_LOOK } from "../monito/look";
import type { Ranked } from "./scores";

mock.module("server-only", () => ({}));
const { onBoard, sharedRanking, toRanked } = await import("./scores");

const board = (points: number): Ranked[] => [{ userId: "u1", handle: "ana", name: "Ana", photoUrl: null, avatarMode: "photo", points, connections: 1 }];

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
    await expect(sharedRanking("k2", load, 1_000)).rejects.toThrow("db down");
    expect((await sharedRanking("k2", load, 1_001))[0]?.points).toBe(2);
  });
});

describe("onBoard", () => {
  test("drops people with 0 points and keeps the order", () => {
    const [ana] = board(5);
    const nobody = { ...board(0)[0]!, userId: "u2" };
    expect(onBoard([ana!, nobody])).toEqual([ana!]);
  });
});

describe("toRanked", () => {
  const row = { ...board(5)[0]!, avatarMode: "monito" as const, goldenCapAt: null, showAccessories: true };

  test("carries the person's monito and which picture they chose", () => {
    expect(toRanked({ ...row, avatar: DEFAULT_LOOK })).toEqual({ ...board(5)[0]!, avatar: DEFAULT_LOOK, avatarMode: "monito" });
  });

  test("leaves out a monito never built and accessories never earned; wears the golden cap", () => {
    expect(toRanked({ ...row, avatar: null })).toEqual({ ...board(5)[0]!, avatarMode: "monito" });
    expect(toRanked({ ...row, avatar: null, goldenCapAt: new Date(0) }).accessories).toEqual(["golden_cap"]);
  });
});
