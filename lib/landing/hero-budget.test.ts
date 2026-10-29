import { describe, expect, test } from "bun:test";
import { FrameBudget, isWeakDevice } from "./hero-budget";

function run(budget: FrameBudget, frameMs: number, count: number): string[] {
  return Array.from({ length: count }, () => budget.push(frameMs));
}

describe("isWeakDevice", () => {
  test("flags few cores, little memory and data saver", () => {
    expect(isWeakDevice({ cores: 2 })).toBe(true);
    expect(isWeakDevice({ memoryGb: 2 })).toBe(true);
    expect(isWeakDevice({ saveData: true })).toBe(true);
  });
  test("treats unknown hints as capable", () => {
    expect(isWeakDevice({})).toBe(false);
    expect(isWeakDevice({ cores: 6, memoryGb: 4 })).toBe(false);
  });
});

describe("FrameBudget", () => {
  test("stays ok at 60 fps", () => {
    expect(run(new FrameBudget(), 16.7, 200)).not.toContain("slow");
  });
  test("reports slow at 20 fps once the window fills", () => {
    const verdicts = run(new FrameBudget(), 50, 200);
    expect(verdicts.indexOf("slow")).toBe(79);
  });
  test("ignores warm-up spikes and tab-switch gaps", () => {
    const budget = new FrameBudget();
    run(budget, 120, 20);
    budget.push(5000);
    expect(run(budget, 16.7, 200)).not.toContain("slow");
  });
  test("a few spikes do not trip the median", () => {
    const budget = new FrameBudget();
    run(budget, 16.7, 20);
    const mixed = Array.from({ length: 120 }, (_, i) => budget.push(i % 6 === 0 ? 80 : 16.7));
    expect(mixed).not.toContain("slow");
  });
  test("reset starts a fresh warm-up", () => {
    const budget = new FrameBudget();
    run(budget, 50, 200);
    budget.reset();
    expect(run(budget, 50, 79)).not.toContain("slow");
  });
});
