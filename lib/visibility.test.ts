import { describe, expect, test } from "bun:test";
import { DEFAULT_VISIBILITY } from "./profile-fields";
import { canSee, relationOf, toCard, withDefaultVisibility, type CardSource } from "./visibility";

const owner: CardSource = {
  id: "owner",
  handle: "lucia-fernandez",
  name: "Lucía Fernández",
  photoUrl: "https://example.com/lucia.jpg",
  avatar: null,
  headline: "CTO en Tramita",
  company: "Tramita",
  city: "Guadalajara",
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
      avatarMode: "photo",
      headline: "CTO en Tramita",
      city: "Guadalajara",
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

describe("avatar mode and old rows", () => {
  test("the photo is the default, the monito when chosen or when there is no photo", () => {
    expect(toCard(owner, "public").avatarMode).toBe("photo");
    expect(toCard({ ...owner, avatarMode: "monito" }, "public").avatarMode).toBe("monito");
    expect(toCard({ ...owner, photoUrl: null, avatarMode: "photo" }, "public").avatarMode).toBe("monito");
  });

  test("visibility stored before whatsapp existed still applies the default", () => {
    const oldLinks = Object.fromEntries(Object.entries(DEFAULT_VISIBILITY.links).filter(([key]) => key !== "whatsapp"));
    const old = { ...owner, links: { whatsapp: "https://wa.me/1" }, visibility: { ...DEFAULT_VISIBILITY, links: oldLinks } as never };
    expect(toCard(old, "connected").links).toEqual({ whatsapp: "https://wa.me/1" });
    expect(withDefaultVisibility(old.visibility).links.whatsapp).toBe("connections");
  });
});

test("relationOf", () => {
  expect(relationOf("owner", "owner", false)).toBe("self");
  expect(relationOf("viewer", "owner", true)).toBe("connected");
  expect(relationOf(null, "owner", false)).toBe("public");
});

describe("toCard accessories", () => {
  const capped = { ...owner, goldenCapAt: new Date("2026-10-29T18:00:00Z") };
  test("an earned golden cap travels on every card, for every viewer", () => {
    expect(toCard(capped, "public").accessories).toEqual(["golden_cap"]);
    expect(toCard({ ...capped, showAccessories: true }, "self").accessories).toEqual(["golden_cap"]);
  });
  test("hidden or not earned: no accessories at all", () => {
    expect(toCard({ ...capped, showAccessories: false }, "public")).not.toHaveProperty("accessories");
    expect(toCard(owner, "public")).not.toHaveProperty("accessories");
  });
});
