import { headers } from "next/headers";
import { demoCast } from "@/lib/demo/cast";
import { isDemoMode } from "@/lib/demo/respond";
import { nextScanTarget, readVisitor } from "@/lib/demo/visitor";

// D4: the handle a simulated scan "reads". undefined outside demo mode (the real camera runs), null once the visitor met everyone.
export async function demoScanTarget(): Promise<string | null | undefined> {
  if (!isDemoMode()) return undefined;
  return nextScanTarget(readVisitor((await headers()).get("cookie")), demoCast())?.handle ?? null;
}
