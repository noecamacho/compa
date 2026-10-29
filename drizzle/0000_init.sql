CREATE TYPE "public"."connection_kind" AS ENUM('new', 'reconnection');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('pending', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."visibility_level" AS ENUM('public', 'connections', 'hidden');--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" "connection_status" DEFAULT 'pending' NOT NULL,
	"requester_knew" boolean,
	"addressee_knew" boolean,
	"kind" "connection_kind",
	"points" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "connections_not_self_check" CHECK ("connections"."requester_id" <> "connections"."addressee_id"),
	CONSTRAINT "connections_accepted_has_kind_check" CHECK (("connections"."status" = 'accepted') = ("connections"."kind" is not null and "connections"."points" is not null)),
	CONSTRAINT "connections_points_follow_kind_check" CHECK ("connections"."kind" is null or ("connections"."kind" = 'new' and "connections"."points" = 20) or ("connections"."kind" = 'reconnection' and "connections"."points" = 10))
);
--> statement-breakpoint
ALTER TABLE "connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "event_attendees" (
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"screen_consent_at" timestamp with time zone NOT NULL,
	CONSTRAINT "event_attendees_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "event_attendees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "events_window_check" CHECK ("events"."ends_at" > "events"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"next_steps" text[] DEFAULT '{}' NOT NULL,
	"substantive" boolean NOT NULL,
	"fallback" boolean DEFAULT false NOT NULL,
	"points" smallint,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interactions_summary_length_check" CHECK (char_length("interactions"."summary") <= 1200),
	CONSTRAINT "interactions_approved_has_points_check" CHECK (("interactions"."approved_at" is null) = ("interactions"."points" is null))
);
--> statement-breakpoint
ALTER TABLE "interactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "interests" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "interests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "interests_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "interests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_interests" (
	"user_id" uuid NOT NULL,
	"interest_id" smallint NOT NULL,
	CONSTRAINT "user_interests_user_id_interest_id_pk" PRIMARY KEY("user_id","interest_id")
);
--> statement-breakpoint
ALTER TABLE "user_interests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"linkedin_sub" text NOT NULL,
	"handle" text NOT NULL,
	"email" text,
	"name" text NOT NULL,
	"photo_url" text,
	"name_edited" boolean DEFAULT false NOT NULL,
	"photo_edited" boolean DEFAULT false NOT NULL,
	"headline" text,
	"company" text,
	"links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"visibility" jsonb DEFAULT '{"headline":"public","company":"public","interests":"public","links":{"linkedin":"connections","github":"connections","x":"connections","instagram":"connections","web":"connections"}}'::jsonb NOT NULL,
	"linkedin_raw" jsonb,
	"linkedin_synced_at" timestamp with time zone,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "users_linkedin_sub_unique" UNIQUE("linkedin_sub"),
	CONSTRAINT "users_handle_unique" UNIQUE("handle"),
	CONSTRAINT "users_handle_check" CHECK ("users"."handle" ~ '^[a-z0-9-]{2,32}$'),
	CONSTRAINT "users_headline_check" CHECK (char_length("users"."headline") <= 120),
	CONSTRAINT "users_company_check" CHECK (char_length("users"."company") <= 80)
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_requester_attendee_fk" FOREIGN KEY ("event_id","requester_id") REFERENCES "public"."event_attendees"("event_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_addressee_attendee_fk" FOREIGN KEY ("event_id","addressee_id") REFERENCES "public"."event_attendees"("event_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_interest_id_interests_id_fk" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_auth_user_id_users_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "connections_pair_per_event_uq" ON "connections" USING btree ("event_id",least("requester_id", "addressee_id"),greatest("requester_id", "addressee_id"));--> statement-breakpoint
CREATE INDEX "connections_requester_idx" ON "connections" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "connections_addressee_idx" ON "connections" USING btree ("addressee_id");--> statement-breakpoint
CREATE INDEX "connections_event_status_idx" ON "connections" USING btree ("event_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "interactions_one_approved_uq" ON "interactions" USING btree ("connection_id") WHERE approved_at is not null;--> statement-breakpoint
CREATE VIEW "public"."event_scores" WITH (security_invoker = true) AS (
  with awards as (
    select c.event_id, p.user_id, c.points, 1 as is_connection
    from connections c cross join lateral (values (c.requester_id), (c.addressee_id)) as p (user_id)
    where c.status = 'accepted'
    union all
    select c.event_id, p.user_id, i.points, 0
    from interactions i join connections c on c.id = i.connection_id
    cross join lateral (values (c.requester_id), (c.addressee_id)) as p (user_id)
    where i.approved_at is not null
  )
  select event_id, user_id, sum(points)::int as points, sum(is_connection)::int as connections
  from awards group by event_id, user_id);--> statement-breakpoint
CREATE VIEW "public"."lifetime_scores" WITH (security_invoker = true) AS (
  select user_id, sum(points)::int as points, sum(connections)::int as connections
  from event_scores
  group by user_id);