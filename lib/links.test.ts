import { expect, test } from "bun:test";
import { handleBase, pickHandle } from "./handle";
import { checkLink, displayLink, mergeLinks, normalizeLink } from "./links";

test("normalizeLink turns @user into a URL and keeps URLs", () => {
  expect(normalizeLink("github", "@luciafdz")).toBe("https://github.com/luciafdz");
  expect(normalizeLink("x", "https://x.com/lucia")).toBe("https://x.com/lucia");
  expect(normalizeLink("instagram", "  ")).toBeNull();
});

test("mergeLinks sets, keeps and removes", () => {
  const merged = mergeLinks({ linkedin: "https://www.linkedin.com/in/lucia", x: "https://x.com/old" }, { github: "lucia", x: "" });
  expect(merged).toEqual({ linkedin: "https://www.linkedin.com/in/lucia", github: "https://github.com/lucia" });
});

test("handles are slugs with a numeric suffix on collision", () => {
  expect(handleBase("Lucía Fernández")).toBe("lucia-fernandez");
  expect(handleBase("李")).toBe("compa");
  expect(pickHandle("lucia", new Set())).toBe("lucia");
  expect(pickHandle("lucia", new Set(["lucia", "lucia-2"]))).toBe("lucia-3");
  expect(handleBase("a".repeat(60)).length).toBeLessThanOrEqual(32);
});

test("checkLink accepts handles with one @ and rejects doubled ones", () => {
  expect(checkLink("instagram", "@ana.lopez")).toEqual({ ok: true, value: "ana.lopez" });
  expect(checkLink("x", "ana_lopez")).toEqual({ ok: true, value: "ana_lopez" });
  expect(checkLink("instagram", "@@ana")).toEqual({ ok: false, problem: "duplicate_at" });
  expect(checkLink("x", "ana lopez")).toEqual({ ok: false, problem: "bad_handle" });
  expect(checkLink("x", "")).toEqual({ ok: true, value: "" });
});

test("checkLink wants a country code for WhatsApp", () => {
  expect(checkLink("whatsapp", "+52 81 1234 5678")).toEqual({ ok: true, value: "+528112345678" });
  expect(checkLink("whatsapp", "8112345678")).toEqual({ ok: false, problem: "country_code" });
  expect(checkLink("whatsapp", "528112345678")).toEqual({ ok: true, value: "+528112345678" });
  expect(checkLink("whatsapp", "hola")).toEqual({ ok: false, problem: "bad_phone" });
});

test("checkLink takes a LinkedIn username or profile URL", () => {
  expect(checkLink("linkedin", "ana-lopez")).toEqual({ ok: true, value: "ana-lopez" });
  expect(checkLink("linkedin", "https://www.linkedin.com/in/ana-lopez/")).toEqual({ ok: true, value: "ana-lopez" });
  expect(checkLink("linkedin", "https://example.com/ana")).toEqual({ ok: false, problem: "bad_linkedin" });
});

test("displayLink shows the short form of a stored link", () => {
  expect(displayLink("linkedin", "https://www.linkedin.com/in/ana-lopez")).toBe("ana-lopez");
  expect(displayLink("instagram", "https://www.instagram.com/ana.lopez")).toBe("ana.lopez");
  expect(displayLink("whatsapp", "https://wa.me/528112345678")).toBe("+528112345678");
  expect(displayLink("x", undefined)).toBe("");
});
