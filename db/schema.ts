// Data model spec: docs/specs/2026-10-29-data-model.md §3 (decisions M1–M19) and API spec §2 (`users.handle`).
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  pgView,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { generateAccessCode } from "../lib/access-code";
import type { MonitoLook } from "../lib/monito/look";
import { DEFAULT_VISIBILITY, VISIBILITY_LEVELS, type Links, type VisibilitySettings } from "../lib/profile-fields";
import { authUsers } from "./auth-schema";

export type { LinkKey, Links, Visibility, VisibilitySettings } from "../lib/profile-fields";

export const connectionStatus = pgEnum("connection_status", ["pending", "accepted", "declined", "expired"]);
export const connectionKind = pgEnum("connection_kind", ["new", "reconnection"]);
// Documents the values allowed inside users.visibility (spec §3).
export const visibilityLevel = pgEnum("visibility_level", VISIBILITY_LEVELS);
// Points that are not a connection or a note: topics marked while registering, and invites (V2 design table).
export const bonusReason = pgEnum("bonus_reason", ["topics", "invite_inviter", "invite_invitee"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id")
      .notNull()
      .unique()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    linkedinSub: text("linkedin_sub").notNull().unique(),
    handle: text("handle").notNull().unique(),
    email: text("email"),
    name: text("name").notNull(),
    photoUrl: text("photo_url"),
    nameEdited: boolean("name_edited").notNull().default(false),
    photoEdited: boolean("photo_edited").notNull().default(false),
    headline: text("headline"),
    company: text("company"),
    city: text("city"),
    // The pixel-art monito (lib/monito/look.ts); null until the person builds one.
    avatar: jsonb("avatar").$type<MonitoLook>(),
    goldenCapAt: timestamp("golden_cap_at", { withTimezone: true }),
    links: jsonb("links").$type<Links>().notNull().default({}),
    visibility: jsonb("visibility").$type<VisibilitySettings>().notNull().default(DEFAULT_VISIBILITY),
    linkedinRaw: jsonb("linkedin_raw"),
    linkedinSyncedAt: timestamp("linkedin_synced_at", { withTimezone: true }),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    check("users_handle_check", sql`${t.handle} ~ '^[a-z0-9-]{2,32}$'`),
    check("users_headline_check", sql`char_length(${t.headline}) <= 120`),
    check("users_company_check", sql`char_length(${t.company}) <= 80`),
    check("users_city_check", sql`char_length(${t.city}) <= 80`),
  ],
).enableRLS();

export const interests = pgTable("interests", {
  id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
}).enableRLS();

export const userInterests = pgTable(
  "user_interests",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    interestId: smallint("interest_id")
      .notNull()
      .references(() => interests.id),
  },
  (t) => [primaryKey({ columns: [t.userId, t.interestId] })],
).enableRLS();

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    // The event QR encodes /e/<access_code>; the slug stays for admins only (M19).
    accessCode: text("access_code").notNull().unique().$defaultFn(generateAccessCode),
    name: text("name").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    check("events_window_check", sql`${t.endsAt} > ${t.startsAt}`),
    check("events_access_code_check", sql`${t.accessCode} ~ '^[a-z0-9]{8,32}$'`),
  ],
).enableRLS();

export const eventAttendees = pgTable(
  "event_attendees",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
    screenConsentAt: timestamp("screen_consent_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] })],
).enableRLS();

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull(),
    requesterId: uuid("requester_id").notNull(),
    addresseeId: uuid("addressee_id").notNull(),
    status: connectionStatus("status").notNull().default("pending"),
    requesterKnew: boolean("requester_knew"),
    addresseeKnew: boolean("addressee_knew"),
    kind: connectionKind("kind"),
    points: smallint("points"),
    // What they talked about, marked by the scanner (+5 once accepted).
    topics: text("topics").array().notNull().default(sql`'{}'`),
    createdAt: createdAt(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    check("connections_not_self_check", sql`${t.requesterId} <> ${t.addresseeId}`),
    foreignKey({
      name: "connections_requester_attendee_fk",
      columns: [t.eventId, t.requesterId],
      foreignColumns: [eventAttendees.eventId, eventAttendees.userId],
    }).onDelete("cascade"),
    foreignKey({
      name: "connections_addressee_attendee_fk",
      columns: [t.eventId, t.addresseeId],
      foreignColumns: [eventAttendees.eventId, eventAttendees.userId],
    }).onDelete("cascade"),
    check(
      "connections_accepted_has_kind_check",
      sql`(${t.status} = 'accepted') = (${t.kind} is not null and ${t.points} is not null)`,
    ),
    check(
      "connections_points_follow_kind_check",
      // V2 design points table: 50 new, 20 reconnection (lib/points.ts).
      sql`${t.kind} is null or (${t.kind} = 'new' and ${t.points} = 50) or (${t.kind} = 'reconnection' and ${t.points} = 20)`,
    ),
    uniqueIndex("connections_pair_per_event_uq").on(
      t.eventId,
      sql`least(${t.requesterId}, ${t.addresseeId})`,
      sql`greatest(${t.requesterId}, ${t.addresseeId})`,
    ),
    index("connections_requester_idx").on(t.requesterId),
    index("connections_addressee_idx").on(t.addresseeId),
    index("connections_event_status_idx").on(t.eventId, t.status),
  ],
).enableRLS();

