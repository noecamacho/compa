// Per-user limits on scans and the AI routes (backlog T-036, open question #51). Change a number here to adjust it.
// "ever" counts without a time window, for caps scoped to one event or one connection.
export type RateWindow = "minute" | "day" | "ever";

export type RateLimitRule = { name: string; limit: number; per: RateWindow };

export const LIMITS = {
  scanPerMinute: { name: "scan-minute", limit: 30, per: "minute" },
  scanPerEvent: { name: "scan-event", limit: 300, per: "ever" },
  transcribePerMinute: { name: "transcribe-minute", limit: 10, per: "minute" },
  transcribePerDay: { name: "transcribe-day", limit: 60, per: "day" },
  draftPerMinute: { name: "draft-minute", limit: 10, per: "minute" },
  draftPerConnection: { name: "draft-connection", limit: 5, per: "ever" },
} as const satisfies Record<string, RateLimitRule>;

const WINDOW_SECONDS: Record<Exclude<RateWindow, "ever">, number> = { minute: 60, day: 86_400 };

export type WindowSlot = { start: Date; retryAfterSeconds: number | null };

// Fixed windows aligned to the epoch; "ever" shares one slot at the epoch and has no retry time.
export function windowSlot(per: RateWindow, now: Date): WindowSlot {
  if (per === "ever") return { start: new Date(0), retryAfterSeconds: null };
  const size = WINDOW_SECONDS[per] * 1000;
  const start = Math.floor(now.getTime() / size) * size;
  return { start: new Date(start), retryAfterSeconds: Math.max(1, Math.ceil((start + size - now.getTime()) / 1000)) };
}

export const counterKey = (userId: string, rule: RateLimitRule, scope?: string): string =>
  [userId, rule.name, scope].filter(Boolean).join(":");
