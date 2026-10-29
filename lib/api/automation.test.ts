import { describe, expect, test } from "bun:test";
import { automationAllowed, MIN_SECRET_LENGTH } from "./automation";

const SECRET = "k".repeat(MIN_SECRET_LENGTH);

describe("automationAllowed", () => {
  test("correct value opens", () => expect(automationAllowed(SECRET, SECRET)).toBe(true));
  test("missing header stays closed", () => {
    expect(automationAllowed(null, SECRET)).toBe(false);
    expect(automationAllowed("", SECRET)).toBe(false);
  });
  test("wrong values stay closed, whatever their length", () => {
    for (const wrong of ["k", `${SECRET}k`, SECRET.slice(1), SECRET.toUpperCase()]) expect(automationAllowed(wrong, SECRET)).toBe(false);
  });
  test("disabled when the variable is unset or too short", () => {
    expect(automationAllowed(SECRET, undefined)).toBe(false);
    expect(automationAllowed("short", "short")).toBe(false);
  });
});