export const interactions = pgTable(
  "interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    title: text("title"),
    pendingAction: text("pending_action"),
    topics: text("topics").array().notNull().default(sql`'{}'`),
    nextSteps: text("next_steps").array().notNull().default(sql`'{}'`),
    substantive: boolean("substantive").notNull(),
    fallback: boolean("fallback").notNull().default(false),
    points: smallint("points"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check("interactions_summary_length_check", sql`char_length(${t.summary}) <= 1200`),
    check("interactions_title_length_check", sql`char_length(${t.title}) <= 120`),
    check("interactions_pending_action_length_check", sql`char_length(${t.pendingAction}) <= 200`),
    check("interactions_approved_has_points_check", sql`(${t.approvedAt} is null) = (${t.points} is null)`),
    uniqueIndex("interactions_one_approved_uq").on(t.connectionId).where(sql`approved_at is not null`),
  ],
).enableRLS();

export const bonusPoints = pgTable(
  "bonus_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    reason: bonusReason("reason").notNull(),
    // The connection the bonus comes from; with reason it makes the award idempotent.
    refId: uuid("ref_id").notNull(),
    points: smallint("points").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("bonus_points_once_uq").on(t.userId, t.reason, t.refId), index("bonus_points_user_idx").on(t.userId)],
).enableRLS();

// The catalog lives in lib/badges/catalog.ts; only earned badges are stored.
export const userBadges = pgTable(
  "user_badges",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
    refId: uuid("ref_id"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
).enableRLS();

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    inviteeId: uuid("invitee_id")
      .unique()
      .references(() => users.id, { onDelete: "set null" }),
    firstConnectionAt: timestamp("first_connection_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [check("invites_code_check", sql`${t.code} ~ '^[a-z0-9-]{2,40}$'`), index("invites_inviter_idx").on(t.inviterId)],
).enableRLS();

// Scores are derived, never stored (M3, M18). Connections pay both people, notes pay their author,
// bonus_points pay whoever they name (V2 design points table). security_invoker keeps the tables' RLS in force, so the
// Supabase Data API cannot read scores through the views either (§4.7).
export const eventScores = pgView("event_scores", {
  eventId: uuid("event_id").notNull(),
  userId: uuid("user_id").notNull(),
  points: integer("points").notNull(),
  connections: integer("connections").notNull(),
})
  .with({ securityInvoker: true })
  .as(sql`
  with awards as (
    select c.event_id, p.user_id, c.points, 1 as is_connection
    from connections c cross join lateral (values (c.requester_id), (c.addressee_id)) as p (user_id)
    where c.status = 'accepted'
    union all
    select c.event_id, i.author_id as user_id, i.points, 0
    from interactions i join connections c on c.id = i.connection_id
    where i.approved_at is not null
    union all
    select b.event_id, b.user_id, b.points, 0
    from bonus_points b
  )
  select event_id, user_id, sum(points)::int as points, sum(is_connection)::int as connections
  from awards group by event_id, user_id`);

export const lifetimeScores = pgView("lifetime_scores", {
  userId: uuid("user_id").notNull(),
  points: integer("points").notNull(),
  connections: integer("connections").notNull(),
})
  .with({ securityInvoker: true })
  .as(sql`
  select user_id, sum(points)::int as points, sum(connections)::int as connections
  from event_scores
  group by user_id`);

export type UserRow = typeof users.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type ConnectionRow = typeof connections.$inferSelect;
export type InteractionRow = typeof interactions.$inferSelect;
export type InviteRow = typeof invites.$inferSelect;
