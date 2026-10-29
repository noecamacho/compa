// Seeds `interests` from lib/topics.ts (API spec §2). With SEED_DEMO=1 it also creates the demo event
// `founders-fest`, owned by an existing user, because `users` rows need a Supabase `auth.users` row
// that only a LinkedIn sign-in creates. SEED_ADMIN_HANDLE=<handle> promotes that user to admin first.
import { eq, sql } from "drizzle-orm";
import { TOPICS } from "../lib/topics";
import { slugify } from "../lib/slug";
import { createDatabase, type Database } from "./connect";
import { events, interests, users } from "./schema";

const DEMO_EVENT = { slug: "founders-fest", name: "Founders Fest Madrid 2026" };
const HOUR_MS = 60 * 60 * 1000;

async function seedInterests(db: Database): Promise<void> {
  const rows = TOPICS.map((name) => ({ slug: slugify(name), name }));
  await db
    .insert(interests)
    .values(rows)
    .onConflictDoUpdate({ target: interests.slug, set: { name: sql`excluded.name` } });
  console.log(`interests: ${rows.length} upserted`);
}

async function promoteAdmin(db: Database, handle: string | undefined): Promise<void> {
  if (!handle) return;
  const updated = await db.update(users).set({ isAdmin: true }).where(eq(users.handle, handle)).returning();
  console.log(updated.length ? `admin: ${handle} promoted` : `admin: no user with handle ${handle}`);
}

async function findDemoOwner(db: Database) {
  const [admin] = await db.select().from(users).where(eq(users.isAdmin, true)).limit(1);
  if (admin) return admin;
  const [anyone] = await db.select().from(users).orderBy(users.createdAt).limit(1);
  return anyone;
}

async function seedDemoEvent(db: Database): Promise<void> {
  const owner = await findDemoOwner(db);
  if (!owner) {
    console.log("demo: skipped, no users yet. Sign in once with LinkedIn, then run `SEED_DEMO=1 bun run db:seed`.");
    return;
  }
  const now = Date.now();
  const window = { startsAt: new Date(now - HOUR_MS), endsAt: new Date(now + 12 * HOUR_MS) };
  const [row] = await db
    .insert(events)
    .values({ ...DEMO_EVENT, ...window, createdBy: owner.id })
    .onConflictDoUpdate({ target: events.slug, set: window })
    .returning({ accessCode: events.accessCode });
  // The door path is what the event QR encodes (M19); it is printed for the operator, never committed.
  console.log(`demo: event ${DEMO_EVENT.slug} runs until ${window.endsAt.toISOString()} (owner ${owner.handle}), door /e/${row?.accessCode}`);
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = createDatabase(url, 1);
  try {
    await seedInterests(db);
    await promoteAdmin(db, process.env.SEED_ADMIN_HANDLE);
    if (process.env.SEED_DEMO === "1") await seedDemoEvent(db);
  } finally {
    await db.close();
  }
}

await main();
