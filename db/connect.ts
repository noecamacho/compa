import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Per process (one per Vercel instance). Supavisor refuses clients past its cap (200 on Nano/Micro), so an idle
// instance gives its sockets back after 20 s and a full pooler fails in 5 s instead of 30 (conference-scale finding 4).
// The pool stays at 5, not 3: queries queued behind a busy connection can stall through Supavisor in transaction mode
// (reproduced locally; porsager/postgres#970), and a smaller pool queues more of them.
// prepare: false because the transaction pooler (port 6543) does not support prepared statements.
export const POOL_OPTIONS = { prepare: false, idle_timeout: 20, connect_timeout: 5, max_lifetime: 300 } as const;
export const POOL_MAX = 5;

// Port 5432 on the Supabase pooler is session mode: one server connection per client, so the pool (15 on Nano/Micro)
// runs out long before the client cap. The app must use transaction mode (6543); migrations may use 5432.
export function isSessionPoolerUrl(url: string): boolean {
  const { hostname, port } = new URL(url);
  return hostname.endsWith(".pooler.supabase.com") && (port === "" || port === "5432");
}

export function createDatabase(url: string, max = POOL_MAX) {
  if (isSessionPoolerUrl(url)) console.warn("DATABASE_URL uses the session pooler (5432); use transaction mode (6543) for the app");
  const sqlClient = postgres(url, { ...POOL_OPTIONS, max });
  return Object.assign(drizzle(sqlClient, { schema }), { close: () => sqlClient.end() });
}

export type Database = ReturnType<typeof createDatabase>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Transaction;
