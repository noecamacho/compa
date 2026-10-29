ALTER TABLE "invites" ALTER COLUMN "code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invites" ADD COLUMN "inviter_points" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_accessories" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Links from before referral codes paid the inviter +100 at the friend's first connection.
UPDATE "invites" SET "inviter_points" = 100 WHERE "first_connection_at" IS NOT NULL;
