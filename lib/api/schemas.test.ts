import { describe, expect, test } from "bun:test";
import { PatchMeBody } from "./schemas";

describe("PatchMeBody", () => {
  test("interest ids stay inside the smallint column", () => {
    expect(PatchMeBody.safeParse({ interestIds: [1, 32_767] }).success).toBe(true);
    expect(PatchMeBody.safeParse({ interestIds: [32_768] }).success).toBe(false);
  });
});
