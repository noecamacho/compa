# COMPA summaries spec

Ticket: `COMPA-<TBD>` · Date: 2026-10-29 · Status: decided by the team (summaries stay in the MVP) · Extends: `docs/specs/2026-10-29-data-model.md` (branch `docs/COMPA-TBD-mvp-api-plan`) and lifts its M17 for AI summaries only. Bridges, rounds and badges stay out.

## 1. Decisions

| # | Decision | Replaces |
| --- | --- | --- |
| S1 | AI summaries are in the MVP: record or type a note, transcribe, draft with AI, edit, approve. | Data model M17 for summaries |
| S2 | Summaries award **no points**. Points come only from connections (data model M3). | +25 per person (p. 7, p. 18) |
| S3 | A summary belongs to an **accepted** connection. Either of its two people may write one. | Any connection (p. 6) |
| S4 | **One approved summary per connection**; the first approval wins. Drafts are unlimited. | — (plan open question #10) |
| S5 | Only the author edits or approves. After approval both people see it. It never appears on the big screen. | — (p. 6, p. 13) |
| S6 | Audio is never stored; it lives in memory during transcription. The note text is stored as `note`. | Plan open question #11 |
| S7 | Summary and next steps are in Spanish. Topics are slugs from the global `interests` table (data model M15). | `lib/topics.ts` enum (p. 12, p. 17) |
| S8 | A draft marked `substantive = false` cannot be approved. | — (p. 6, p. 11) |

## 2. SQL

```sql
create table interactions (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections (id) on delete cascade,
  author_id     uuid not null references users (id) on delete cascade,
  note          text not null check (char_length(note) between 1 and 4000), -- typed or transcribed input
  summary       text not null check (char_length(summary) between 1 and 1200),
  topics        text[] not null default '{}',          -- interest slugs, at most 4
  next_steps    text[] not null default '{}',          -- at most 3
  substantive   boolean not null,
  ai_fallback   boolean not null default false,        -- true: AI failed, summary is the note verbatim (p. 12)
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  check (cardinality(topics) <= 4),
  check (cardinality(next_steps) <= 3),
  check (approved_at is null or substantive)            -- S8
);
create index interactions_connection_idx on interactions (connection_id);
-- one approved summary per connection (S4)
create unique index interactions_one_approved_uq
  on interactions (connection_id) where approved_at is not null;
```

SQL cannot cheaply check that the author is one of the connection's two people, or that the connection is accepted (S3). The routes check both before every insert and approval.

## 3. Rules the routes enforce

- **Draft** (`POST /api/interactions/draft`): the session user is the requester or the addressee of the connection, and the connection has `status = 'accepted'`. Otherwise the route returns 404 (not a member) or 409 `connection_not_accepted`.
- **Approve** (`POST /api/interactions/:id/approve`): the session user is `author_id`, and the draft is substantive. The update is `set approved_at = now() ... where id = $1 and approved_at is null`. A unique violation, or no row updated, returns 409 `already_approved`.
- **Read:** an approved summary is visible to both people of the connection. A draft is visible only to its author.
- **Big screen:** never receives `note`, `summary` or `next_steps`. Aggregated topic counts are allowed (p. 13).

The API contract for the front end is `docs/contracts/ai-summaries-api.md`.

## 4. Open questions

- The topics enum: `lib/topics.ts` is a placeholder until the `interests` seed exists. Then the summary schema takes its enum from the seeded slugs.
- Whether approved-summary topics feed the big screen, and with what weight. The plan used ×3 (p. 7); the data model has no topic visualization yet.
