import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Supabase pooler in transaction mode (port 6543) does not support prepared statements.
export function createDatabase(url: string, max = 5) {
  const sqlClient = postgres(url, { prepare: false, max });
  return Object.assign(drizzle(sqlClient, { schema }), { close: () => sqlClient.end() });
}

export type Database = ReturnType<typeof createDatabase>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Transaction;
