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
