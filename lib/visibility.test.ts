import { describe, expect, test } from "bun:test";
import { DEFAULT_VISIBILITY } from "./profile-fields";
import { canSee, relationOf, toCard, type CardSource } from "./visibility";

const owner: CardSource = {
  id: "owner",
  handle: "lucia-fernandez",
  name: "Lucía Fernández",
  photoUrl: "https://example.com/lucia.jpg",
  headline: "CTO en Tramita",
  company: "Tramita",
  interests: ["Agents", "Startups"],
  links: { linkedin: "https://www.linkedin.com/in/lucia", github: "https://github.com/lucia", x: "https://x.com/lucia" },
  visibility: {
    ...DEFAULT_VISIBILITY,
    company: "connections",
    interests: "hidden",
    links: { ...DEFAULT_VISIBILITY.links, github: "public", x: "hidden" },
  },
};

describe("canSee", () => {
  test("public is visible to everyone", () => {
    expect(canSee("public", "public")).toBe(true);
  });
  test("connections needs an accepted connection", () => {
    expect(canSee("connections", "public")).toBe(false);
    expect(canSee("connections", "connected")).toBe(true);
  });
  test("hidden is visible only to the owner", () => {
    expect(canSee("hidden", "connected")).toBe(false);
    expect(canSee("hidden", "self")).toBe(true);
  });
});

describe("toCard", () => {
  test("a stranger or the big screen sees only public fields", () => {
    expect(toCard(owner, "public")).toEqual({
      id: "owner",
      handle: "lucia-fernandez",
      name: "Lucía Fernández",
      photoUrl: "https://example.com/lucia.jpg",
      headline: "CTO en Tramita",
      links: { github: "https://github.com/lucia" },
    });
  });

  test("a connection also sees connections-only fields, never hidden ones", () => {
    const card = toCard(owner, "connected");
    expect(card.company).toBe("Tramita");
    expect(card.links).toEqual({ linkedin: "https://www.linkedin.com/in/lucia", github: "https://github.com/lucia" });
    expect(card.interests).toBeUndefined();
  });

  test("the owner sees everything", () => {
    const card = toCard(owner, "self");
    expect(card.interests).toEqual(["Agents", "Startups"]);
    expect(card.links?.x).toBe("https://x.com/lucia");
  });

  test("never leaks private columns even if the row carries them", () => {
    const row = { ...owner, email: "lucia@tramita.es", authUserId: "a", linkedinSub: "s", linkedinRaw: {}, isAdmin: true };
    const keys = Object.keys(toCard(row, "self"));
    for (const secret of ["email", "authUserId", "linkedinSub", "linkedinRaw", "isAdmin", "visibility"]) expect(keys).not.toContain(secret);
  });

  test("omits empty fields and an empty link set", () => {
    const bare = { ...owner, headline: null, links: {} };
    const card = toCard(bare, "public");
    expect(card).not.toHaveProperty("headline");
    expect(card).not.toHaveProperty("links");
  });
});

test("relationOf", () => {
  expect(relationOf("owner", "owner", false)).toBe("self");
  expect(relationOf("viewer", "owner", true)).toBe("connected");
  expect(relationOf(null, "owner", false)).toBe("public");
});
