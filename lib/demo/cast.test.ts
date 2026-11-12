import { describe, expect, test } from "bun:test";
import { TOPICS } from "../topics";
import { DEMO_PEOPLE_COUNT, DemoPerson, demoCast } from "./cast";

describe("demo cast", () => {
  test("150 complete, unique fictional identities and visible monito looks", () => {
    const cast = demoCast();
    expect(cast).toHaveLength(DEMO_PEOPLE_COUNT);
    for (const key of ["id", "handle", "name"] as const) expect(new Set(cast.map((person) => person[key])).size).toBe(cast.length);
    expect(new Set(cast.map((person) => JSON.stringify(person.avatar))).size).toBe(cast.length);
    for (const person of cast) expect(DemoPerson.safeParse(person).success).toBe(true);
    expect(cast.some((person) => person.name.includes("undefined"))).toBe(false);
  });

  test("varied roles, interests, cities, bodies and skin tones without real accounts", () => {
    const cast = demoCast();
    expect(new Set(cast.map((person) => person.headline)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(cast.map((person) => person.city)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(cast.map((person) => person.avatar.body)).size).toBe(3);
    expect(new Set(cast.map((person) => person.avatar.skin)).size).toBe(5);
    expect(cast.every((person) => person.photoUrl === null && Object.keys(person.links).length === 0)).toBe(true);
    expect(cast.every((person) => person.interests.length === 3 && person.interests.every((topic) => TOPICS.some((known) => known === topic)))).toBe(true);
    const names = cast.map((person) => person.name.split(" ")[0]);
    expect(Math.max(...names.map((name) => names.filter((other) => other === name).length))).toBeLessThanOrEqual(5);
  });

  test("reproducible fresh data, including nested avatar and interests", () => {
    const first = demoCast();
    expect(demoCast()).toEqual(first);
    const person = first[0];
    if (!person) throw new Error("Missing cast member");
    person.name = "Changed";
    person.avatar.shirt = "#000000";
    person.interests.push("Other");
    expect(demoCast()).not.toEqual(first);
    expect(demoCast()[0]?.interests).toHaveLength(3);
  });
});
