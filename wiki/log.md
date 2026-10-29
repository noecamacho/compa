# Wiki log

Append-only. Newest entry at the bottom. Entry format: `## [YYYY-MM-DD] <operation> | <title>` where operation is `ingest`, `query` or `lint` (see [AGENTS.md](../AGENTS.md)).

## [2026-10-28] ingest | COMPA build plan PDF (21 pages)

- Source: `raw/pasillo-plan-de-construccion.pdf`, read in full (text layer plus page images for the diagrams on p. 4, p. 8 and p. 16).
- Created: `sources/build-plan`, `overview`, `users`, `success-metrics`, `mvp-scope`, `connection-flow`, `screens/*` (6 pages plus README), `live-dashboard`, `points-rules`, `topics-vocabulary`, `rounds-and-badges`, `privacy-consent`, `architecture-stack`, `data-model`, `api`, `ai-jobs`, `team-and-prs`, `timeline`, `agent-contract`, `demo-script`, `risks`, `delivery-checklist`, `open-questions`, `glossary`, `index`.
- Naming: the source uses a former product name; the wiki uses COMPA everywhere and records the former name only in the glossary and the source summary.
- Decisions recorded outside the wiki: `ARCHITECTURE.md` (ADR-001 to ADR-009 derived from p. 7–11), `DESIGN.md` (principles from p. 1, p. 6, p. 17).
- Open questions: 18 items logged in `open-questions`, including the plan's own closing-time contradiction (p. 16, p. 20).
- Decision recorded (captain, 2026-10-28 19:30): submission deadline 10:00 on 2026-10-29 for MVP, README and demo video; logged in `timeline` and `open-questions` #1; fast-path rules added to `AGENTS.md`.
- Repository PR template: derived from the plan's template (p. 15) and extended with Jira, wiki impact and standards gates; the plan's "Video / GIF" item became the optional evidence line under "How it was tested".

## [2026-10-28] lint | Stack decision: Bun, Supabase, Vercel

- Team decision (user, 2026-10-28): Bun is the package manager and runtime, replacing the plan's pnpm (p. 17); Next.js + strict TypeScript + Tailwind stays; Supabase and Vercel confirmed.
- Updated: `architecture-stack`, `agent-contract`, `ARCHITECTURE.md` (ADR-001), `AGENTS.md` section 4, `docs/jira/compa-bootstrap-ticket.md`, `.gitignore` (non-Bun lockfiles ignored).

## [2026-10-28] ingest | Codex Build Day Guadalajara slides (14 slides)

