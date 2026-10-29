import { describe, expect, test } from "bun:test";
import { MonitoLook } from "../monito/look";
import { slugify } from "../slug";
import { TOPICS } from "../topics";
import { generateProfile, seededRandom, TEST_PRESETS, testEmailFor, testSubFor } from "./profiles";

const topicSlugs = new Set(TOPICS.map(slugify));

describe("mock profile generator", () => {
  test("the same seed gives the same people", () => {
    const a = [1, 2, 3].map(() => generateProfile("random", seededRandom(7)));
    expect(a[0]).toEqual(a[1]);
    const run = seededRandom(7);
    expect(generateProfile("random", run)).not.toEqual(generateProfile("random", run));
  });

  test("every preset yields a full, valid profile", () => {
    const random = seededRandom(42);
    for (const preset of TEST_PRESETS) {
      for (let i = 0; i < 20; i += 1) {
        const profile = generateProfile(preset, random);
        expect(profile.handle).toMatch(/^[a-z0-9-]{2,32}$/);
        expect(profile.headline.length).toBeLessThanOrEqual(120);
        expect(profile.company.length).toBeLessThanOrEqual(80);
        expect(profile.interests.length).toBeGreaterThanOrEqual(2);
        for (const interest of profile.interests) expect(topicSlugs.has(slugify(interest))).toBe(true);
        expect(MonitoLook.safeParse(profile.avatar).success).toBe(true);
      }
    }
  });

  test("synthetic identity: test email domain and a non-LinkedIn sub", () => {
    expect(testEmailFor("ana-garza-k3p9")).toBe("ana-garza-k3p9@test.compa.lol");
    expect(testSubFor("8c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e02")).toBe("test:8c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e02");
  });
});
