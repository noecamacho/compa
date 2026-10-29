import { describe, expect, test } from "bun:test";
import { eventListState, eventsApiQuery } from "./events-query";

describe("eventListState", () => {
  test("defaults for an empty URL", () => {
    const state = eventListState({});
    expect(state).toMatchObject({ test: "include", sort: "startsAt", effectiveDir: "desc", page: 1, pageSize: 25, filtered: false });
    expect(eventsApiQuery(state)).toBe("test=include&sort=startsAt&page=1&pageSize=25");
  });

  test("invalid keys fall back instead of throwing (edge case 1)", () => {
    const state = eventListState({ page: "abc", test: "foo", sort: "bogus", pageSize: "7", phase: "nope", q: "x".repeat(81) });
    expect(state).toMatchObject({ page: 1, test: "include", sort: "startsAt", pageSize: 25, filtered: false });
    expect(state.phase).toBeUndefined();
    expect(state.q).toBeUndefined();
  });

  test("legacy archived=1 maps to the archived phase (edge case 44)", () => {
    expect(eventListState({ archived: "1" }).phase).toBe("archived");
    expect(eventListState({ archived: "1", phase: "running" }).phase).toBe("running");
  });

  test("the phone order select wins over sort and dir", () => {
    const state = eventListState({ sort: "status", dir: "desc", order: "name:desc" });
    expect(state).toMatchObject({ sort: "name", dir: "desc", effectiveDir: "desc" });
    expect(eventListState({ sort: "name", order: "bogus:up" })).toMatchObject({ sort: "name", effectiveDir: "asc" });
  });

  test("filters count as filtered; sort and page size do not", () => {
    expect(eventListState({ q: " zzz " })).toMatchObject({ q: "zzz", filtered: true });
    expect(eventListState({ test: "only" }).filtered).toBe(true);
    expect(eventListState({ sort: "name", pageSize: "50" }).filtered).toBe(false);
  });
});
