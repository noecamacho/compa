import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 2000;
const NO_STORE = { "Cache-Control": "no-store" };

async function pingDatabase(): Promise<void> {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("database ping timed out")), DB_TIMEOUT_MS));
  await Promise.race([getDb().execute(sql`select 1`), timeout]);
}

// Liveness plus one `select 1`, for an uptime monitor or a glance on event day. Not in the OpenAPI contract: it is ops, not product.
export async function GET(): Promise<Response> {
  const started = Date.now();
  try {
    await pingDatabase();
  } catch {
    return Response.json({ status: "degraded", db: "down", ms: Date.now() - started }, { status: 503, headers: NO_STORE });
  }
  return Response.json({ status: "ok", db: "ok", ms: Date.now() - started }, { headers: NO_STORE });
}
