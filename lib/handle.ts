// Personal QR handle: slug of the name, numeric suffix on collision (API spec A8, §2).
import { slugify } from "./slug";

const MAX_BASE = 28;

export function handleBase(name: string): string {
  const base = slugify(name).slice(0, MAX_BASE).replace(/-+$/, "");
  return base.length >= 2 ? base : "compa";
}

export function pickHandle(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
