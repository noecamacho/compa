CREATE TYPE "public"."bonus_reason" AS ENUM('topics', 'invite_inviter', 'invite_invitee');--> statement-breakpoint
CREATE TABLE "bonus_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"reason" "bonus_reason" NOT NULL,
	"ref_id" uuid NOT NULL,
	"points" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bonus_points" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_id" uuid NOT NULL,
	"code" text NOT NULL,
	"invitee_id" uuid,
	"first_connection_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invites_code_unique" UNIQUE("code"),
	CONSTRAINT "invites_invitee_id_unique" UNIQUE("invitee_id"),
	CONSTRAINT "invites_code_check" CHECK ("invites"."code" ~ '^[a-z0-9-]{2,40}$')
);
--> statement-breakpoint
ALTER TABLE "invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" uuid NOT NULL,
	"badge_id" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ref_id" uuid,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
ALTER TABLE "user_badges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- lifetime_scores depends on event_scores, so both views are rebuilt.
DROP VIEW "public"."lifetime_scores";--> statement-breakpoint
DROP VIEW "public"."event_scores";--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "topics" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "pending_action" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "golden_cap_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bonus_points" ADD CONSTRAINT "bonus_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_points" ADD CONSTRAINT "bonus_points_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invitee_id_users_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bonus_points_once_uq" ON "bonus_points" USING btree ("user_id","reason","ref_id");--> statement-breakpoint
CREATE INDEX "bonus_points_user_idx" ON "bonus_points" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invites_inviter_idx" ON "invites" USING btree ("inviter_id");--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_title_length_check" CHECK (char_length("interactions"."title") <= 120);--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_pending_action_length_check" CHECK (char_length("interactions"."pending_action") <= 200);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_city_check" CHECK (char_length("users"."city") <= 80);--> statement-breakpoint
CREATE VIEW "public"."event_scores" WITH (security_invoker = true) AS (
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
  from awards group by event_id, user_id);
--> statement-breakpoint
CREATE VIEW "public"."lifetime_scores" WITH (security_invoker = true) AS (
  select user_id, sum(points)::int as points, sum(connections)::int as connections
  from event_scores
  group by user_id);
