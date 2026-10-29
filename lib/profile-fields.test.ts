import { describe, expect, test } from "bun:test";
import { DEFAULT_VISIBILITY, withDefaultVisibility } from "./profile-fields";
import { toCard, type CardSource } from "./visibility";

// A row stored before migration 0001 added the `whatsapp` link key.
const oldLinks = { linkedin: "connections", github: "public", x: "connections", instagram: "connections", web: "connections" } as const;
const oldVisibility = { ...DEFAULT_VISIBILITY, headline: "hidden" as const, links: oldLinks };

describe("withDefaultVisibility", () => {
  test("fills a missing link key and keeps stored choices", () => {
    const merged = withDefaultVisibility(oldVisibility);
    expect(merged.links.whatsapp).toBe("connections");
    expect(merged.links.github).toBe("public");
    expect(merged.headline).toBe("hidden");
  });

  test("returns the defaults for an empty stored object", () => {
    expect(withDefaultVisibility({})).toEqual(DEFAULT_VISIBILITY);
  });

  test("toCard applies the default to a link key the old row lacks", () => {
    const owner: CardSource = {
      id: "u1",
      handle: "old-user",
      name: "Old User",
      photoUrl: null,
      avatar: null,
      headline: null,
      company: null,
      city: null,
      links: { whatsapp: "+5215555555555" },
      // The DB type promises every key; the old row at runtime does not have them.
      visibility: oldVisibility as unknown as CardSource["visibility"],
      interests: [],
    };
    expect(toCard(owner, "connected").links).toEqual({ whatsapp: "+5215555555555" });
  });
});
