ALTER TABLE "invites" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invites_inviter_event_idx" ON "invites" USING btree ("inviter_id","event_id");--> statement-breakpoint
-- Existing invites belong to the inviter's latest event; inviters who never checked in keep a null event and stay inert.
UPDATE "invites" SET "event_id" = (
	SELECT "event_attendees"."event_id" FROM "event_attendees"
	WHERE "event_attendees"."user_id" = "invites"."inviter_id"
	ORDER BY "event_attendees"."checked_in_at" DESC LIMIT 1
) WHERE "event_id" IS NULL;