- Source: `raw/build-day-slides/slide-01.png` to `slide-14.png`, read in full from the page images; page and links captured in `sources/build-day-slides`.
- Created: `sources/build-day-slides`, `hackathon-requirements`.
- Updated: `timeline` (event and submission deadlines now sourced), `delivery-checklist` (submission items the plan lacks), `open-questions` (#1 resolved by the deck, #14 extended, #19 added on Codex evidence), `glossary`, `index`.
- Hook change: `raw/README.md` is exempt from the `raw/` immutability check so the source index can grow.

## [2026-10-28] query | Which license does COMPA use?

- The captain chose MIT; `LICENSE` added. Updated `open-questions` #14 (license resolved, repository visibility still open).

## [2026-10-28] query | What is the minimum API for the MVP with LinkedIn sign-up?

- Added `docs/plans/2026-10-28-mvp-api-plan.md`. It records the captain's LinkedIn sign-up decision (D1, reverses "no login or OAuth"; follow-up PR to update `AGENTS.md` §4 and ADR-007) and finds that self-serve LinkedIn OIDC returns only name, photo, email and locale. It proposes resolutions for open questions #7, #12, #13 and #17 and new questions #20–#23, which are not yet appended to `open-questions`.

## [2026-10-29] query | What are COMPA's database entities?

- Added `docs/specs/2026-10-29-data-model.md`, approved by the captain: multi-event, LinkedIn-only sign-in, check-in by event QR, confirmed connections (one per pair per event) scoring 20 new or 10 reconnection to both people, per-field and per-link visibility, always-on big screen with check-in consent. Supersedes the plan's four-table model (p. 9–10) and the MVP API plan's data model.
- Updated `open-questions`: #5, #7, #8, #9, #10 resolved and #16 partly resolved; added #20–#25.

## [2026-10-29] query | AI core for transcription and summaries

- `lib/ai/*` implements `ai-jobs`: Spanish transcription, Structured Outputs summary, verbatim fallback (p. 12). `lib/topics.ts` ships a 41-topic placeholder list until `open-questions` #4 is settled.

## [2026-10-29] query | How does the COMPA API behave?

- Added `docs/specs/2026-10-29-api.md`, approved by the captain: auto check-in when scanning a personal QR, live in-app requests, simple "Request sent" with live "Connected! +20", public interactive `/live` (person card, leaderboard on click), connections grouped by person. Adds `users.handle` to the data model and seeds `interests` from `lib/topics.ts`. Added open questions #26–#27.

## [2026-10-29] query | Do AI summaries score?

- Captain: summaries are back with points. Data-model M18 adds `interactions` (one approved per connection, +25 to both, value from `docs/contracts/ai-summaries-api.md`, pending confirmation); API A9 reuses the contract's routes. Open question #25 resolved.

## [2026-10-29] query | Summary language

- Team decision: transcription and summaries in Spanish; resolved `open-questions` #6 and #3 (models `gpt-4o-mini-transcribe` and `gpt-5.4-mini`). Updated `ai-jobs`, `DESIGN.md`.

## [2026-10-29] query | AI summaries API contract

- `docs/contracts/ai-summaries-api.md` documents routes 14–16 of the MVP API plan for the summary screen, with camelCase `nextSteps`, the extra `fallback` flag and proposed error codes; `lib/audio/recorder.ts` records audio client-side with the 2-minute limit.

## [2026-10-29] query | API scaffold from the data-model and API specs

- Code implements `docs/specs/2026-10-29-data-model.md` and `2026-10-29-api.md` (branch `docs/COMPA-TBD-mvp-api-plan`): `db/schema.ts`, `drizzle/0000_init.sql`, `lib/api/routes.ts` (contract, mock mode, `openapi.json`) and `lib/server/*`; usage in `docs/api-quickstart.md`. Summaries award `SUMMARY_POINTS = 25` per M18, which the summaries contract still contradicts ("no points").

## [2026-10-29] query | Why were teammates' deploys blocked?

- Vercel Pro blocks native git deploys whose commit author is not on the Vercel team. Deploys now run from GitHub Actions with the owner's token (repo secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`); `vercel.json` sets `git.deploymentEnabled: false`. Production is `https://compa.lol`.

## [2026-10-29] query | Where do environment variables live?

- Captain decision: Vercel is the single place for env values, and the captain adds and rotates the secrets. `.env.example` lists names only; the only GitHub secrets are the three deploy-workflow ones. Recorded in `docs/api-quickstart.md`.

## [2026-10-29] query | Do we keep preview deployments?

- Captain decision: no previews and only one deployment. The Vercel workflow runs only on pushes to `main` and deletes every other deployment after a successful deploy; existing previews and old deployments were deleted by hand.

## [2026-10-29] ingest | Compa V2 design handoff

- Added `design/compa-v2/` (README, 16 screen mocks, 4 components) as the visual source of truth for the attendee screens, and ported its four components to React/SVG (`lib/monito`, `lib/badges`, `components/`). The handoff's points table (50 new / 20 reconnection / +5 topics / +15 voice note / +100 and +50 per invited friend) differs from data model M3 and M18; the migration is tracked in a follow-up PR and the "+20 for accepting" line is logged in [open-questions](open-questions.md) #28.

## [2026-10-29] query | Which language does the AI write in?

- Captain decision: transcription keeps the spoken language (auto-detected) and the summary and next steps use the note's language; topics are always classified with the fixed vocabulary that seeds `interests`. Replaces the Spanish-only team decision in `ai-jobs`.

## [2026-10-29] ingest | V2 attendee screens

- The sixteen V2 screens live under `app/` (routes in [screens/README](screens/README.md)); pages read the API over HTTP with zod on the response, so mock mode serves every screen. New routes `GET /api/connections/{id}`, `GET /api/badges`, `GET /api/invites/me` and `POST /api/invites/{code}/claim` are registered (mock only until the points model lands). `lib/points.ts` now carries the V2 table (50/20, +5 topics, +15 note, +100/+50 invites) and migration `0001` moves the connections points check and adds `whatsapp` to the link vocabulary. [points-rules](points-rules.md) still describes the plan's table and needs the V2 rewrite with the data model follow-up.

## [2026-10-29] query | What does V2 need from the backend?

- Rewrote `DESIGN.md` from the V2 handoff (with the bilingual UI decision and "AI language follows the speaker") and added `docs/backend-gap-analysis.md` (34 use cases: 11 Ready, 11 Partial, 7 Missing, 5 Conflict); open question #6 superseded by the bilingual decision; conflicts logged as [open-questions](open-questions.md) #29–#42.

## [2026-10-29] query | Which V2 screens work outside mock mode?

- Re-checked the gap analysis against the V2 screens (PR #14/#17) and PR #15: 35 use cases, 2 Ready, 15 Partial, 13 Mock-only, 4 Missing, 1 Conflict. `GET /api/connections/{id}`, `/api/badges` and `/api/invites/me` answer 501 in real mode and block 06, 06b, 08b, Home, Badges and Invite; `lib/server/*` ignores the new `city`, `avatar`, `topics` and `scope` fields. Open questions #29, #31, #32 and #42 note what the code now does.

## [2026-10-29] query | Is production migrated to the V2 points?

- Applied `drizzle/0001_v2_points_whatsapp.sql` to the production Supabase project (no rows existed). The points check now enforces 50 for new and 20 for reconnection, matching the deployed code; the points table itself awaits captain ratification (gap analysis, open question #29).
## [2026-10-29] ingest | V2 points model and real handlers

- Migration `0002`: `users.avatar`, `users.city`, `users.golden_cap_at`, `connections.topics`, `interactions.title` and `pending_action`, tables `bonus_points`, `user_badges`, `invites`; both score views rebuilt (notes pay the author, bonus points count). Handlers now fill every V2 field: profile stats, scores and badges, person relationship and last note, connection detail, badge catalog with progress (`lib/badges/rules.ts`), invites with the golden cap, leaderboard scope and `me`, and the AI summary returns a title and a pending action. [points-rules](points-rules.md) rewritten for the V2 table.

## [2026-10-29] query | What testing is required for new work?

- Captain decision: further development preferably ships with Playwright e2e specs that confirm the affected user flows (happy path, edge cases, errors) across 390/834/1440 and es/en, plus unit tests. Recorded in `AGENTS.md` §4, `docs/engineering-standards.md` (Testing) and the PR template; `AGENTS.md` also now states LinkedIn-only sign-in, responsive breakpoints and the bilingual UI.

## [2026-10-29] query | How do database migrations reach production?

- Automatically: pushes to `main` deploy through a remote Vercel build whose command is `bun run db:migrate:deploy && bun run build` (`DATABASE_URL_DIRECT`, a sensitive Vercel env value, is readable only during Vercel builds). A failed migration fails the deploy. Rule added to `AGENTS.md`: migrations are additive and backward-compatible.

## [2026-10-29] query | How do people reach an event?

- Captain decision: only through the unguessable access code in the event QR, `compa.lol/e/<code>` (data model M19, API spec A10). Public event routes moved to `/api/e/{code}/…` with one indistinguishable 404 for any wrong code; slugs are admin-only; admins rotate codes with `POST /api/admin/events/{slug}/rotate-code`. `compa.lol` is a landing page with no sign-up; Spanish for `es*` languages, English otherwise. Migration `0003_event_access_code` backfills existing events. Resolves open question #2 (domain) and annotates #6 (language).

## [2026-10-29] ingest | Guided onboarding and request inbox

- Added the spotlight tour (`components/tour/Tour.tsx`): the screen dims except one element and a card explains it, step by step, once per screen (home, connect, register, profile, ranking) and again from "Guía rápida" in the profile or `?tour=1`. Home now shows incoming requests as cards and polls `GET /api/connections` every 3 s (bell links to the newest); the confirmation screen refreshes when a pending request is answered; `/u/[handle]` keeps the handle through LinkedIn sign-in; `/` forwards a signed-in person to `/home`; home renders outside an event. Closes gap-analysis U1, U7, U10, U15 and U16.

## [2026-10-29] query | Does a profile show the LinkedIn photo or the monito?

- Captain decision: the LinkedIn photo by default, the monito by choice. Branch `fix/COMPA-TBD-photo-default-v2` adds `users.avatar_mode` (migration `0003_avatar_mode`), copies the photo to the Storage bucket `avatars` at sign-in, and makes Home and Ranking tolerate failed secondary calls. Status: `docs/backend-gap-analysis.md` §0.

## [2026-10-29] query | Which user flows exist, what is missing, and what do agents build next?

- Added `docs/flows/`: 74 user flows with status per layer and e2e coverage, an actor permission and CRUD matrix (34 missing operations), 40 risks, and 86 agent-ready tickets (12 P0, 48 P1, 26 P2; 11 in progress on the landing and real-mode branches). Per the captain's requirement, every ticket depends on the Playwright harness T-000 and ships e2e specs. New open questions #43–#56.

## [2026-10-29] query | Which P0 crash and visibility gaps remain on main?

- P0-4 and P0-7 were already fixed on main (`apiGetSafe`, `withDefaultVisibility` in `lib/visibility.ts`); P0-6 fixed: the register screen shows the event-screen notice before sending `screenConsent: true` ([backend gap analysis](../docs/backend-gap-analysis.md) section 4).

## [2026-10-29] ingest | Official COMPA logo

- The captain set the official logo: two interlocking speech bubbles (green and blue, ink outline, hard shadow) with the rounded wordmark "compa". Originals in `design/brand/`; transparent web versions in `public/brand/`; favicon, `app/icon.png`, `app/apple-icon.png` and `app/opengraph-image.png` generated from them. Replaces the yellow single-bubble mark.

## [2026-10-29] query | Can people sign in without LinkedIn?

- Yes, by request: the event door adds an email magic link (`POST /api/auth/email`, same `/auth/callback`). M2 in the data-model spec, `AGENTS.md` §4 and the API spec updated.
