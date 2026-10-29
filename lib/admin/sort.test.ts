import { describe, expect, test } from "bun:test";
import { sortDirection } from "./sort";

describe("sortDirection", () => {
  test("names sort A to Z by default", () => expect(sortDirection("name")).toBe("asc"));

  test("status sorts in phase order, running first", () => expect(sortDirection("status")).toBe("asc"));

  test("everything else sorts newest or largest first", () => {
    expect(sortDirection("startsAt")).toBe("desc");
    expect(sortDirection("points")).toBe("desc");
  });

  test("an explicit direction wins", () => {
    expect(sortDirection("name", "desc")).toBe("desc");
    expect(sortDirection("createdAt", "asc")).toBe("asc");
  });
});
