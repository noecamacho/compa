import { describe, expect, test } from "bun:test";
import { handleBase, pickHandle } from "./handle";
import { invalidLinks, linkInputValue, mergeLinks, parseLink } from "./links";

describe("parseLink", () => {
  test("turns handles into canonical URLs per network", () => {
    expect(parseLink("github", "@luciafdz")).toBe("https://github.com/luciafdz");
    expect(parseLink("x", "lucia_dev")).toBe("https://x.com/lucia_dev");
    expect(parseLink("instagram", "ana.lopez")).toBe("https://www.instagram.com/ana.lopez");
    expect(parseLink("linkedin", "lucía-fernández")).toBe("https://www.linkedin.com/in/luc%C3%ADa-fern%C3%A1ndez");
  });

  test("keeps URLs of the right network, with or without the scheme", () => {
    expect(parseLink("x", "https://x.com/lucia")).toBe("https://x.com/lucia");
    expect(parseLink("x", "twitter.com/lucia")).toBe("https://twitter.com/lucia");
    expect(parseLink("linkedin", "mx.linkedin.com/in/lucia")).toBe("https://mx.linkedin.com/in/lucia");
    expect(parseLink("web", "lucia.dev")).toBe("https://lucia.dev/");
    expect(parseLink("web", "http://lucia.dev/blog")).toBe("http://lucia.dev/blog");
  });

  test("rejects a URL of another network, bad handles and unsafe URLs", () => {
    expect(parseLink("instagram", "https://x.com/lucia")).toBeNull();
    expect(parseLink("x", "this handle is far too long")).toBeNull();
    expect(parseLink("github", "-bad")).toBeNull();
    expect(parseLink("web", "javascript:alert(1)")).toBeNull();
    expect(parseLink("web", "https://user:pass@lucia.dev")).toBeNull();
    expect(parseLink("web", "localhost")).toBeNull();
    expect(parseLink("instagram", "  ")).toBeNull();
  });

  test("WhatsApp takes an international phone number or a wa.me link", () => {
    expect(parseLink("whatsapp", "+52 33 1234 5678")).toBe("https://wa.me/523312345678");
    expect(parseLink("whatsapp", "(52) 33-1234-5678")).toBe("https://wa.me/523312345678");
    expect(parseLink("whatsapp", "https://wa.me/523312345678")).toBe("https://wa.me/523312345678");
    expect(parseLink("whatsapp", "https://api.whatsapp.com/send?phone=523312345678")).toBe("https://wa.me/523312345678");
    expect(parseLink("whatsapp", "1234567")).toBeNull();
    expect(parseLink("whatsapp", "+52 33 abc")).toBeNull();
    expect(parseLink("whatsapp", "1234567890123456")).toBeNull();
    expect(parseLink("whatsapp", "https://evil.com/523312345678")).toBeNull();
  });
});

test("invalidLinks lists only non-empty values that fail", () => {
  expect(invalidLinks({ x: "", github: "ok-name", whatsapp: "12", instagram: undefined })).toEqual(["whatsapp"]);
});

test("linkInputValue shows what the person typed and round-trips", () => {
  const cases = [
    ["whatsapp", "https://wa.me/523312345678", "+523312345678"],
    ["github", "https://github.com/lucia", "@lucia"],
    ["linkedin", "https://www.linkedin.com/in/luc%C3%ADa", "lucía"],
    ["web", "https://lucia.dev/", "lucia.dev"],
    ["x", "https://twitter.com/lucia", "https://twitter.com/lucia"],
  ] as const;
  for (const [key, url, shown] of cases) {
    expect(linkInputValue(key, url)).toBe(shown);
    expect(parseLink(key, shown)).toBe(url);
  }
  expect(linkInputValue("x", undefined)).toBe("");
  expect(linkInputValue("linkedin", "https://www.linkedin.com/in/100%")).toBe("https://www.linkedin.com/in/100%");
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
