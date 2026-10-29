import { expect, test } from "bun:test";
import { handleBase, pickHandle } from "./handle";
import { mergeLinks, normalizeLink } from "./links";

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
