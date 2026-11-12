import { describe, expect, mock, test } from "bun:test";
import { LIVE_BOARD_ROWS, LIVE_LOOK_ROWS } from "../live/live-model";
import { RACE_SIZE } from "../live/race";
import { DEFAULT_LOOK } from "../monito/look";
import type { Ranked } from "./scores";

mock.module("server-only", () => ({}));
const { toLivePerson } = await import("./live");

const ranked: Ranked = { userId: "u1", handle: "ana", name: "Ana", photoUrl: "https://example.com/ana.jpg", avatar: DEFAULT_LOOK, avatarMode: "monito", points: 50, connections: 1 };

describe("toLivePerson", () => {
  test("the rows the board draws carry their monito and which picture they chose", () => {
    expect(toLivePerson(ranked, LIVE_LOOK_ROWS - 1)).toMatchObject({ id: "u1", photoUrl: ranked.photoUrl, avatar: DEFAULT_LOOK, avatarMode: "monito" });
  });

  test("rows further down travel without it, so the snapshot stays flat with thousands in the room", () => {
    const person = toLivePerson(ranked, LIVE_LOOK_ROWS);
    expect(person).not.toHaveProperty("avatar");
    expect(person).not.toHaveProperty("avatarMode");
    expect(person).toMatchObject({ id: "u1", name: "Ana", points: 50, connections: 1 });
  });

  test("every row the board can draw is covered: the race, and the list under the closing podium", () => {
    expect(LIVE_LOOK_ROWS).toBeGreaterThanOrEqual(RACE_SIZE);
    expect(LIVE_LOOK_ROWS).toBeGreaterThanOrEqual(3 + LIVE_BOARD_ROWS);
  });
});
