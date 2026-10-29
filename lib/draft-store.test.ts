import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { z } from "zod";
import { forgetDraft, recallDraft, rememberDraft } from "./draft-store";

const Schema = z.object({ skin: z.string() });

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  } as Storage;
}

const g = globalThis as { sessionStorage?: Storage };

describe("draft-store", () => {
  beforeEach(() => {
    g.sessionStorage = memoryStorage();
  });
  afterEach(() => {
    delete g.sessionStorage;
  });

  test("recalls what was remembered, per person", () => {
    rememberDraft("monito", "a", { skin: "#fff" });
    expect(recallDraft("monito", "a", Schema)).toEqual({ skin: "#fff" });
    expect(recallDraft("monito", "b", Schema)).toBeNull();
  });

  test("forget clears it", () => {
    rememberDraft("monito", "a", { skin: "#fff" });
    forgetDraft("monito", "a");
    expect(recallDraft("monito", "a", Schema)).toBeNull();
  });

  test("ignores a draft that fails the schema or is not JSON", () => {
    g.sessionStorage?.setItem("compa:draft:monito:a", JSON.stringify({ skin: 1 }));
    expect(recallDraft("monito", "a", Schema)).toBeNull();
    g.sessionStorage?.setItem("compa:draft:monito:a", "{nope");
    expect(recallDraft("monito", "a", Schema)).toBeNull();
  });

  test("works without storage", () => {
    delete g.sessionStorage;
    expect(() => rememberDraft("monito", "a", { skin: "#fff" })).not.toThrow();
    expect(recallDraft("monito", "a", Schema)).toBeNull();
    expect(() => forgetDraft("monito", "a")).not.toThrow();
  });
});
