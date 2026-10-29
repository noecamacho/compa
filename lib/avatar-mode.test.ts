import { expect, test } from "bun:test";
import { effectiveAvatarMode } from "./avatar-mode";

test("the photo is the default when there is one", () => {
  expect(effectiveAvatarMode(undefined, "https://example.com/p.jpg")).toBe("photo");
  expect(effectiveAvatarMode("photo", "https://example.com/p.jpg")).toBe("photo");
});

test("the person can choose the monito over the photo", () => {
  expect(effectiveAvatarMode("monito", "https://example.com/p.jpg")).toBe("monito");
});

test("no photo means monito", () => {
  expect(effectiveAvatarMode("photo", null)).toBe("monito");
  expect(effectiveAvatarMode("photo", "")).toBe("monito");
  expect(effectiveAvatarMode(undefined, undefined)).toBe("monito");
});
