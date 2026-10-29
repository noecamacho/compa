import { describe, expect, test } from "bun:test";
import { afterResponse } from "./after-response";

describe("afterResponse", () => {
  test("outside a request it runs the task at once", async () => {
    let ran = false;
    afterResponse("test", async () => {
      ran = true;
    });
    await Promise.resolve();
    expect(ran).toBe(true);
  });

  test("a failing task is logged, not thrown", async () => {
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => void errors.push(args[0]);
    afterResponse("boom", async () => {
      throw new Error("down");
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    console.error = original;
    expect(errors).toEqual(["boom failed"]);
  });
});
