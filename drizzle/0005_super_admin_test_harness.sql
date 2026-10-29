-- M20: super admins, the real-mode test harness and editable event details. Additive only: every new column has a
-- default, so the code still serving during the deploy keeps working. `is_admin` stays and mirrors `role`.
-- The backfill at the end promotes the three captains (LinkedIn handles) and anyone already marked `is_admin`.
CREATE TABLE "event_organizers" (
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'organizer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_organizers_event_id_user_id_pk" PRIMARY KEY("event_id","user_id"),
	CONSTRAINT "event_organizers_role_check" CHECK ("event_organizers"."role" in ('owner', 'organizer', 'staff'))
);
--> statement-breakpoint
ALTER TABLE "event_organizers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "added_by" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "venue_name" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "website_url" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "timezone" text DEFAULT 'America/Mexico_City' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "schedule" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "status" text DEFAULT 'live' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "is_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_organizers_user_idx" ON "event_organizers" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_status_check" CHECK ("events"."status" in ('draft', 'live', 'ended', 'archived'));--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_description_check" CHECK (char_length("events"."description") <= 2000);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_venue_name_check" CHECK (char_length("events"."venue_name") <= 120);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_address_check" CHECK (char_length("events"."address") <= 200);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_city_check" CHECK (char_length("events"."city") <= 80);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_country_check" CHECK (char_length("events"."country") <= 80);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_website_url_check" CHECK (char_length("events"."website_url") <= 500);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" in ('user', 'super_admin'));--> statement-breakpoint
UPDATE "users" SET "role" = 'super_admin' WHERE "handle" IN ('noe-camacho', 'iker-pindter-velasco', 'sebastian-gandoulf-perez') OR "is_admin" = true;--> statement-breakpoint
UPDATE "users" SET "is_admin" = true WHERE "role" = 'super_admin';--> statement-breakpoint
UPDATE "events" SET "status" = 'ended' WHERE "ends_at" <= now();
