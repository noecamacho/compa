import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { and, desc, eq, inArray, like } from "drizzle-orm";
import { getDb } from "../../db/client";
import { interests, userInterests, users, type EventRow, type UserRow } from "../../db/schema";
import type { TestProfileInputT, TestUserT } from "../api/admin-schemas";
import { ApiError, E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { DEFAULT_VISIBILITY } from "../profile-fields";
import { slugify } from "../slug";
import { generateProfile, seededRandom, testEmailFor, testSubFor, type GeneratedProfile, type TestPreset } from "../testing/profiles";
import { requireManagedEvent, toAdminUser } from "./admin-events";
import { ensureCheckedIn, findEventBySlug } from "./events";
import { findCurrentEvent, interestNamesFor, isUniqueViolation } from "./people";
import { createSupabaseServerClient } from "./supabase";

// ---- Supabase Admin API (service role, server only) ----

function serviceAuth(): SupabaseClient["auth"]["admin"] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(E.harnessUnavailable);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).auth.admin;
}

// ---- Refusing real people (the one rule the harness must never break) ----

// Only rows flagged `is_test` may be signed in as, listed or deleted here; a real person reads as unknown.
export function requireTestTarget(row: UserRow | undefined): UserRow {
  if (!row || !row.isTest) return fail(E.testUserNotFound);
  return row;
}

async function findUser(id: string): Promise<UserRow | undefined> {
  const [row] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

// ---- Building profiles ----

type Draft = GeneratedProfile & { photoUrl: string | null; role: UserRow["role"] };

function draftFrom(input: TestProfileInputT, preset: TestPreset, random: () => number): Draft {
  const generated = generateProfile(preset, random);
  const handle = input.handle ?? (input.name ? `${slugify(input.name).slice(0, 22)}-${generated.handle.slice(-4)}` : generated.handle);
  return {
    ...generated,
    name: input.name ?? generated.name,
    handle,
    headline: input.headline ?? generated.headline,
    company: input.company ?? generated.company,
    city: input.city ?? generated.city,
    interests: input.interests ?? generated.interests,
    links: { ...generated.links, ...input.links },
    visibility: {
      ...generated.visibility,
      ...input.visibility,
      links: { ...DEFAULT_VISIBILITY.links, ...generated.visibility.links, ...input.visibility?.links },
    },
    avatar: input.avatar ?? generated.avatar,
    avatarMode: "monito",
    photoUrl: input.photoUrl ?? null,
    role: input.role ?? "user",
  };
}

const withPhotoMode = (draft: Draft) => ({ avatarMode: draft.photoUrl ? ("photo" as const) : draft.avatarMode });

// Interests are referenced by slug or name; one unknown entry fails the whole request before anything is created.
async function interestIdsFor(drafts: Draft[]): Promise<Map<string, number>> {
  const wanted = [...new Set(drafts.flatMap((draft) => draft.interests.map((ref) => slugify(ref))))];
  if (wanted.length === 0) return new Map();
  const rows = await getDb().select().from(interests).where(inArray(interests.slug, wanted));
  const ids = new Map(rows.map((row) => [row.slug, row.id]));
  const unknown = wanted.filter((slug) => !ids.has(slug));
  if (unknown.length) throw new ApiError(400, E.invalidInput.code, "Unknown interest.", { interests: unknown });
  return ids;
}

// ---- Creating ----

async function insertProfile(authUserId: string, draft: Draft, interestIds: Map<string, number>): Promise<UserRow> {
  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(users)
      .values({
        authUserId,
        linkedinSub: testSubFor(authUserId),
        handle: draft.handle,
        email: testEmailFor(draft.handle),
        name: draft.name,
        photoUrl: draft.photoUrl,
        nameEdited: true,
        photoEdited: true,
        headline: draft.headline,
        company: draft.company,
        city: draft.city,
        avatar: draft.avatar,
        ...withPhotoMode(draft),
        links: draft.links,
        visibility: draft.visibility,
        role: draft.role,
        isAdmin: draft.role === "super_admin",
        isTest: true,
      })
      .returning();
    if (!row) throw new Error("test user insert returned nothing");
    const chosen = draft.interests.map((ref) => interestIds.get(slugify(ref))).filter((id): id is number => id !== undefined);
    if (chosen.length) await tx.insert(userInterests).values([...new Set(chosen)].map((interestId) => ({ userId: row.id, interestId })));
    return row;
  });
}

// The auth row comes first (users.auth_user_id references it); if the profile insert fails, the auth row goes too.
async function createOne(draft: Draft, interestIds: Map<string, number>): Promise<UserRow> {
  const admin = serviceAuth();
  const { data, error } = await admin.createUser({
    email: testEmailFor(draft.handle),
    email_confirm: true,
    user_metadata: { name: draft.name, compa_test: true },
    app_metadata: { compa_test: true },
  });
  if (error || !data.user) {
    if (error?.code === "email_exists") return fail(E.handleTaken);
    throw new Error(`test auth user not created: ${error?.message ?? "no user"}`);
  }
  try {
    return await insertProfile(data.user.id, draft, interestIds);
  } catch (insertError) {
    await admin.deleteUser(data.user.id);
    if (isUniqueViolation(insertError)) return fail(E.handleTaken);
    throw insertError;
  }
}

