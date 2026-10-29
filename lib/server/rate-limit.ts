import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { rateLimitCounters } from "../../db/schema";
import { ApiError, E, fail } from "../api/errors";
import { counterKey, windowSlot, type RateLimitRule } from "../api/rate-limits";

export type ScopedRule = { rule: RateLimitRule; scope?: string };

type Hit = { key: string; windowStart: Date; limit: number; retryAfterSeconds: number };

const toHit = (userId: string, now: Date) => ({ rule, scope }: ScopedRule): Hit => {
  const slot = windowSlot(rule.per, now);
  return { key: counterKey(userId, rule, scope), windowStart: slot.start, limit: rule.limit, retryAfterSeconds: slot.retryAfterSeconds };
};

const rateLimited = (retryAfterSeconds: number): ApiError =>
  new ApiError(E.rateLimited.status, E.rateLimited.code, E.rateLimited.message, undefined, { "Retry-After": `${retryAfterSeconds}` });

// Counts the request against every rule in one upsert and throws 429 when any count passes its limit.
// Keyed by user id, never IP: a whole venue shares one NAT. Rejected requests still count.
// shortcut: expired counter rows are never deleted, add a cleanup cron if the table grows large.
export async function enforceRateLimits(userId: string, rules: readonly ScopedRule[], now = new Date()): Promise<void> {
  if (rules.length === 0) return;
  const hits = rules.map(toHit(userId, now));
  const rows = await getDb()
    .insert(rateLimitCounters)
    .values(hits.map(({ key, windowStart }) => ({ key, windowStart, count: 1 })))
    .onConflictDoUpdate({
      target: [rateLimitCounters.key, rateLimitCounters.windowStart],
      set: { count: sql`${rateLimitCounters.count} + 1` },
    })
    .returning({ key: rateLimitCounters.key, count: rateLimitCounters.count });
  const counts = new Map(rows.map((row) => [row.key, row.count]));
  const over = hits.filter((hit) => (counts.get(hit.key) ?? 0) > hit.limit);
  // The longest wait wins: a user over the daily cap must not be told to retry in a few seconds.
  if (over.length > 0) throw rateLimited(Math.max(...over.map((hit) => hit.retryAfterSeconds)));
}

export const requireUnderCap = (used: number, cap: number): void => {
  if (used >= cap) fail(E.limitReached);
};
