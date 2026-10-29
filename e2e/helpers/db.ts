// Direct access to the e2e database (scripts/e2e/db.sh) for the Playwright suite: test people, a running event
// per test ("world"), and reads of points, badges and connections. Every world cleans up after itself, so tests
// run in parallel without resetting the whole database.
import postgres from "postgres";
import { generateAccessCode } from "../../lib/access-code";
import { slugify } from "../../lib/slug";
import type { Links, VisibilitySettings } from "../../lib/profile-fields";
import { DEFAULT_VISIBILITY } from "../../lib/profile-fields";

export const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://compa:compa@127.0.0.1:3901/compa_e2e";

let client: ReturnType<typeof postgres> | null = null;

export function sql() {
  client ??= postgres(DATABASE_URL, { max: 4, prepare: false, onnotice: () => undefined });
  return client;
}

export async function closeDb(): Promise<void> {
  await client?.end({ timeout: 2 });
  client = null;
}

const HOUR_MS = 60 * 60 * 1000;
const token = () => Math.random().toString(36).slice(2, 8);

export type TestEvent = { id: string; slug: string; name: string; accessCode: string; startsAt: Date; endsAt: Date };

export type PersonSpec = {
  name: string;
  headline?: string;
  company?: string;
  city?: string;
  email?: string;
  links?: Links;
  visibility?: Partial<VisibilitySettings>;
  // Check in to the world's event (default true).
  checkIn?: boolean;
};

export type TestUser = {
  id: string;
  authUserId: string;
  handle: string;
  name: string;
  headline: string | null;
  company: string | null;
  city: string | null;
  email: string | null;
};

type EventWindow = { startsAt?: Date; endsAt?: Date; name?: string };

async function insertEvent(ownerId: string, window: EventWindow = {}): Promise<TestEvent> {
  const now = Date.now();
  const startsAt = window.startsAt ?? new Date(now - HOUR_MS);
  const endsAt = window.endsAt ?? new Date(now + 12 * HOUR_MS);
  const slug = `e2e-${token()}`;
  const name = window.name ?? `Founders Fest E2E ${slug.slice(-4)}`;
  // The access code is a Drizzle-side default (db/schema.ts), so raw inserts generate it themselves.
  const [row] = await sql()<{ id: string; access_code: string }[]>`
    insert into events (slug, name, starts_at, ends_at, created_by, access_code)
    values (${slug}, ${name}, ${startsAt}, ${endsAt}, ${ownerId}, ${generateAccessCode()})
    returning id, access_code`;
  if (!row) throw new Error("event insert failed");
  return { id: row.id, slug, name, accessCode: row.access_code, startsAt, endsAt };
}

export async function insertUser(spec: PersonSpec): Promise<TestUser> {
  const authUserId = crypto.randomUUID();
  const handle = `${slugify(spec.name).slice(0, 20)}-${token()}`;
  const visibility = { ...DEFAULT_VISIBILITY, ...spec.visibility, links: { ...DEFAULT_VISIBILITY.links, ...spec.visibility?.links } };
  await sql()`insert into auth.users (id) values (${authUserId})`;
  const [row] = await sql()<{ id: string }[]>`
    insert into users (auth_user_id, linkedin_sub, handle, name, email, headline, company, city, avatar_mode, links, visibility)
    values (${authUserId}, ${`test:${authUserId}`}, ${handle}, ${spec.name}, ${spec.email ?? null}, ${spec.headline ?? null},
            ${spec.company ?? null}, ${spec.city ?? null}, 'monito', ${sql().json(spec.links ?? {})}, ${sql().json(visibility)})
    returning id`;
  if (!row) throw new Error("user insert failed");
  return {
    id: row.id,
    authUserId,
    handle,
    name: spec.name,
    headline: spec.headline ?? null,
    company: spec.company ?? null,
    city: spec.city ?? null,
    email: spec.email ?? null,
  };
}

export async function checkIn(user: TestUser, event: TestEvent, at: Date = new Date()): Promise<void> {
  await sql()`insert into event_attendees (event_id, user_id, checked_in_at, screen_consent_at)
    values (${event.id}, ${user.id}, ${at}, ${at}) on conflict do nothing`;
}

// One running event plus its organizer; people are added with `addPerson`. `dispose` removes everything it made.
export class World {
  readonly people: TestUser[] = [];
  private constructor(
    readonly event: TestEvent,
    readonly organizer: TestUser,
  ) {}

  static async create(window: EventWindow = {}): Promise<World> {
    const organizer = await insertUser({ name: `Organizador ${token()}` });
    const event = await insertEvent(organizer.id, window);
    return new World(event, organizer);
  }

  async addPerson(spec: PersonSpec): Promise<TestUser> {
    const user = await insertUser(spec);
    if (spec.checkIn !== false) await checkIn(user, this.event);
    this.people.push(user);
    return user;
  }

  async addEvent(window: EventWindow): Promise<TestEvent> {
    return insertEvent(this.organizer.id, window);
  }

  async dispose(): Promise<void> {
    const ids = [this.organizer, ...this.people].map((person) => person.authUserId);
    await sql()`delete from events where created_by = ${this.organizer.id}`;
    await sql()`delete from auth.users where id in ${sql()(ids)}`;
  }
}

