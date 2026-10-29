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

## [2026-10-29] query | Why did shared links point to localhost?

- The invite link, the personal QR (`/u/<handle>`) and the live join QR fell back to `http://localhost:3000` because `NEXT_PUBLIC_SITE_URL` was unset in Vercel. Set it to `https://compa.lol` and replaced the fallbacks with `requestOrigin()` (configured URL, else the request host, never localhost).

## [2026-10-29] query | Can people sign in from compa.lol?

- Captain decision: yes. The landing offers "Entrar con LinkedIn" for sign-up and sign-in (then `/home`); events stay exclusive because joining needs the QR link. API spec A10a records the amendment; the sign-out warning no longer says the QR is needed to come back.

## [2026-10-29] query | Must every attendee build a monito, and can it show gender?

- Team decision (Sebastián): yes. The (app) layout sends anyone without a saved look to 02b and back (`MonitoGate`, `?next=`); onboarding moved to its own `(onboarding)` route group. The look gains an optional `body` (Hombre / Mujer / Otro), drawn as a skirt for Mujer; it lives in `users.avatar` jsonb, so no migration and no separate gender field. Recorded in [DESIGN.md](../DESIGN.md) 02b and `docs/flows/catalog.md` F-08.

## [2026-10-29] query | How do super admins and real-mode tests work?

- Captain requirement implemented on `feat/COMPA-TBD-super-admin-test-harness`: `users.role` and `/admin` (404 for everyone else), editable event details, organizers, and the real-mode test harness (test users, sign-in-as, automation header, Codex Conf 2026 seed). Specs: data model M20, API spec A11; method in `docs/testing/real-mode.md`. OQ #52 and #56 updated, #57 added.

## [2026-10-29] query | Why did compa.lol go down?

- PR #40 merged with a typecheck error (a teammate change made the monito body required). The Vercel build failed, and the keep-one-deployment cleanup still deleted the working deployment, so the site served 404 until the fix (PR #41) deployed. Now: PR checks gate merges, the deploy runs lint/typecheck/tests first, and cleanup only runs when the new deployment is READY.

## [2026-10-29] query | What does the home notification bell show?

- F-49/T-080 now has a notification list for pending requests, accepted requests, connected invitees and earned badges. The bell polls the unseen count, opening `/notifications` marks displayed items seen, and declines stay hidden (`docs/flows/catalog.md` F-49; `docs/flows/backlog.md` T-080).

## [2026-10-29] query | What is needed to send attendee email sign-in links?

- Hosted Supabase projects need custom SMTP or a Send Email hook to send magic links to arbitrary attendee addresses; its built-in email service only sends to team members and is limited to two emails per hour ([Supabase SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp)). The README and API quickstart now state this deployment requirement.

## [2026-10-29] query | Admin console responsive pass

- `/admin` now follows the V2 breakpoints (390/834/1440): tables from md, cards below, consequence dialogs proportional to stakes (`components/admin/ConfirmDialog.tsx`), inline validation in `EventForm`. UI only; no API or data-model change.

## [2026-10-29] ingest | Live data-viz and UX audit research

- Added `docs/research/` (simulator, 20 prototypes, ~1,000 screenshots, two audits) and 59 draft tickets (DV, DP, UX-A, UX-P) referenced from `docs/flows/backlog.md`. Key gaps: `LiveSnapshot` lacks time window, topics and anonymous flag; attendee screens use a 390 px column on every device. No product code changed.
## [2026-10-29] query | Responsive public pages and landing CTA

- Landing, event door, join, not found and live reviewed at 390/834/1440 (live 1280/1920) in both locales; LinkedIn sign-in is the landing's single primary action (`app/page.tsx`, `components/brand/LinkedInMark.tsx`), event entry screens share one frame (`components/event/layout.ts`). DESIGN.md breakpoints unchanged.

## [2026-10-29] query | Does sign-in keep the deep link?

- T-011: yes. `proxy.ts` sets `x-pathname`; the `(app)` and onboarding layouts redirect signed-out visitors to `/auth/linkedin?next=<path>` via `signInForRequest` (`lib/server/session.ts`); `safeNext` moved to `lib/safe-next.ts` unchanged (`docs/flows/backlog.md` T-011).

## [2026-10-29] query | How does the attendee app adapt to tablet and desktop?

