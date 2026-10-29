# Agent contract and prompts in the plan

The plan's `AGENTS.md` is the contract shared by the four agent threads; each person pastes their prompt into a new thread over a worktree of their branch (p. 16). Person A creates it in PR #0 (p. 16). This repository's actual [AGENTS.md](../AGENTS.md) supersedes the draft below and adds the wiki, git and standards rules.

## Draft `AGENTS.md` in the plan, translated (p. 16–17)

- **Product:** networking companion for conferences. Profile once, connection by QR or @tag, approved summary both receive, Kahoot-style `/live` dashboard. UI in Spanish.
- **Stack:** Next.js (App Router) + strict TypeScript + Tailwind. Supabase (Postgres + Realtime). OpenAI through server routes. Deploy on Vercel. Bun is the package manager and runtime: use `bun install`, `bun add`, `bun run`, commit `bun.lock`, never pnpm or npm.
- **Contracts (do not change without telling the lead):** schema `supabase/migrations/0001_init.sql`; types `lib/types.ts`; topics vocabulary `lib/topics.ts`; points `lib/points.ts` (server only).
- **Rules:** never call OpenAI or award points from the client; every write validates with zod; connections and points are idempotent; mobile first, test at 375 px, `/live` designed for 1920×1080; do not add login or OAuth; before finishing run `bun run lint && bun run typecheck && bun run build`.
- **Commands:** `bun run dev` · `bun run lint` · `bun run typecheck` · `bun run build` · `bun run seed`.

## Prompts (p. 17–18), summarized

- **Prompt A — scaffold, profile and QR:** create the scaffold (Next.js App Router, TS, Tailwind, Supabase) and migration `0001_init.sql` with the four tables; implement `/join`, `POST /api/attendees` (unique handle + 3-character code, session cookie), `/me` with the QR, `POST /api/session/recover` and `/c/[handle]`; add tests for link normalization.
- **Prompt B — connections and points:** idempotent `POST /api/connections` using the pair index, compute `shared_topics`, award points through `lib/points.ts` (+10 connection, +15 bridge, +5 first of day, cap 12 per hour, idempotent by `ref_id`); build `/connection/[id]` and `/connections` (pending first); then @tag search and autocomplete; tests for idempotency and the cap.
- **Prompt C — AI summaries:** `POST /api/transcribe` (MediaRecorder audio, max 2 min), `POST /api/interactions/draft` with Structured Outputs using the document schema, `POST /api/interactions/:id/approve` (author must belong to the connection, blocks `substantive=false`, +25 to each); UI `/connection/[id]/summary`; fallbacks; models from environment variables.
- **Prompt D — dashboard and data:** `/live` for 1920×1080 with animated top-5 podium (framer-motion), bar race of 8 topics (shared topics ×1, approved summary topics ×3), counters, join QR and event feed without summary text; snapshot from `GET /api/live` plus Supabase Realtime; `bun run seed` with about 150 seed attendees with realistic profiles of a JS conference in Guadalajara, about 300 connections and about 80 summaries, plus an optional simulator adding a connection every 3–5 s; toggle to hide seeds.

Related: [team-and-prs](team-and-prs.md), [architecture-stack](architecture-stack.md).