async function takenHandles(handles: string[]): Promise<Set<string>> {
  if (handles.length === 0) return new Set();
  const rows = await getDb().select({ handle: users.handle }).from(users).where(inArray(users.handle, handles));
  return new Set(rows.map((row) => row.handle));
}

async function requireTestEvent(admin: UserRow | null, slug: string | undefined): Promise<EventRow | undefined> {
  if (!slug) return undefined;
  const event = admin ? await requireManagedEvent(admin, slug) : await findEventBySlug(slug);
  if (!event) return fail(E.eventNotFound);
  return event.isTest ? event : fail(E.notTestEvent);
}

export async function toTestUsers(rows: UserRow[]): Promise<TestUserT[]> {
  const names = await interestNamesFor(rows.map((row) => row.id));
  const now = new Date();
  return Promise.all(
    rows.map(async (row) => {
      const current = await findCurrentEvent(row.id, now);
      return {
        ...toAdminUser(row),
        interests: names.get(row.id) ?? [],
        links: row.links,
        avatarMode: row.avatarMode,
        currentEvent: current ? { code: current.accessCode, name: current.name } : null,
      };
    }),
  );
}

type CreateBody = InputOf<typeof R.createTestUsers>["body"];

function draftsFor(body: CreateBody): Draft[] {
  const random = seededRandom(body.seed ?? Math.floor(Math.random() * 2 ** 31));
  const inputs = body.users ?? Array.from({ length: body.count ?? 1 }, (): TestProfileInputT => ({}));
  return inputs.map((input) => draftFrom(input, body.preset, random));
}

export async function createTestUsers({ user, body }: InputOf<typeof R.createTestUsers>): ResultOf<typeof R.createTestUsers> {
  const event = await requireTestEvent(user, body.checkInTo);
  const drafts = draftsFor(body);
  const taken = await takenHandles(drafts.map((draft) => draft.handle));
  if (taken.size) throw new ApiError(409, E.handleTaken.code, E.handleTaken.message, { handle: [...taken] });
  const interestIds = await interestIdsFor(drafts);
  const created: UserRow[] = [];
  for (const draft of drafts) created.push(await createOne(draft, interestIds));
  if (event) for (const row of created) await ensureCheckedIn(row, event, true, getDb(), user?.id ?? null);
  return { status: 201, body: { users: await toTestUsers(created) } };
}

export async function listTestUsers({ query }: InputOf<typeof R.listTestUsers>): ResultOf<typeof R.listTestUsers> {
  const handleFilter = query.handlePrefix ? like(users.handle, `${query.handlePrefix}%`) : undefined;
  const rows = await getDb()
    .select()
    .from(users)
    .where(and(eq(users.isTest, true), handleFilter))
    .orderBy(desc(users.createdAt))
    .limit(query.limit);
  return { body: { users: await toTestUsers(rows) } };
}

// Deleting the auth row cascades to `users`, then to check-ins, connections, summaries and points.
export async function deleteTestUser({ params }: InputOf<typeof R.deleteTestUser>): ResultOf<typeof R.deleteTestUser> {
  const target = requireTestTarget(await findUser(params.id));
  const { error } = await serviceAuth().deleteUser(target.authUserId);
  if (error) throw new Error(`test auth user not deleted: ${error.message}`);
  return { status: 204 };
}

// ---- Signing in as a test user ----

type Session = { expires_at?: number } | null;

// Magic-link token verified server side: no email is sent and no password exists at rest.
async function sessionByMagicLink(email: string): Promise<Session> {
  const { data, error } = await serviceAuth().generateLink({ type: "magiclink", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return null;
  const supabase = await createSupabaseServerClient();
  const verified = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  return verified.error ? null : verified.data.session;
}

// Fallback: a fresh random password, used once and never stored.
async function sessionByOneTimePassword(target: UserRow, email: string): Promise<Session> {
  const password = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const { error } = await serviceAuth().updateUserById(target.authUserId, { password });
  if (error) return null;
  const supabase = await createSupabaseServerClient();
  const signedIn = await supabase.auth.signInWithPassword({ email, password });
  return signedIn.error ? null : signedIn.data.session;
}

export async function createTestSession({ params }: InputOf<typeof R.createTestSession>): ResultOf<typeof R.createTestSession> {
  const target = requireTestTarget(await findUser(params.id));
  const email = target.email ?? testEmailFor(target.handle);
  const session = (await sessionByMagicLink(email)) ?? (await sessionByOneTimePassword(target, email));
  if (!session) return fail(E.sessionFailed);
  const expiresAt = session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null;
  return { body: { user: { id: target.id, handle: target.handle, name: target.name }, expiresAt } };
}
