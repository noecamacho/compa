// Per-user limits on scans and the AI routes (backlog T-036, open question #51). Change a number here to adjust it.
export type RateWindow = "minute" | "day";

export type RateLimitRule = { name: string; limit: number; per: RateWindow };

export const LIMITS = {
  scanPerMinute: { name: "scan-minute", limit: 30, per: "minute" },
  transcribePerMinute: { name: "transcribe-minute", limit: 10, per: "minute" },
  transcribePerDay: { name: "transcribe-day", limit: 60, per: "day" },
  draftPerMinute: { name: "draft-minute", limit: 10, per: "minute" },
} as const satisfies Record<string, RateLimitRule>;

// Caps with no time window, checked against stored rows so only successful requests count (429 limit_reached).
export const CAPS = {
  // New requests one person sends at one event.
  requestsPerEvent: 300,
  // Drafts one author writes for one connection.
  draftsPerConnection: 5,
} as const;

const WINDOW_SECONDS: Record<RateWindow, number> = { minute: 60, day: 86_400 };

export type WindowSlot = { start: Date; retryAfterSeconds: number };

// Fixed windows aligned to the epoch: a burst across a window edge can reach twice the limit, which is fine here.
export function windowSlot(per: RateWindow, now: Date): WindowSlot {
  const size = WINDOW_SECONDS[per] * 1000;
  const start = Math.floor(now.getTime() / size) * size;
  return { start: new Date(start), retryAfterSeconds: Math.max(1, Math.ceil((start + size - now.getTime()) / 1000)) };
}

export const counterKey = (userId: string, rule: RateLimitRule, scope?: string): string =>
  [userId, rule.name, scope].filter(Boolean).join(":");
