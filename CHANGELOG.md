# Changelog

All notable changes to COMPA are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Commit types map to versions as described in `docs/git-workflow.md`.

## [Unreleased]

### Security

- Events are reachable only through an unguessable access code in the event QR (`compa.lol/e/<code>`). Public event routes moved from `/api/events/{slug}/…` to `/api/e/{code}/…` and answer any wrong code with the same `404 event_not_found`; the old slug routes are removed. Admins rotate a code with `POST /api/admin/events/{slug}/rotate-code`. Migration `0003_event_access_code` adds and backfills `events.access_code` (must be applied to production).

### Fixed

- Accept Chrome and Android voice notes: MediaRecorder webm files carry no duration, so the server now rejects only audio whose known length exceeds two minutes or that contains no audio track.
- Require explicit screen consent before writing an event check-in; accept multipart transcription uploads with server-side size and two-minute duration limits.

### Changed

- `GET /api/me` returns `currentEvent: { code, name }`; the home and ranking screens reach the live data through it and show an "out of an event" state when it is null. Onboarding copy no longer promises title, company or city from LinkedIn (only name, photo and email come from it).

- Vercel deploys are production-only and keep exactly one deployment: the workflow no longer deploys PR previews and deletes older deployments after each successful production deploy (captain decision).
- Package manager and runtime is Bun instead of pnpm (team decision); Next.js, TypeScript, Supabase and Vercel unchanged. Commands are `bun run dev|lint|typecheck|build|seed`.
- TypeScript is 6.0 instead of 7.0: typescript-eslint and the Next.js build checker do not support the TS 7 API yet. The seed command is `bun run db:seed`.
- Transcription and AI summaries follow the language the note was spoken or written in (captain decision, replaces Spanish-only); topics still come from the fixed vocabulary. Code and docs stay English.

### Added

- `compa.lol` landing page in the V2 style: one promise, idle monitos, "you get in only by scanning your event's QR", and a "Back to my event" button for checked-in people. No public sign-up.
- Event door `/e/<code>` (name, live counters, Enter with LinkedIn), check-in screen with the big-screen notice `/e/<code>/join`, and the projected dashboard `/e/<code>/live` (Three.js loom of accepted connections colored new vs reconnection, counters, join QR, leaderboard, person cards; polls every 3 s; 390 to 1920 px).
- Spanish or English by the visitor's first preferred language (`lib/i18n.ts`, `lib/copy/en.ts`) for the landing and event-entry screens.
- V2 data model and handlers: migration `0002` (monito avatar, city, golden cap, connection topics, note title and pending action, `bonus_points`, `user_badges`, `invites`, score views that pay notes to their author and count bonus points), badge rules with progress, invite links with +100/+50 and the golden cap, connection detail, leaderboard `scope` with the viewer's standing, and AI summaries with a title and a pending action.
- The sixteen V2 attendee screens (`app/`), Spanish copy in `lib/copy/es.ts`, typed API fetch helpers for pages and clients, four mock-only V2 routes (connection detail, badges, invites), the V2 points table in `lib/points.ts` and migration `0001` (connections check 50/20, `whatsapp` link).
- V2 design system from the `design/compa-v2` handoff: paper/ink theme tokens and keyframes in `app/globals.css`, Fredoka and Nunito via `next/font`, the pixel-art monito (`lib/monito`, `components/monito`), the 20 badges (`lib/badges`, `components/badges`), the travelling-pill dock (`components/nav/Dock.tsx`), UI primitives in `components/ui` and a visual QA gallery at `/design`.
- GitHub Actions deploy to Vercel (`.github/workflows/vercel.yml`): production on every push to `main`, a preview with a PR comment on every pull request. Vercel's native git deploys are off because Vercel Pro blocks commits from authors outside the Vercel team.
- API scaffold: Next.js App Router on Bun, Drizzle schema and init migration for the 2026-10-29 data model (with RLS on every table), an interests seed, every API-spec route with zod validation, an OpenAPI 3.1 document (`/api/openapi.json`, `/api/docs`, `openapi.json`), mock mode on every route (`API_MODE=mock`, `x-compa-mock`, error simulation) and real handlers for profile, events, connections, live and summaries. See `docs/api-quickstart.md`.
- `docs/specs/2026-10-29-api.md`: approved API spec with routes, request and response shapes, the visibility filter, connection behavior and Realtime channels.
- `docs/specs/2026-10-29-data-model.md`: approved data model for multi-event COMPA with LinkedIn-only sign-in, event check-in, confirmed connections (20 new, 10 reconnection) and per-field profile visibility.
- `docs/plans/2026-10-28-mvp-api-plan.md`: MVP API plan covering LinkedIn sign-up, profile import and field visibility, database entities, route behavior, connection tracking and the `/live` data contract.
- Browser audio recorder in `lib/audio/recorder.ts` (2-minute auto-stop, typed errors, transcript upload) and the AI summaries API contract in `docs/contracts/ai-summaries-api.md`.
- AI core in `lib/ai/`: audio transcription and Spanish summary drafts with Structured Outputs and a verbatim fallback; placeholder topics vocabulary in `lib/topics.ts`.
- LLM wiki (`raw/`, `wiki/`) ingesting the 21-page COMPA build plan and the 14-slide Build Day deck with 34 cross-linked, cited pages, an index, an append-only log, a glossary and an open-questions page.
- `AGENTS.md` as the single agent and contributor instruction file, including the hackathon fast path for the 2026-10-29 10:00 submission deadline; `CLAUDE.md` imports it.
- `ARCHITECTURE.md` and `DESIGN.md` derived from the plan, with decided versus open items.
- `docs/engineering-standards.md`: SOLID, KISS, DRY, no nesting, clean code with TypeScript examples.
- `docs/git-workflow.md`: Conventional Commits, Semantic Versioning, branch naming, hooks and attribution rules.
- `docs/agent-tooling.md`: caveman, ponytail, Serena and repomix usage and verified install methods.
- `docs/jira/compa-bootstrap-ticket.md`: the COMPA Epic draft with per-phase tasks and acceptance criteria.
- `.github/PULL_REQUEST_TEMPLATE.md` that every PR must use.
- Git hooks in `.githooks/` (`commit-msg`, `pre-commit`, `pre-push`), `scripts/setup.sh`, the shared checker `scripts/check-commit-message.sh`, agent hook configs in `.claude/settings.json` and `.codex/hooks.json` (commit rules and no pushes to `main`), and tests in `tests/hooks/`.
- `repomix.config.json`, `.serena/project.yml` and `.gitignore`.
- MIT `LICENSE`, required for the hackathon submission.
