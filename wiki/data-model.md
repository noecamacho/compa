# Data model

Four Postgres tables on Supabase are enough for the MVP; `/live` is fed by Supabase Realtime on `connections`, `interactions` and `points` (p. 9). The migration is `supabase/migrations/0001_init.sql`, a contract file only person A edits (p. 14, p. 17).

## Tables (p. 9–10)

### `attendees`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, primary key | `gen_random_uuid()` |
| `handle` | text, unique, not null | e.g. `ana` |
| `code` | text, not null | e.g. `7K2`, session recovery |
| `name` | text, not null | |
| `photo_url`, `company`, `role` | text | |
| `tribe` | text | comment: Frontend / Backend / AI / Design / Other (source values in Spanish) |
| `topics` | text[] default `{}` | from the fixed vocabulary |
| `seeking`, `offering` | text | |
| `links` | jsonb default `{}` | `{linkedin, github, x, instagram, facebook, tiktok, web}` |
| `is_seed` | boolean default false | seed data |
| `created_at` | timestamptz default now() | |

### `connections`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, primary key | |
| `a_id`, `b_id` | uuid → `attendees(id)` | `check (a_id <> b_id)` |
| `method` | text | `check (method in ('qr','tag'))` |
| `shared_topics` | text[] default `{}` | |
| `created_at` | timestamptz default now() | |

Unique index `connections_pair_uq` on `(least(a_id,b_id), greatest(a_id,b_id))`: A→B and B→A are the same connection (p. 9–10).

### `interactions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, primary key | |
| `connection_id` | uuid → `connections(id)` | |
| `author_id` | uuid → `attendees(id)` | |
| `recorded`, `consent_ok` | boolean default false | |
| `transcript`, `summary` | text | |
| `topics`, `next_steps` | text[] default `{}` | |
| `substantive` | boolean default false | |
| `approved_at` | timestamptz | |

### `points`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigserial, primary key | |
| `attendee_id` | uuid → `attendees(id)` | |
| `reason` | text | `connection` / `bridge` / `summary` / `first_of_day` |
| `amount` | int | |
| `round` | int default 1 | |
| `ref_id` | uuid | the connection or interaction that generated it (idempotency) |
| `created_at` | timestamptz default now() | |

Constraint: `unique (attendee_id, reason, ref_id)` (p. 10).

## As built: connections outside an event (migration `0014`, 2026-10-29)

The shipped table is `connections (event_id, requester_id, addressee_id, status, kind, points, topics, …)` in `db/schema.ts`, not the plan's `a_id`/`b_id` shape above. Owner decision, 2026-10-29: a person may scan someone who is not at any event.

| Rule | Enforced by |
| --- | --- |
| `event_id` is nullable; null means "outside an event" | `connections.event_id` (no `not null`) |
| One connection per pair per event | `connections_pair_per_event_uq` on `(event_id, least, greatest)` (nulls are distinct, so it ignores event-less rows) |
| One event-less connection per pair, A→B and B→A alike | partial unique `connections_pair_eventless_uq` on `(least, greatest) where event_id is null` |
| Event-less accepted rows keep a `kind` but always `points = 0`; event rows keep 50/20 | check `connections_points_follow_kind_check` |
| Erasing a person removes their connections, with or without an event | `connections_requester_id_users_id_fk`, `connections_addressee_id_users_id_fk` (`on delete cascade`); the composite attendee keys skip null `event_id` (MATCH SIMPLE) |
| Event-less rows never reach a score | `event_scores` skips `c.event_id is null` for connections and their notes; `lifetime_scores` sums `event_scores` |

Existing rows keep their event; the migration is additive (it relaxes `not null` and one check, adds two foreign keys and an index, and replaces the view in place). Rules for points and kind: [points-rules](points-rules.md#connections-outside-an-event).

## Gaps

No column backs the leaderboard opt-out ("Anonymous") or the `/join` consent checkbox (p. 13), and `tribe` has no check constraint. See [open-questions](open-questions.md).

Related: [points-rules](points-rules.md), [api](api.md), [topics-vocabulary](topics-vocabulary.md).
