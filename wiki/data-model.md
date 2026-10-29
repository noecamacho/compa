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

## Gaps

No column backs the leaderboard opt-out ("Anonymous") or the `/join` consent checkbox (p. 13), and `tribe` has no check constraint. See [open-questions](open-questions.md).

Related: [points-rules](points-rules.md), [api](api.md), [topics-vocabulary](topics-vocabulary.md).