// ---- Reads ----

export async function eventPoints(user: TestUser, event: TestEvent): Promise<number> {
  const [row] = await sql()<{ points: number }[]>`select points from event_scores where event_id = ${event.id} and user_id = ${user.id}`;
  return row?.points ?? 0;
}

export async function lifetimePoints(user: TestUser): Promise<number> {
  const [row] = await sql()<{ points: number }[]>`select points from lifetime_scores where user_id = ${user.id}`;
  return row?.points ?? 0;
}

export async function badgesOf(user: TestUser): Promise<string[]> {
  const rows = await sql()<{ badge_id: string }[]>`select badge_id from user_badges where user_id = ${user.id} order by earned_at desc`;
  return rows.map((row) => row.badge_id);
}

export type ConnectionRow = { id: string; status: string; kind: string | null; points: number | null; requesterId: string; addresseeId: string; topics: string[] };

export async function connectionsBetween(a: TestUser, b: TestUser): Promise<ConnectionRow[]> {
  const rows = await sql()<{ id: string; status: string; kind: string | null; points: number | null; requester_id: string; addressee_id: string; topics: string[] }[]>`
    select id, status, kind, points, requester_id, addressee_id, topics from connections
    where (requester_id = ${a.id} and addressee_id = ${b.id}) or (requester_id = ${b.id} and addressee_id = ${a.id})
    order by created_at`;
  return rows.map((row) => ({ id: row.id, status: row.status, kind: row.kind, points: row.points, requesterId: row.requester_id, addresseeId: row.addressee_id, topics: row.topics }));
}

export async function userRow(user: TestUser): Promise<Record<string, unknown>> {
  const [row] = await sql()`select * from users where id = ${user.id}`;
  if (!row) throw new Error("user not found");
  return row;
}

// ---- Writes used to set up scenarios ----

// An accepted connection at the world's event, or at `event` (a past one, for lifetime scores and friends).
export async function acceptedConnection(world: World, requester: TestUser, addressee: TestUser, kind: "new" | "reconnection" = "new", topics: string[] = [], at: Date = new Date(), event: TestEvent = world.event): Promise<string> {
  const points = kind === "new" ? 50 : 20;
  await sql()`insert into event_attendees (event_id, user_id, checked_in_at, screen_consent_at) values (${event.id}, ${requester.id}, ${at}, ${at}), (${event.id}, ${addressee.id}, ${at}, ${at}) on conflict do nothing`;
  const [row] = await sql()<{ id: string }[]>`
    insert into connections (event_id, requester_id, addressee_id, status, kind, points, topics, created_at, responded_at)
    values (${event.id}, ${requester.id}, ${addressee.id}, 'accepted', ${kind}, ${points}, ${sql().array(topics)}, ${at}, ${at})
    returning id`;
  if (!row) throw new Error("connection insert failed");
  return row.id;
}

export async function pendingRequest(world: World, requester: TestUser, addressee: TestUser, topics: string[] = [], knew = false): Promise<string> {
  const [row] = await sql()<{ id: string }[]>`
    insert into connections (event_id, requester_id, addressee_id, status, requester_knew, topics)
    values (${world.event.id}, ${requester.id}, ${addressee.id}, 'pending', ${knew}, ${sql().array(topics)})
    returning id`;
  if (!row) throw new Error("request insert failed");
  return row.id;
}

export async function approvedNote(connectionId: string, author: TestUser, summary: string, title: string, topics: string[] = [], pendingAction: string | null = null): Promise<string> {
  const [row] = await sql()<{ id: string }[]>`
    insert into interactions (connection_id, author_id, summary, title, pending_action, topics, next_steps, substantive, points, approved_at)
    values (${connectionId}, ${author.id}, ${summary}, ${title}, ${pendingAction}, ${sql().array(topics)}, ${sql().array(pendingAction ? [pendingAction] : [])}, true, 15, now())
    returning id`;
  if (!row) throw new Error("interaction insert failed");
  return row.id;
}

export async function grantBadge(user: TestUser, badgeId: string): Promise<void> {
  await sql()`insert into user_badges (user_id, badge_id) values (${user.id}, ${badgeId}) on conflict do nothing`;
}

export async function createInvite(inviter: TestUser, code: string): Promise<void> {
  await sql()`insert into invites (inviter_id, code) values (${inviter.id}, ${code})`;
}

export async function inviteRow(code: string): Promise<{ inviteeId: string | null; firstConnectionAt: Date | null } | null> {
  const [row] = await sql()<{ invitee_id: string | null; first_connection_at: Date | null }[]>`select invitee_id, first_connection_at from invites where code = ${code}`;
  return row ? { inviteeId: row.invitee_id, firstConnectionAt: row.first_connection_at } : null;
}

// Answers a pending request the way the API does, without the API: status, kind and points.
export async function acceptRequest(connectionId: string, kind: "new" | "reconnection" = "new"): Promise<void> {
  const points = kind === "new" ? 50 : 20;
  await sql()`update connections set status = 'accepted', kind = ${kind}, points = ${points}, responded_at = now() where id = ${connectionId}`;
}
