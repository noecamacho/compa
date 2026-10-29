// SEED_TEST_EVENT=1: the shared real-mode test event "Codex Conf 2026" (docs/testing/real-mode.md). Idempotent:
// it reuses the event and every test user by slug or handle, so running it twice changes nothing but the window.
// Everything it creates is flagged is_test, so no real event ever shows it (data model M20).
import { createClient } from "@supabase/supabase-js";
import { and, eq, inArray } from "drizzle-orm";
import { CONNECTION_POINTS, SUMMARY_POINTS } from "../lib/points";
import { slugify } from "../lib/slug";
import { generateProfile, seededRandom, testEmailFor, testSubFor, type GeneratedProfile } from "../lib/testing/profiles";
import type { Database } from "./connect";
import { connections, eventAttendees, eventOrganizers, events, interactions, interests, userInterests, users, type UserRow } from "./schema";

export const TEST_EVENT = { slug: "codex-conf-2026", name: "Codex Conf 2026" } as const;
export const TEST_ADMIN_HANDLE = "codex-test-admin";
const MOCK_USERS = 12;
const SEED = 2026;
const DAY_MS = 24 * 60 * 60 * 1000;

type AuthAdmin = ReturnType<typeof createClient>["auth"]["admin"];

function authAdmin(): AuthAdmin {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SEED_TEST_EVENT needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).auth.admin;
}

// The auth row for a test email: created, or found again through a (never sent) magic link when it already exists.
async function authUserId(admin: AuthAdmin, email: string): Promise<string> {
  const created = await admin.createUser({ email, email_confirm: true, app_metadata: { compa_test: true } });
  if (created.data.user) return created.data.user.id;
  const existing = await admin.generateLink({ type: "magiclink", email });
  if (existing.data.user) return existing.data.user.id;
  throw new Error(`test auth user for ${email}: ${created.error?.message ?? "not created"}`);
}

type Seeded = { profile: GeneratedProfile; role: UserRow["role"] };

async function upsertTestUser(db: Database, admin: AuthAdmin, { profile, role }: Seeded): Promise<UserRow> {
  const [existing] = await db.select().from(users).where(eq(users.handle, profile.handle)).limit(1);
  if (existing && !existing.isTest) throw new Error(`handle ${profile.handle} belongs to a real person; refusing to touch it`);
  if (existing) return existing;
  const email = testEmailFor(profile.handle);
  const authId = await authUserId(admin, email);
  const [row] = await db
    .insert(users)
    .values({
      authUserId: authId,
      linkedinSub: testSubFor(authId),
      handle: profile.handle,
      email,
      name: profile.name,
      nameEdited: true,
      photoEdited: true,
      headline: profile.headline,
      company: profile.company,
      city: profile.city,
      avatar: profile.avatar,
      avatarMode: "monito",
      links: profile.links,
      visibility: profile.visibility,
      role,
      isAdmin: role === "super_admin",
      isTest: true,
    })
    .returning();
  if (!row) throw new Error(`test user ${profile.handle} not inserted`);
  const wanted = profile.interests.map(slugify);
  const found = wanted.length ? await db.select({ id: interests.id }).from(interests).where(inArray(interests.slug, wanted)) : [];
  if (found.length) await db.insert(userInterests).values(found.map(({ id }) => ({ userId: row.id, interestId: id }))).onConflictDoNothing();
  return row;
}

function seededPeople(): Seeded[] {
  const random = seededRandom(SEED);
  const adminProfile = { ...generateProfile("engineer", random), name: "Codex Test Admin", handle: TEST_ADMIN_HANDLE, headline: "Test super admin" };
  const presets = ["founder", "engineer", "designer", "investor"] as const;
  const people = Array.from({ length: MOCK_USERS }, (_, index) => ({ profile: generateProfile(presets[index % presets.length] ?? "random", random), role: "user" as const }));
  return [{ profile: adminProfile, role: "super_admin" }, ...people];
}

