import { describe, expect, test } from "bun:test";
import { DEFAULT_LOOK, MonitoLook, builderFromLook, lookFromBuilder, randomBuilder } from "./look";

describe("body", () => {
  test("round-trips through the builder", () => {
    const look = lookFromBuilder({ ...builderFromLook(DEFAULT_LOOK), body: "woman" });
    expect(look.body).toBe("woman");
    expect(builderFromLook(look).body).toBe("woman");
  });

  test("a look saved before the option parses and reads as other", () => {
    expect(MonitoLook.safeParse(DEFAULT_LOOK).success).toBe(true);
    expect(builderFromLook(DEFAULT_LOOK).body).toBe("other");
  });

  test("rejects an unknown body", () => {
    expect(MonitoLook.safeParse({ ...DEFAULT_LOOK, body: "robot" }).success).toBe(false);
  });

  test("the dice keeps the chosen body", () => {
    expect(randomBuilder("man", () => 0.5).body).toBe("man");
  });
});
