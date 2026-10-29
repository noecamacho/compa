import { describe, expect, test } from "bun:test";
import { DEFAULT_LOOK } from "./monito/look";
import { pendingOnboarding } from "./onboarding";

const done = { headline: "Product Designer", company: "Compa", avatar: DEFAULT_LOOK };

describe("pendingOnboarding", () => {
  test("a fresh LinkedIn sign-in starts at the profile", () => {
    expect(pendingOnboarding({})).toBe("/onboarding/profile");
  });

  test("blank job title or company still needs the profile", () => {
    expect(pendingOnboarding({ ...done, headline: "  " })).toBe("/onboarding/profile");
    expect(pendingOnboarding({ ...done, company: undefined })).toBe("/onboarding/profile");
  });

  test("a complete profile without a look needs the monito", () => {
    expect(pendingOnboarding({ ...done, avatar: undefined })).toBe("/onboarding/monito");
  });

  test("nothing pending once both are done", () => {
    expect(pendingOnboarding(done)).toBeNull();
  });
});
