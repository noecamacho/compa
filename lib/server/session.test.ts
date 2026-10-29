import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));
const { signInPath } = await import("./session");

describe("signInPath (T-011)", () => {
  test("keeps the requested path and query through sign-in", () => {
    expect(signInPath("/connections")).toBe("/auth/linkedin?next=%2Fconnections");
    expect(signInPath("/connect/luis?from=qr")).toBe("/auth/linkedin?next=%2Fconnect%2Fluis%3Ffrom%3Dqr");
  });

  test("falls back to the welcome screen for unsafe or missing paths", () => {
    expect(signInPath("//evil.com")).toBe("/");
    expect(signInPath("https://evil.com")).toBe("/");
    expect(signInPath("/\\evil.com")).toBe("/");
    expect(signInPath(null)).toBe("/");
    expect(signInPath("/")).toBe("/");
  });
});
