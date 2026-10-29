-- Connections outside an event (event_id null): no points, one per pair, never on an event board.
-- Every existing row keeps its event; the composite attendee foreign keys skip rows whose event_id is null (MATCH SIMPLE),
-- so plain user foreign keys now cover erasure for every row.
ALTER TABLE "connections" DROP CONSTRAINT "connections_points_follow_kind_check";--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "event_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "connections_pair_eventless_uq" ON "connections" USING btree (least("requester_id", "addressee_id"),greatest("requester_id", "addressee_id")) WHERE event_id is null;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_points_follow_kind_check" CHECK ("connections"."kind" is null or ("connections"."event_id" is null and "connections"."points" = 0) or ("connections"."event_id" is not null and (("connections"."kind" = 'new' and "connections"."points" = 50) or ("connections"."kind" = 'reconnection' and "connections"."points" = 20))));--> statement-breakpoint
-- Replaced in place: lifetime_scores depends on it, so it cannot be dropped.
CREATE OR REPLACE VIEW "public"."event_scores" WITH (security_invoker = true) AS (
  with awards as (
    select c.event_id, p.user_id, c.points, 1 as is_connection
    from connections c cross join lateral (values (c.requester_id), (c.addressee_id)) as p (user_id)
    where c.status = 'accepted' and c.event_id is not null
    union all
    select c.event_id, i.author_id as user_id, i.points, 0
    from interactions i join connections c on c.id = i.connection_id
    where i.approved_at is not null and c.event_id is not null
    union all
    select b.event_id, b.user_id, b.points, 0
    from bonus_points b
  )
  select event_id, user_id, sum(points)::int as points, sum(is_connection)::int as connections
  from awards group by event_id, user_id);