# Changelog

All notable changes to COMPA are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Commit types map to versions as described in `docs/git-workflow.md`.

## [Unreleased]

### Added

- End-to-end coverage for every built flow and all 46 API operations, in mock mode and in real mode against a local Supabase, at 390/834/1440 in Spanish and English (`docs/flows/catalog.md` "E2E coverage status"). CI builds the app and runs the mock specs in eight shards.
- Observability for event day: root `app/error.tsx` and `app/global-error.tsx`, `instrumentation.ts` request-error logging, JSON error logs with request ids (and an `x-request-id` header on API errors), and `GET /api/health`. Runbook in `wiki/event-day-runbook.md`.

### Changed

- The deploy workflow keeps the 10 newest production deployments (it used to delete all others), so Vercel Instant Rollback works.
- Mobile polish on shared UI: 16 px inputs on touch (no iOS focus zoom), no tap-highlight flash, non-selectable button and pill labels, `Button`/`ButtonLink` `fit` prop for content width, tighter EN VIVO pill spacing, light and dark `theme-color`.
- Profile editing: every network (LinkedIn, WhatsApp, Instagram, X, GitHub, website) has its own brand icon and name, a field that takes a handle, a WhatsApp number or a link with inline validation, and a labelled "Quitar" with "Deshacer" instead of an unlabelled cross. Each item (role, company, each link) has "Todos", "Conexiones" (only after the connection is accepted) or "Solo yo", with a live preview of the profile before and after connecting, in onboarding and in "Editar perfil". `/me` lists your links with their level; the other person's screen shows the links you may see.
- Sign-in no longer re-downloads the LinkedIn photo every time: it updates the photo only while you still show your LinkedIn photo and it changed on LinkedIn; a chosen monito is never overwritten. Saving the profile unchanged no longer stops LinkedIn from refreshing your name. Migration 0008 adds `users.linkedin_photo_key`.

### Fixed

- Found by the full e2e pass: an event code with spaces or capitals now opens the door and the live screen; the door shows the opening time in the event's own time zone (`GET /api/e/{code}` gains `timezone`); an expired session on "Entrar al evento" goes to sign-in instead of a generic error; the person who sent a request no longer sees Accept and Decline (they answered 403), and an answered request hides them; typing a time zone in the admin event form no longer crashes it; each admin confirm dialog has its own name; "Copiar" on the invite screen selects the link when the clipboard is denied instead of claiming it copied; an out-of-range interest id answers 400 instead of 500; a stranger's malformed admin path answers the same 404 as any other; home and profile have an h1, the connection-kind icon is named, and the register error is announced.
- UI follow-ups: the landing 3D hero falls back to the SVG crowd on weak devices (fewer than 4 cores, under 3 GB, data saver) and, at run time, when its median frame time stays above 36 ms (first at 1x pixels, then SVG). The SVG crowd now shows the same six monitos on the same floor as the scene, so the cross-fade is seamless. The sticky bar no longer shows a seam on iPad: Screen draws the paper dots on a fixed layer and the bar is translucent paper over it. The note screen's save buttons sit under the content from 1024 instead of at the bottom of the viewport. The scene's extra topics are real interests (Agents, Open Source) in Spanish and English.
- Conference load: sessions are verified locally with `getClaims()` instead of a Supabase Auth call per request, and an Auth outage answers `503 auth_unavailable` instead of signing people out; `GET /api/connections` reads one person's points instead of scanning every connection; rankings are shared per instance for 3 s; the live snapshot sends only public columns and the 1,000 most recent links (counters still count all; each person carries a `connections` count); the event door `GET /api/e/{code}` gets the same 1 s CDN cache as `/live`; migration `0009` adds the missing indexes (`wiki/conference-scale.md`).
- In-app QR scanning works on iPhone Safari and Firefox: without `BarcodeDetector` the scanner decodes frames with jsQR, the camera no longer restarts on every keystroke, each QR is looked up once, and the viewfinder says why the camera is unavailable (permission denied, no camera, camera busy, unsupported browser) and to use the phone's camera app instead.
- Client requests no longer hang on venue Wi-Fi: a 15 s timeout (35 s for drafts, 40 s for audio upload), one retry for a GET after a network failure, and Spanish messages for offline, timeout, signed-out, rate-limited and server errors instead of raw English text. A failed decline stays on the request screen with the reason. A voice note whose upload fails is kept and can be re-sent; leaving the screen while recording releases the microphone.
- Invites: a claimed invite is never re-linked to a second person, and concurrent first loads of `GET /api/invites/me` no longer fail with 500.
- The live screen survives an access-code rotation (the board stays up and asks for the new link from Admin instead of showing "not found") and shows outages: an 8 s fetch timeout, one poll in flight, the age of the data in the reconnecting pill, and an outage page that retries every 10 s.
- Sign-in keeps the deep link: a signed-out visitor opening any app screen (for example `/connections`) or onboarding step now goes to `/auth/linkedin?next=<path>` and comes back to that screen, instead of landing on `/` and losing the path. A new `proxy.ts` passes the requested path to layouts as `x-pathname`; unsafe paths still fall back through `safeNext` (T-011).
- A first-night attendee with no connections yet now sees incoming requests on Home right away instead of after the first poll.
- Marking notifications seen never moves backwards (a stale tab) nor into the future.
- Badges: `GET /api/badges` no longer fails for signed-in users (a raw date in the sign-up count broke the query), so the badge screen and awarding work again; badges still to earn show their own art, faded with a lock, and only secret ones stay grey.

