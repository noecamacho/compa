-- M19: events get an unguessable access code for the event QR (/e/<code>). Existing rows are backfilled with
-- 12 hex characters from gen_random_uuid() (strong RNG, built in since Postgres 13, no pgcrypto needed); new rows
-- get a 10-character code from the app (lib/access-code.ts). Hand-edited from drizzle-kit's output so it also runs
-- on a table that already has rows (production has one event).
ALTER TABLE "events" ADD COLUMN "access_code" text;--> statement-breakpoint
UPDATE "events" SET "access_code" = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) WHERE "access_code" IS NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "access_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_access_code_unique" UNIQUE("access_code");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_access_code_check" CHECK ("events"."access_code" ~ '^[a-z0-9]{8,32}$');
