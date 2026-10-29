// Decides when the landing hero's Three.js scene is too heavy for the device and the SVG crowd should take over.
// Pure functions so the thresholds are testable without WebGL; components/landing wires them to the real browser.

export type DeviceHints = { cores?: number; memoryGb?: number; saveData?: boolean };

const MIN_CORES = 4;
const MIN_MEMORY_GB = 3;

// Low-end phones and data-saver mode skip the scene entirely; unknown hints (Safari has no deviceMemory) count as capable.
export function isWeakDevice({ cores, memoryGb, saveData }: DeviceHints): boolean {
  if (saveData) return true;
  if (cores !== undefined && cores < MIN_CORES) return true;
  return memoryGb !== undefined && memoryGb < MIN_MEMORY_GB;
}

export type BudgetVerdict = "ok" | "slow";

const WARMUP_FRAMES = 20;
const WINDOW_FRAMES = 60;
// Median frame time above this is under ~28 fps.
const SLOW_FRAME_MS = 36;
// A longer gap is a tab switch or a scroll pause, not rendering cost.
const GAP_MS = 250;

// Median frame time over a sliding window, after a warm-up for texture uploads and shader compilation.
export class FrameBudget {
  private frames: number[] = [];
  private seen = 0;

  push(frameMs: number): BudgetVerdict {
    if (frameMs > GAP_MS) return "ok";
    this.seen += 1;
    if (this.seen <= WARMUP_FRAMES) return "ok";
    this.frames.push(frameMs);
    if (this.frames.length < WINDOW_FRAMES) return "ok";
    const sorted = [...this.frames].sort((a, b) => a - b);
    this.frames.shift();
    return (sorted[WINDOW_FRAMES >> 1] ?? 0) > SLOW_FRAME_MS ? "slow" : "ok";
  }

  reset(): void {
    this.frames = [];
    this.seen = 0;
  }
}
