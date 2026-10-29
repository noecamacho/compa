ALTER TABLE "invites" ALTER COLUMN "code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invites" ADD COLUMN "inviter_points" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_accessories" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Links from before referral codes paid the inviter +100 at the friend's first connection.
UPDATE "invites" SET "inviter_points" = 100 WHERE "first_connection_at" IS NOT NULL;
--> statement-breakpoint
-- Inviters who already had three friends claim through their links get the cap their progress now shows.
UPDATE "users" SET "golden_cap_at" = now() WHERE "golden_cap_at" IS NULL AND "id" IN (
	SELECT "inviter_id" FROM "invites" WHERE "invitee_id" IS NOT NULL GROUP BY "inviter_id" HAVING count(*) >= 3
);--> statement-breakpoint
-- The golden cap used to be written into the stored monito; it is now worn at render time, so take the baked copy off
-- (only the golden one: the builder's own cap is a different colour) to let its owner hide it.
UPDATE "users" SET "avatar" = "avatar" || '{"hat":"none","hatColor":"#FF6B4A","hatAccent":"#FFFFFF"}'::jsonb
WHERE "golden_cap_at" IS NOT NULL AND "avatar"->>'hat' = 'cap' AND "avatar"->>'hatColor' = '#FFD93D';
