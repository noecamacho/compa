import { describe, expect, test } from "bun:test";
import { settleInChunks } from "./settle";

describe("settleInChunks", () => {
  test("keeps going past failures and reports each item", async () => {
    const result = await settleInChunks([1, 2, 3, 4, 5], async (n) => {
      if (n % 2 === 0) throw new Error(`no ${n}`);
    });
    expect(result.ok).toEqual([1, 3, 5]);
    expect(result.failed.map((entry) => entry.item)).toEqual([2, 4]);
  });

  test("never runs more than `size` at once", async () => {
    let running = 0;
    let peak = 0;
    await settleInChunks([1, 2, 3, 4, 5, 6, 7], async () => {
      running += 1;
      peak = Math.max(peak, running);
      await Promise.resolve();
      running -= 1;
    });
    expect(peak).toBe(3);
  });

  test("an empty list does nothing", async () => {
    expect(await settleInChunks([], async () => undefined)).toEqual({ ok: [], failed: [] });
  });
});
