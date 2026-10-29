# COMPA — architecture

System overview derived from the build plan (`raw/pasillo-plan-de-construccion.pdf`). Page numbers cite that PDF. Detailed, sourced pages live in the wiki: [architecture-stack](wiki/architecture-stack.md), [data-model](wiki/data-model.md), [api](wiki/api.md), [ai-jobs](wiki/ai-jobs.md). Undecided items are listed as open, not invented.

## Overview

One Next.js application on Vercel serves both the attendee's phone and the projected `/live` screen. Supabase stores the data in Postgres and pushes changes with Realtime. OpenAI is called only from server route handlers (p. 7–8).

## Components (p. 8)

| Component | Responsibility | Talks to |
| --- | --- | --- |
| Attendee phone (browser, no install) | `/join`, `/me`, `/c/[handle]`, `/connection/[id]`, `/connection/[id]/summary`, `/connections` | Next.js route handlers |
| `/live` screen (projected) | Podium, topic race, counters, feed | `GET /api/live` for the snapshot; Supabase Realtime for updates |
| Next.js on Vercel | Pages plus route handlers `/api/attendees`, `/api/session/recover`, `/api/connections`, `/api/interactions/*`, `/api/transcribe`, `/api/live`; `lib/points.ts` holds points and rules | OpenAI API, Supabase |
| OpenAI API | Voice transcription; summaries with Structured Outputs | — |
| Supabase | Postgres (4 tables); Realtime on `connections`, `interactions`, `points` | — |
| Codex SDK (P2) | Organizer analyst, "ask your event" | Next.js (dashed in the plan, unspecified) |

## Data flow (p. 4, p. 9–11)

1. Profile: `POST /api/attendees` validates with zod, normalizes links, generates handle and 3-character code, writes `attendees`, sets a session cookie.
2. Connection: scanning `/c/[handle]` (or @tag) calls `POST /api/connections`; the unique index on the ordered pair makes it idempotent; `shared_topics` is computed; points are written to `points` with `ref_id` for idempotency.
3. Summary: text or dictation → `POST /api/transcribe` (audio → text, server-side OpenAI) → `POST /api/interactions/draft` (Structured Outputs: `summary`, `topics`, `next_steps`, `substantive`) → user edits → `POST /api/interactions/:id/approve` (author check, blocks non-substantive, +25 to each party, shares with both).
4. Live: `/live` loads `GET /api/live`, then subscribes to Realtime changes; topic weights are shared topics ×1 and approved-summary topics ×3.

## Decisions (ADR style)

Each entry: context, decision, consequences, source.

### ADR-001 One Next.js app serves phone and `/live`
- Context: hackathon, four people, one night (p. 13, p. 15).
- Decision: Next.js App Router + TypeScript + Tailwind, one repo, one deploy on Vercel (p. 8). Bun is the package manager and runtime (team decision 2026-10-28; the plan said pnpm): `bun install`, `bun run <script>`, lockfile `bun.lock`.
- Consequences: route handlers are the only backend; `/live` is a page of the same app.

### ADR-002 Supabase Postgres + Realtime for data and live updates
- Decision: four tables, Realtime subscriptions feed `/live` (p. 8–9).
- Consequences: `/live` updates in under 2 s after each write (p. 2); the migration `supabase/migrations/0001_init.sql` is a contract file owned by the lead (p. 14, p. 17).

### ADR-003 OpenAI only from the server, with schema-validated output
- Decision: transcription and summaries go through route handlers; summaries use Structured Outputs against the JSON schema on p. 12; model names come from `OPENAI_STT_MODEL` and `OPENAI_TEXT_MODEL` (p. 11–12, p. 18).
- Consequences: the client never holds an API key; the AI never decides points or permissions (p. 11); fallbacks keep the flow alive when the AI fails (p. 12).

### ADR-004 QR is a URL; scanning uses the native camera
- Decision: generate with `qrcode`; the QR opens `/u/<handle>`, so any camera app works. The plan had no in-app scanner because Safari has no `BarcodeDetector` (p. 8).
- As built: `/connect?tab=scan` has an in-app scanner that uses `BarcodeDetector` where it exists and lazily loads `jsqr` (pure JS, no WebAssembly or CDN fetch) on Safari and Firefox ([conference-load](docs/research/conference-load.md) finding 10).
- Consequences: `/c/[handle]` must work with and without a session (p. 5); HTTPS and a short domain are required (p. 8).

### ADR-005 zod schemas shared by client and server
- Decision: every write validates with zod; the same schemas run on both sides (p. 8, p. 17).
- Consequences: types at every boundary are derived from schemas, not hand-written twice.

### ADR-006 Business rules live on the server
- Decision: points, idempotency, hourly cap and author-membership checks run in route handlers and `lib/points.ts`, never in the client (p. 11, p. 17).

### ADR-007 No accounts: handle + recovery code in a cookie
- Decision: no login, no OAuth, no password; the session is a cookie recoverable with handle + 3-character code (p. 1, p. 3, p. 4–5, p. 17).
- Consequences: a recovery path is needed when Safari drops the cookie (p. 20); social networks are links only.

### ADR-008 Idempotent pairs and points by database constraints
- Decision: unique index on `(least(a_id,b_id), greatest(a_id,b_id))`; `unique (attendee_id, reason, ref_id)` on `points` (p. 9–10).
- Consequences: double scans and retries cannot duplicate connections or points (p. 5).

### ADR-009 Seed data and a simulator keep the demo alive
- Decision: about 150 `is_seed` attendees, about 300 connections, about 80 summaries, optional simulator, hide toggle (p. 3, p. 13, p. 18).

## Decided versus open

Decided: everything above. Open (see [wiki/open-questions.md](wiki/open-questions.md)): domain name (#2), model names (#3), full topics vocabulary (#4), tribe enforcement (#5), storage for opt-out and consent (#7), who receives +10 (#8), behavior past the hourly cap (#9), summaries per connection (#10), audio holding location (#11), recovery screen (#12), photo upload (#16), seed toggle mechanism (#17).

## Repository layout implied by the plan (p. 17)

- `supabase/migrations/0001_init.sql` — schema (contract)
- `lib/types.ts` — shared types (contract)
- `lib/topics.ts` — topics vocabulary (contract)
- `lib/points.ts` — points rules, server only (contract)
- `app/` — Next.js App Router pages and route handlers

No application code exists yet; the Jira Epic in `docs/jira/compa-bootstrap-ticket.md` tracks the build.
