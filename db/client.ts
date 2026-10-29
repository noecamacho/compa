import "server-only";
import { createDatabase, type Database } from "./connect";

export type { Database, Executor, Transaction } from "./connect";

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

let database: Database | undefined;

// Lazy so that mock mode and `next build` never need DATABASE_URL.
export function getDb(): Database {
  database ??= createDatabase(requireDatabaseUrl());
  return database;
}
