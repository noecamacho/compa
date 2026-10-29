export type Settled<T> = { ok: T[]; failed: { item: T; error: unknown }[] };

// Runs `action` over every item, `size` at a time, and never stops at the first failure: a bulk admin action reports
// per item and keeps what succeeded (spec §6.6, edge case 23). Small chunks keep the API and the database calm.
export async function settleInChunks<T>(items: T[], action: (item: T) => Promise<unknown>, size = 3): Promise<Settled<T>> {
  const result: Settled<T> = { ok: [], failed: [] };
  for (let start = 0; start < items.length; start += size) {
    const chunk = items.slice(start, start + size);
    const outcomes = await Promise.allSettled(chunk.map(action));
    outcomes.forEach((outcome, index) => record(result, chunk[index] as T, outcome));
  }
  return result;
}

function record<T>(result: Settled<T>, item: T, outcome: PromiseSettledResult<unknown>) {
  if (outcome.status === "fulfilled") result.ok.push(item);
  else result.failed.push({ item, error: outcome.reason });
}
