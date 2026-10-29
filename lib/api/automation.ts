// Automation access for the real-mode test harness (API spec A11): `x-compa-automation: <TEST_AUTOMATION_SECRET>`.
// Off when the variable is unset or too short. The header value is never logged or echoed.
import { createHash, timingSafeEqual } from "node:crypto";

export const AUTOMATION_HEADER = "x-compa-automation";
export const MIN_SECRET_LENGTH = 32;

const digest = (value: string): Buffer => createHash("sha256").update(value, "utf8").digest();

// Comparing fixed-length digests keeps the check constant-time whatever the presented length.
export function automationAllowed(presented: string | null | undefined, secret: string | undefined = process.env.TEST_AUTOMATION_SECRET): boolean {
  if (!secret || secret.length < MIN_SECRET_LENGTH || !presented) return false;
  return timingSafeEqual(digest(presented), digest(secret));
}

export const automationFrom = (req: Request): boolean => automationAllowed(req.headers.get(AUTOMATION_HEADER));
