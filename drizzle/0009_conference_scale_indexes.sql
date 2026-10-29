CREATE INDEX "bonus_points_event_idx" ON "bonus_points" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "connections_requester_status_idx" ON "connections" USING btree ("requester_id","status");--> statement-breakpoint
CREATE INDEX "connections_addressee_status_idx" ON "connections" USING btree ("addressee_id","status");--> statement-breakpoint
CREATE INDEX "event_attendees_user_checked_in_idx" ON "event_attendees" USING btree ("user_id","checked_in_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "interactions_connection_idx" ON "interactions" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "interactions_author_approved_idx" ON "interactions" USING btree ("author_id") WHERE approved_at is not null;--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");