- `components/ui/Screen.tsx` has two widths (`wide` 390/834/1120, `focus` 390/640/680); from 834 dashboard screens switch to two columns, from 1024 the dock is a left rail (`DockRail`) and `--rail` offsets the content. 390 stays pixel-identical. Summary in `DESIGN.md` "Responsive breakpoints".

## [2026-10-29] change | Landing hero in Three.js

- The landing hero (`components/landing/Crowd.tsx`) now plays a looping Three.js connection story (`components/landing/hero-scene.ts`, timeline in `lib/landing/hero-timeline.ts`); the SVG crowd remains the SSR, reduced-motion and no-WebGL fallback.

## [2026-10-29] query | Shared UI mobile polish

- 16 px touch inputs, tap-highlight off, `select-none` labels, `Button` `fit`, live pill spacing, light/dark `theme-color` ([DESIGN.md](../DESIGN.md) "Native feel on phones").

## [2026-10-29] query | What rate limits apply, and what does a person see?

- T-036 shipped per-user limits keyed by user id (not IP): scans 30/min and 300/event, transcription 10/min and 60/day, drafts 10/min and 5/connection, minute and day counters stored in `rate_limit_counters`. Windowed limits: 429 `rate_limited` with `Retry-After`; the event and connection caps count stored rows and return 429 `limit_reached`. The UI shows `common.rateLimited` / `common.limitReached`. Search is not limited yet (`docs/flows/backlog.md` T-036; `docs/flows/catalog.md` F-68; open question #51).

## [2026-10-29] query | How do social links, visibility and the LinkedIn photo sync work?

- Links: `lib/links.ts` validates per network (WhatsApp E.164 number, handles, same-network URLs) in the browser and in `PATCH /api/me` (400). Per-item visibility Todos / Conexiones / Solo yo with a before/after preview in `ProfileForm` (onboarding and edit), using the server's `toCard`. Sign-in refreshes the photo only while the person shows their LinkedIn photo and its `linkedin_photo_key` changed (`lib/linkedin-photo.ts`, migration 0008; data model §4.6).

## [2026-10-29] ingest | Event-day deploy safety and observability

- New page [event-day-runbook](event-day-runbook.md): deploy freeze, Instant Rollback, signals to watch. The deploy workflow now keeps the 10 newest READY production deployments instead of deleting all others; added `app/error.tsx`, `app/global-error.tsx`, `instrumentation.ts` (`onRequestError`), JSON error logs with request ids in `defineRoute`, and `GET /api/health`.

## [2026-10-29] query | How do I write and run Playwright e2e specs?

- T-000 harness shipped: `playwright.config.ts` (viewport × locale projects), fixtures in `e2e/fixtures/` (mock, realUser, testEvent, twoUsers), `e2e/smoke.spec.ts` and `.github/workflows/e2e.yml`. Tags `@mock`, `@real`, `@prod` pick what runs where. Method in `docs/flows/README.md` "E2E tests"; real mode in `docs/testing/real-mode.md`.
## [2026-10-29] change | UI follow-ups (hero fallback, seam, note gap)

- Landing hero: `lib/landing/hero-budget.ts` decides when to skip or leave the Three.js scene (weak device hints; median frame time over 36 ms drops to 1x pixels, then to the SVG). `Crowd.tsx` now draws the six monitos and floor at the scene's first-frame positions. Scene topics `Agents` / `Open Source` come from `lib/topics.ts`. `Screen` holds a fixed dot layer and `StickyBar` is translucent paper over it (iOS ignores `background-attachment: fixed`). Note screen buttons no longer pin to the viewport bottom from 1024. WebKit could not run on the build host (missing system libraries), so devices were emulated with Chromium profiles.

## [2026-10-29] change | Conference-scale fixes: auth, scores, live payload, indexes, door cache

- Findings 1, 2, 9, 14 and 21 of [docs/research/conference-load.md](../docs/research/conference-load.md) fixed: local JWT verification with `getClaims()` and `503 auth_unavailable` on Auth outages; per-person lifetime points and 3 s shared rankings; live snapshot limited to public columns and the 1,000 most recent links; migration `0009` indexes; 1 s CDN cache on the event door. New page [conference-scale](conference-scale.md) with fix status; pointers from [risks](risks.md), [delivery-checklist](delivery-checklist.md), [architecture-stack](architecture-stack.md), [points-rules](points-rules.md) and [event-day-runbook](event-day-runbook.md).