### Changed

- Every attendee screen, state, error, dialog and badge name now reads in English or Spanish from the system locale, not only the landing and event door. Copy comes from `lib/copy/{es,en}.ts` through `useCopy()` (client) and `requestCopy()` (server); `<html lang>`, the page description, relative times, clocks and number formats follow the locale; failed calls show text mapped from the API error `code` instead of the API's English message; the ranking tip, badge progress and badge dates are built from raw values so they follow the locale. A test fails on a missing key, an untranslated string, or any direct import of a single locale's dictionary.

### Documentation

- Describe the attendee flows that are implemented and document the custom SMTP or Send Email hook requirement for hosted Supabase email sign-in.

### Added

- Playwright e2e harness (T-000): `bun run e2e` across 390 (Chromium and WebKit), 834, 1440 and 1920 (`e2e/live/**`) in Spanish and English plus reduced motion; `mock`, `realUser`, `testEvent` and `twoUsers` fixtures; `e2e/smoke.spec.ts`; the `E2E` pull-request workflow. Under `API_MODE=mock`, a test-only `compa-mock-error` cookie injects a documented error into server-rendered fetches.
- Live notifications on every attendee screen: requests, acceptances, invitees who connected and badges reach the bell, the incoming cards and a toast within about a second through a private Supabase Realtime channel per person (`user:<id>`, RLS in migration `0011_realtime_user_channels`), with polling as the fallback. The requester's "request sent" screen flips to "Connected" the moment it is accepted.
- Web Push alerts: "Turn on alerts" on `/notifications` (service worker `/sw.js`, VAPID keys from `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), with plain messages when the browser blocks or cannot show alerts and a Home Screen hint on iPhone. New routes `POST` and `DELETE /api/push/subscriptions`, table `push_subscriptions` (migration `0010_push_subscriptions`), and a web app manifest. Declines never notify.
- The first live two-person e2e spec, `e2e/notifications/live.spec.ts` (real mode, against a local Supabase stack, `docs/testing/real-mode.md` §6).
- Landing hero: a Three.js vignette plays the COMPA story on a small event floor. Pixel-art monitos walk up to each other, one scans the other's QR, speech bubbles show the topic, a mint thread joins them (sky for a reencuentro), and "+50" or "+20 reencuentro" pops with confetti. Threads build up into a network and then fade. The camera follows the mouse, and hovering or tapping a monito makes it jump and say "¡Hola!" / "Hi!". The SVG crowd stays as the server render and the fallback for reduced motion and missing WebGL.
- Admin console, responsive pass: tables from 768 px and stacked cards on a phone, sticky primary actions, a two-column event page with the QR and actions beside the details, a live preview on the new-event form, inline field validation with a kept draft, consequence dialogs (bottom sheet on a phone) for rotate, end, archive, remove attendee and delete test user, and loading and error states.

- Attendee app is responsive at 390, 834 and 1440: the 390 layout is unchanged; from 834 Home, Me, profiles, Ranking and the monito builder use two columns, Connections and Badges use wider grids, and one-task screens center at reading width; from 1024 the dock becomes a left rail (with the Admin link for super admins). New loading skeleton and error screen with retry, a real empty state on Connections, and 44 px tap areas on chips, toggles and swatches.
- Rate limits per signed-in user: 30 scans a minute and 300 per event, 10 transcriptions a minute and 60 a day, 10 drafts a minute and 5 per connection. Past a per-minute or per-day limit the API returns 429 `rate_limited` with `Retry-After`; past a per-event or per-connection cap it returns 429 `limit_reached`. The scan and note screens show matching copy.
- Incoming requests: `/connections` lists requests waiting for your answer on top, polled every 3 s like the home screen. Polling now pauses while the tab is hidden, refreshes on return and backs off on errors (`lib/use-poll.ts`). A request whose event ended shows "the request expired" instead of the accept buttons, also when it expires while on screen.
- Monito builder: a "Soy" row with Hombre, Mujer and Otro (Mujer draws a skirt and suggests long hair), stored in the look; building a monito is now required before using the app, also when signing in with a LinkedIn photo.
- Super-admin console at `/admin` (390, 834 and 1440, Spanish and English): list, create and edit events (description, venue, address, city, country, website, IANA time zone, schedule, status, test flag), the join QR and link, rotate code, end now, archive; attendees with counts, check-in on someone's behalf (consent recorded as admin-assigned), organizers per event; people search. New `/api/admin/*` routes (API spec A11). `GET /api/me` returns `role` and `isTest`.
- Real-mode test harness: synthetic test users (`users.is_test`, no LinkedIn) with generated profiles, `POST /api/admin/test-users/{id}/session` to sign in as one, the `x-compa-automation` header for test runners (`TEST_AUTOMATION_SECRET`), the seeded test event Codex Conf 2026 (`SEED_TEST_EVENT=1`), and `docs/testing/real-mode.md`.

- Sign out on the profile screen (`/me`), with a confirm step that warns you need your event's QR to get back in.
- Email sign-in on the event door: people without LinkedIn enter their email and get a one-time link (Supabase magic link) that creates the account or signs them in. New route `POST /api/auth/email`. Requires the Supabase Email provider enabled and `/auth/callback` in the redirect allow list.

### Security

- Admin pages and routes answer `404` to anyone who is not a super admin (`users.role`, migration `0005_super_admin_test_harness`, which backfills the three captains and any `is_admin` user), and the per-request mock header no longer opens them outside a mock deployment. Test users never join or show at a real event.

- Events are reachable only through an unguessable access code in the event QR (`compa.lol/e/<code>`). Public event routes moved from `/api/events/{slug}/…` to `/api/e/{code}/…` and answer any wrong code with the same `404 event_not_found`; the old slug routes are removed. Admins rotate a code with `POST /api/admin/events/{slug}/rotate-code`. Migration `0003_event_access_code` adds and backfills `events.access_code` (must be applied to production).

### Fixed

- Notification bell now opens a live-updating list for requests, accepted connections, invitees and earned badges; opening the list marks displayed items as seen.
- Award an invite's first-connection points only once when concurrent accepts race.
- Use a provider-neutral sign-in error for failed LinkedIn and email callbacks.
- Connection confirm screen now shows the event-screen notice before sending `screenConsent: true` (M13).
- The AI summary prompt is event-neutral: it no longer tells the model it is at a JavaScript conference.
- Home, Ranking and Badges render a section empty instead of the error page when a secondary call fails; profiles stored before the `whatsapp` link existed parse again.
- Motion pass: the dock now lives in the `(app)` layout, so its pill actually travels between tabs (it used to remount and jump) and moves on tap before the route renders; every screen slides in through `app/(app)/template.tsx`; the segmented control's ink pill slides; the tour's spotlight and card glide between steps; buttons, cards, chips and icon buttons sink into their hard shadow on press (`pressable` / `tappable` utilities); list filters, podium, note phases, progress bars, the bell badge, the monito builder and the scan line animate; `prefers-reduced-motion` no longer hides the live pairs.
- Accept Chrome and Android voice notes: MediaRecorder webm files carry no duration, so the server now rejects only audio whose known length exceeds two minutes or that contains no audio track.
- Require explicit screen consent before writing an event check-in; accept multipart transcription uploads with server-side size and two-minute duration limits.

### Changed

- Landing: "Entrar con LinkedIn" / "Sign in with LinkedIn" is now the one primary action, with the LinkedIn mark and a short reassurance line, above the fold on a 390 phone and pinned to the bottom edge on shorter screens; the event-QR hint became a quiet secondary row. Public pages (landing, event door, join, not found, live) reflow at 390, 834 and 1440 (live also at 1280 and 1920) with safe-area padding, grouped content on tablets and desktops, and a 16 px email field so iOS does not zoom.

- Safer deploys: pull requests run lint, typecheck, tests and build (`.github/workflows/checks.yml`); the production deploy runs the same gates first and only deletes older deployments when the new one is READY.
- On phones the top row (avatar, greeting and bell on Home; back and title elsewhere) stays pinned while scrolling, the dock respects the iPhone safe area, and overscroll no longer drags them. Home, incoming requests and the live person card now show the LinkedIn photo or the monito the person chose.
- Run database migrations only in Vercel Production builds; Preview builds no longer target the production database.
- The landing page offers "Entrar con LinkedIn" (sign-up and sign-in) so people can reach their events without rescanning; joining an event still needs its QR.
- Database migrations apply automatically on every production deploy: the workflow deploys with a remote Vercel build whose build command runs `db:migrate:deploy` before `next build`.
- `GET /api/me` returns `currentEvent: { code, name }`; the home and ranking screens reach the live data through it and show an "out of an event" state when it is null. Onboarding copy no longer promises title, company or city from LinkedIn (only name, photo and email come from it).

- Vercel deploys are production-only and keep exactly one deployment: the workflow no longer deploys PR previews and deletes older deployments after each successful production deploy (captain decision).
- Package manager and runtime is Bun instead of pnpm (team decision); Next.js, TypeScript, Supabase and Vercel unchanged. Commands are `bun run dev|lint|typecheck|build|seed`.
- TypeScript is 6.0 instead of 7.0: typescript-eslint and the Next.js build checker do not support the TS 7 API yet. The seed command is `bun run db:seed`.
- Transcription and AI summaries follow the language the note was spoken or written in (captain decision, replaces Spanish-only); topics still come from the fixed vocabulary. Code and docs stay English.

### Added

- Official COMPA logo (two interlocking speech bubbles): originals in `design/brand/`, web assets in `public/brand/`, favicon, app and Apple icons, and the Open Graph image; the `Logo` component uses it (inline, stacked or mark only).
- `compa.lol` landing page in the V2 style: one promise, idle monitos, "you get in only by scanning your event's QR", and a "Back to my event" button for checked-in people. No public sign-up.
- Event door `/e/<code>` (name, live counters, Enter with LinkedIn), check-in screen with the big-screen notice `/e/<code>/join`, and the projected dashboard `/e/<code>/live` (Three.js loom of accepted connections colored new vs reconnection, counters, join QR, leaderboard, person cards; polls every 3 s; 390 to 1920 px).
- Spanish or English by the visitor's first preferred language (`lib/i18n.ts`, `lib/copy/en.ts`) for the landing and event-entry screens.
- Guided onboarding: a spotlight tour that dims everything but one button and explains it, per screen and replayable from the profile; incoming connection requests on home with 3 s polling and a live bell; the confirmation screen refreshes when the other person answers; the personal QR link survives sign-in; home works outside an event; app icon.
- Profile pictures default to the LinkedIn photo, copied to Supabase Storage at sign-in because LinkedIn URLs expire; the monito is a choice on the monito screen (captain decision). Migration `0003_avatar_mode` adds `users.avatar_mode`.

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