// A long window around now, so the event is always running for tests.
async function upsertEvent(db: Database, owner: UserRow) {
  const now = Date.now();
  const window = { startsAt: new Date(now - DAY_MS), endsAt: new Date(now + 365 * DAY_MS), status: "live" as const };
  const details = { description: "The shared real-mode test event. Test people only.", venueName: "The test lab", city: "Guadalajara", country: "México", timezone: "America/Mexico_City" };
  const [row] = await db
    .insert(events)
    .values({ ...TEST_EVENT, ...details, ...window, isTest: true, createdBy: owner.id })
    .onConflictDoUpdate({ target: events.slug, set: { ...window, isTest: true } })
    .returning();
  if (!row) throw new Error("test event not upserted");
  if (!row.isTest) throw new Error(`${TEST_EVENT.slug} is not a test event`);
  return row;
}

type Pair = { a: number; b: number; accepted: boolean; kind?: "new" | "reconnection" };

// A few accepted and pending requests, so the live screen, leaderboard and inbox all have data.
const PAIRS: Pair[] = [
  { a: 1, b: 2, accepted: true, kind: "new" },
  { a: 3, b: 1, accepted: true, kind: "new" },
  { a: 4, b: 5, accepted: true, kind: "reconnection" },
  { a: 6, b: 2, accepted: true, kind: "new" },
  { a: 7, b: 1, accepted: false },
  { a: 8, b: 3, accepted: false },
];

async function seedConnections(db: Database, eventId: string, people: UserRow[]) {
  const now = new Date();
  for (const pair of PAIRS) {
    const requester = people[pair.a];
    const addressee = people[pair.b];
    if (!requester || !addressee) continue;
    const accepted = pair.accepted && pair.kind ? { status: "accepted" as const, kind: pair.kind, points: CONNECTION_POINTS[pair.kind], respondedAt: now } : {};
    await db.insert(connections).values({ eventId, requesterId: requester.id, addresseeId: addressee.id, topics: ["Agents"], ...accepted }).onConflictDoNothing();
  }
}

async function seedSummary(db: Database, eventId: string, author: UserRow, other: UserRow) {
  const [connection] = await db
    .select()
    .from(connections)
    .where(and(eq(connections.eventId, eventId), eq(connections.requesterId, author.id), eq(connections.addresseeId, other.id)))
    .limit(1);
  if (!connection || connection.status !== "accepted") return;
  await db
    .insert(interactions)
    .values({
      connectionId: connection.id,
      authorId: author.id,
      title: "Agentes para soporte",
      summary: `${author.name} y ${other.name} hablaron de usar agentes para el soporte de su producto y quedaron en compartir su prompt.`,
      topics: ["Agents"],
      nextSteps: ["Compartir el prompt"],
      substantive: true,
      points: SUMMARY_POINTS,
      approvedAt: new Date(),
    })
    .onConflictDoNothing();
}

export async function seedTestEvent(db: Database): Promise<void> {
  const admin = authAdmin();
  const people: UserRow[] = [];
  for (const seeded of seededPeople()) people.push(await upsertTestUser(db, admin, seeded));
  const [owner] = people;
  if (!owner) throw new Error("no test admin");
  const event = await upsertEvent(db, owner);
  const consent = { screenConsentAt: new Date(), addedBy: owner.id };
  await db.insert(eventAttendees).values(people.map((person) => ({ eventId: event.id, userId: person.id, ...consent }))).onConflictDoNothing();
  await db.insert(eventOrganizers).values({ eventId: event.id, userId: owner.id, role: "owner" }).onConflictDoNothing();
  await seedConnections(db, event.id, people);
  const [author, other] = [people[1], people[2]];
  if (author && other) await seedSummary(db, event.id, author, other);
  // The door path is what the event QR encodes (M19); printed for the operator, never committed.
  console.log(`test event: ${TEST_EVENT.name} (${TEST_EVENT.slug}) door /e/${event.accessCode}, ${people.length} test users, admin @${TEST_ADMIN_HANDLE}`);
}
