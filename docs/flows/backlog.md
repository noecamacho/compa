# Build backlog (agent-ready tickets)

Date: 2026-10-29 · Ticket: `COMPA-<TBD>` · Baseline: `main` @ `617cb93` · How to pick and ship a ticket: [README](README.md).

Every Missing, Partial or Mock-only cell in the [flow catalog](catalog.md) maps to at least one ticket here, and every risk in [edge cases and risks](edge-cases-and-risks.md) names its ticket. Missing CRUD operations come from [actors and permissions](actors-and-permissions.md#4-missing-crud-operations).

Legend:

- **Priority.** **P0** blocks the demo or makes production unsafe. **P1** is needed for a real launch. **P2** comes later.
- **Type.** backend, ui, db, infra, docs or design.
- **Lane.** The plan's lanes (`wiki/team-and-prs.md`): scaffold, profile+QR, connections+points, summaries, live+seeds, plus **captain** for decisions.
- **IP** means in progress on another branch. Do not start an IP ticket. Review that branch instead, and pick up only the "Remaining after the branch" bullets once it merges.
  - `landing` is `feat/COMPA-TBD-landing-gated-events`: the compa.lol landing, `/e/<code>`, `/e/<code>/live`, code-gated `/api/e/{code}/*`, admin code rotation and minimal es/en i18n.
  - `real-mode` is `fix/COMPA-TBD-real-mode-routes`: real `/api/connections/{id}`, `/api/badges`, `/api/invites/me` and invite claim, `users.city`, `avatar` and `avatar_mode`, the LinkedIn photo copied to Storage, the lifetime leaderboard and a resilient Home and Ranking.
  - Neither branch is pushed. Both are local worktrees, read on 2026-10-29.
- **Effort.** **S** < 1 h, **M** 1–3 h, **L** > 3 h.
- **E2E.** Captain requirement, 2026-10-29: every ticket depends on [T-000](#t-000) and ships Playwright specs for the flows it touches: the happy path, every edge case and every error state listed for those flows in the [catalog](catalog.md). Each ticket's **E2E** line names the spec file and the scenarios that must pass. "N/A" appears only for tickets with no user-facing behavior, and those still need unit tests. Harness conventions are in the [README](README.md#e2e-tests).

## Summary

| Epic | Tickets | P0 | P1 | P2 | IP |
| --- | --- | --- | --- | --- | --- |
| [E0 Platform and release](#e0-platform-and-release) | T-000–T-009 | 4 | 4 | 2 | 0 |
| [E1 Onboarding and auth](#e1-onboarding-and-auth) | T-010–T-016 | 2 | 5 | 0 | 2 |
| [E2 Events, check-in and consent](#e2-events-check-in-and-consent) | T-020–T-029 | 3 | 3 | 4 | 3 |
| [E3 Connect and request lifecycle](#e3-connect-and-request-lifecycle) | T-030–T-044 | 2 | 9 | 4 | 1 |
| [E4 Summaries and AI](#e4-summaries-and-ai) | T-050–T-057 | 0 | 4 | 4 | 0 |
| [E5 Profiles, connections list and visibility](#e5-profiles-connections-list-and-visibility) | T-060–T-066 | 0 | 4 | 3 | 0 |
| [E6 Badges, ranking and invites](#e6-badges-ranking-and-invites) | T-070–T-078 | 0 | 6 | 3 | 3 |
| [E7 Notifications and realtime](#e7-notifications-and-realtime) | T-080–T-081 | 0 | 1 | 1 | 0 |
| [E8 Big screen](#e8-big-screen) | T-090–T-093 | 1 | 2 | 1 | 1 |
| [E9 Account, privacy and moderation](#e9-account-privacy-and-moderation) | T-100–T-105 | 0 | 2 | 4 | 0 |
| [E10 i18n, accessibility, resilience and layout](#e10-i18n-accessibility-resilience-and-layout) | T-110–T-114 | 0 | 5 | 0 | 1 |
| [E11 Docs and decisions](#e11-docs-and-decisions) | T-120–T-122 | 0 | 3 | 0 | 0 |
| **Total: 86 tickets** | | **12** | **48** | **26** | **11** |

Each IP ticket also carries a priority, and it is counted in that priority column as well. The IP tickets are T-010, T-015, T-020, T-022, T-025, T-030, T-070, T-072, T-074, T-090 and T-110.

## Top 10 (P0 and P1, in suggested order)

| # | Ticket | Why |
| --- | --- | --- |
| 1 | [T-000](#t-000) Set up the Playwright e2e harness | Captain requirement: every other ticket's definition of done needs it |
| 2 | [T-001](#t-001) Resolve the `0002` migration collision | Both in-flight branches add `drizzle/0002_*`; the second merge breaks `db:migrate` |
| 3 | [T-030](#t-030) Real `GET /api/connections/{id}` (IP) | Blocks 06, 06b, 08b and the "request sent" screen |
| 4 | [T-025](#t-025) Home and Ranking must not crash (IP) | `/api/invites/me` 501 and the hard-coded `founders-fest` crash Home in real mode |
| 5 | [T-031](#t-031) An entry to incoming requests, plus polling | No UI links to `/requests/[id]`; addressees never learn about a request |
| 6 | [T-021](#t-021) Ask for screen consent before sending `screenConsent: true` | Consent is recorded without being asked (M13) |
| 7 | [T-011](#t-011) Keep the deep link through sign-in | Signed-out `/u/<handle>` loses the handle (A1 broken) |
| 8 | [T-020](#t-020) Gated event door `/e/<code>` (IP) | Events are reachable only by QR; check-in has no page on `main` |
| 9 | [T-003](#t-003) Deploy workflow keeps rollback targets and gates on checks | The workflow deletes every older deployment, so "revert first" cannot use Vercel rollback |
| 10 | [T-036](#t-036) Per-user rate limits | No cap on scans, transcription or drafts: spam and OpenAI cost |

---

## E0 Platform and release

<a id="t-000"></a>
### T-000 · Set up the Playwright e2e harness

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| infra | **P0** | scaffold | — | M |
- **State:** Done. `@playwright/test`, `playwright.config.ts`, the fixtures in `e2e/fixtures/`, `e2e/smoke.spec.ts`, the test-only `compa-mock-error` cookie and `.github/workflows/e2e.yml`. WebKit runs in CI; real-mode specs run once the captain configures the test project (`docs/flows/README.md` "E2E tests").

- **E2E:** `e2e/smoke.spec.ts` is the first spec. Scenarios: in mock mode the landing renders, a mocked `/api/me` renders `/home`, and `x-compa-mock-error: not_pending` on accept shows the error state. One real-mode test signs in the seeded user and opens `/me`.
- **Files:** `package.json` (`@playwright/test` as a dev dependency, plus the scripts `e2e` = `bunx playwright test` and `e2e:install` = `bunx playwright install --with-deps chromium webkit`), new `playwright.config.ts`, `e2e/fixtures/*.ts`, `e2e/smoke.spec.ts`, new `.github/workflows/e2e.yml`, `.gitignore` (`playwright-report/`, `test-results/`), `.env.example` (variable names only).
- **Acceptance:**
  - `playwright.config.ts` has projects:
    - `mobile-390`: 390×844, `isMobile`, `hasTouch`, WebKit and Chromium.
    - `tablet-834`: 834×1194.
    - `desktop-1440`: 1440×900.
    - `live-1920`: 1920×1080, only for `e2e/live/**`.
  - Each project runs in both locales: `locale: "es-MX"` with `Accept-Language: es-MX`, and `locale: "en-US"`. A `reducedMotion: "reduce"` variant runs on `mobile-390`.
  - `baseURL` comes from `E2E_BASE_URL` and defaults to `http://localhost:3000`. `webServer` starts `bun run dev` when no base URL is given. `E2E_BASE_URL=https://compa.lol` runs only tests tagged `@prod`, which are read-only.
  - Fixtures:
    - `mock`: sets `x-compa-mock: 1` on every API request the browser makes, and exposes `mockError(code)`, `mockStatus(n)` and `mockExample(name)`. They set the `x-compa-mock-error`, `x-compa-mock-status` and `x-compa-mock-example` headers through `context.setExtraHTTPHeaders`, or `page.route` for one URL (`docs/api-quickstart.md`).
    - `realUser`: creates or reuses a seeded test user through the Supabase Admin API with the service-role key, mints a session for it (admin `generateLink` plus `verifyOtp`, or a password user created for tests), and stores the `@supabase/ssr` cookies in `storageState`. **LinkedIn is never called in CI.**
    - `testEvent`: a seeded running event with a known access code. It is reset before each worker.
    - `twoUsers`: two browser contexts for request and accept flows.
  - Error injection into server-rendered pages needs a change, verified in code:
    - `lib/api/server-fetch.ts` forwards only the cookie and `API_MODE`. It never forwards a browser's `x-compa-mock*` headers.
    - `hasSession` (`lib/server/session.ts`) bypasses auth only when `API_MODE=mock`.
    - So mock-mode page specs need a dev server started with `API_MODE=mock`.
    - Client-side calls (`apiCall`) can be intercepted with `page.route` or the mock headers.
    - To inject an error into a server-rendered fetch, forward a test-only `compa-mock-error` cookie from `apiGet` as `x-compa-mock-error`. Honor it only when `API_MODE=mock`, so production never reads it.
  - The CI job `.github/workflows/e2e.yml` runs on `pull_request`:
    - `bun install --frozen-lockfile`, then installs browsers.
    - Mock-mode specs run with `API_MODE=mock`.
    - Real-mode specs run only when a test Supabase project is configured. Those values are captain-held GitHub secrets for a **separate test project**, never production.
  - Artifacts are uploaded on failure: `trace: "retain-on-failure"`, `screenshot: "only-on-failure"`, `video: "retain-on-failure"` and the HTML report.
  - `docs/flows/README.md` "E2E tests" matches the harness as built.
- **Edge cases:**
  - Camera and microphone flows need `--use-fake-device-for-media-stream` and `--use-file-for-fake-video-capture=<qr.y4m>` on Chromium. WebKit gets `permissions: []` for the denied path.
  - Polling flows use `expect.poll` with a 5 s cap, never fixed sleeps.
  - Time-dependent flows use `page.clock`, or a seeded event whose window is in the past or the future.
- **Do not touch:**
  - Production data. Real-mode tests use the test project.
  - The deploy workflow. T-003 adds the gate.
  - Env values. Names go in `.env.example`; values go in Vercel or the captain's secrets.

<a id="t-001"></a>
### T-001 · Resolve the `0002` migration collision between in-flight branches

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db | **P0** | live+seeds | T-000 | S |

- **E2E:** `e2e/smoke.spec.ts`. Scenarios: full smoke suite passes against a database migrated from 0000 to the last migration.
- **Files:** `drizzle/0002_event_access_code.sql` (landing), `drizzle/0002_avatar_city_topics_invites.sql` (real-mode), `drizzle/meta/_journal.json`, `drizzle/meta/0002_snapshot.json`, `drizzle/meta/0003_snapshot.json`.
- **Acceptance:**
  - Whichever branch merges second renames its migration to `0003_*`, regenerates the snapshot with `drizzle-kit generate` on top of the first, and keeps hand edits such as the access-code backfill.
  - `bun run db:migrate` runs clean on a fresh database and on a copy of production.
  - `_journal.json` lists 0000–0003 in order with unique tags.
- **Edge cases:** both snapshots claim `prevId` of 0001, so drizzle-kit would see a fork. The access-code backfill must still run on a non-empty `events` table, because production has `founders-fest`.
- **Do not touch:** `drizzle/0000_init.sql`, `drizzle/0001_v2_points_whatsapp.sql`. Both are applied in production (wiki log 2026-10-29).

<a id="t-002"></a>
### T-002 · Apply merged migrations in production and verify

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| infra | **P0** | live+seeds (captain runs it) | T-000, T-001, T-020, T-030 merged | S |

- **E2E:** `e2e/smoke.spec.ts` (run with `E2E_BASE_URL=https://compa.lol`, read-only tag `@prod`). Scenarios: event door 200, `/api/e/<code>/live` 200, `/api/me` 401 signed out.
- **Files:** none. This is an operation, logged in `wiki/log.md`.
- **Acceptance:**
  - The production schema has `events.access_code`, `users.city`, `users.avatar`, `users.avatar_mode`, `connections.topics`, `invites` and `invite_claims`.
  - `GET https://compa.lol/api/e/<code>` returns 200 for the demo event.
  - The admin user is promoted (`SEED_ADMIN_HANDLE`).
  - Interests are seeded from the agreed list (T-051).
- **Edge cases:** the deploy reaches production before the migration runs, so code reads a missing column and returns 500. Run the migration first, or ship code that tolerates both schemas.
- **Do not touch:** env values. They live only in Vercel (captain decision).

<a id="t-003"></a>
### T-003 · Deploy workflow: keep rollback targets and gate on lint, typecheck and tests

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| infra | **P0** | scaffold | T-000 | S |

- **E2E:** no spec of its own; the workflow is the check. Scenarios: a PR with a failing e2e spec cannot merge or deploy, and the trace and screenshots are uploaded as artifacts.
- **Files:** `.github/workflows/vercel.yml`, optionally a new `.github/workflows/checks.yml`.
- **Acceptance:**
  - The "Keep only the new deployment" step keeps the newest 3 production deployments, not 1, so Vercel Instant Rollback has a target.
  - `bun run lint`, `bun run typecheck` and `bun test` run before `vercel build`, and a failure stops the deploy.
  - The same checks run on pull requests without deploying.
- **Edge cases:** concurrent pushes, where `cancel-in-progress` already applies. The deployment cleanup must never delete the deployment that is currently aliased.
- **Do not touch:** production-only deploys (no previews), a captain decision. Secrets stay `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.

<a id="t-004"></a>
### T-004 · Error boundaries, not-found pages and loading skeletons

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | scaffold | T-000, T-111 (copy keys) | M |

- **E2E:** `e2e/system/resilience.spec.ts`. Scenarios: mock `x-compa-mock-status: 500` on a page fetch shows the localized error and Retry; unknown route shows not-found; skeleton visible while a delayed route resolves.
- **Files:** new `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `app/(app)/error.tsx`, `app/(app)/**/loading.tsx`.
- **Acceptance:**
  - A thrown `apiGet` shows a localized error with Retry (`reset()`), not the Next.js default page.
  - Every `(app)` route shows a skeleton in its final layout while it loads (DESIGN.md "States per screen").
  - A 401 inside an `(app)` page sends the person to `/auth/linkedin?next=<path>` (see T-006).
- **Edge cases:** an error thrown in `layout.tsx` needs `global-error.tsx`. Never show a raw stack trace or the API `message`.
- **Do not touch:** the `apiGet` and `apiGetOrNull` contract (`lib/api/server-fetch.ts`). Pages rely on 404 → `null`.

<a id="t-005"></a>
### T-005 · Security headers, Origin check and production mock gating

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| infra | P1 | scaffold | T-000 | S |

- **E2E:** `e2e/system/headers.spec.ts`. Scenarios: CSP, nosniff, Referrer-Policy, Permissions-Policy present on `/`, `/home`, `/e/<code>/live`; camera still works on `/connect?tab=scan` under the CSP.
- **Files:** `next.config.ts` (`headers()`).
- **Acceptance:**
  - Responses carry a `Content-Security-Policy` allowing self, Supabase (REST and Realtime), LinkedIn and Supabase Storage images, and the Google Fonts that `next/font` self-hosts.
  - They also carry `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`.
  - `frame-ancestors 'none'` applies everywhere except where the captain wants `/e/<code>/live` embeddable.
  - `Permissions-Policy` reads `camera=(self), microphone=(self), geolocation=()`.
  - A `curl -sI https://compa.lol/` test shows the headers. Today only `strict-transport-security` is present (probed 2026-10-29).
  - State-changing API routes reject a request whose `Origin` is present and is not the site origin, returning 403 `forbidden` (risk R-32, defense in depth on top of `SameSite=Lax`).
  - The `x-compa-mock*` headers and `?mock=1` are honored only when `API_MODE=mock` or `VERCEL_ENV` is not `production` (risk R-36). The `/api/docs` "try it" panel keeps working through an explicit docs flag.
- **Edge cases:** the Scalar docs at `/api/docs` load a CDN script, so give them their own CSP. `qrcode` returns an inline SVG, and `style-src` must allow it.
- **Do not touch:** the HSTS that Vercel sets.

<a id="t-006"></a>
### T-006 · Session refresh and 401 → re-auth with `next`

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | P1 | scaffold | T-000 | M |

- **E2E:** `e2e/account/session.spec.ts`. Scenarios: expired access token is refreshed on navigation; a 401 from a client call redirects to `/auth/linkedin?next=<path>`.
- **Files:** new `proxy.ts` (Next 16, formerly `middleware.ts`), `lib/server/supabase.ts`, `app/(app)/layout.tsx`, `lib/api/client.ts`.
- **Acceptance:**
  - The Supabase session cookie is refreshed on navigation (`@supabase/ssr` pattern). [Inference: today no proxy or middleware exists, and Server Components cannot write cookies, so an expired access token is not refreshed until a route handler runs.]
  - A client `apiCall` that gets 401 redirects to `/auth/linkedin?next=<current path>`.
  - The mock-mode bypass in `hasSession` is kept.
- **Edge cases:** a refresh token was revoked, for example after sign-out elsewhere (T-105). A sign-in started in an in-app browser on the LinkedIn app (cookie jar differs).
- **Do not touch:** `safeNext` rules (`lib/server/auth-routes.ts`).

<a id="t-007"></a>
### T-007 · Observability and alerting

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| infra | P1 | scaffold | T-000 | M |

- **E2E:** N/A (logs and alerts); a unit test asserts the log line shape and the absence of PII.
- **Files:** `lib/api/define-route.ts` (one structured log line per request: route id, status, duration, error code, never PII), `lib/ai/*.ts` (latency, failures, token usage), plus Vercel log drain or alert config, documented in `docs/`.
- **Acceptance:**
  - A 5xx rate above 2 % over 5 min alerts the captain.
  - OpenAI failures (`transcription_failed`, `summary_failed`) are counted.
  - `console.error` calls carry the route id.
- **Edge cases:** do not log transcripts, summaries, emails or LinkedIn claims.
- **Do not touch:** response shapes.

<a id="t-008"></a>
### T-008 · Backups and restore drill

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| infra | P2 | live+seeds | T-000 | S |

- **E2E:** N/A (operational drill).
- **Acceptance:**
  - The Supabase plan's backup or PITR setting is recorded in `docs/`.
  - One restore to a scratch project is done and logged.
  - The `avatars` Storage bucket is covered or declared reproducible from LinkedIn.
- **Do not touch:** production data during the drill.

<a id="t-009"></a>
### T-009 · Privacy-respecting product analytics

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| infra | P2 | scaffold | T-000, T-102, OQ #55 | M |

- **E2E:** `e2e/system/analytics.spec.ts`. Scenarios: funnel events fire once per step with no PII in the payload; nothing fires before consent when consent is required.
- **Acceptance:** funnel events (landing → sign-in → check-in → first request → first accept → note approved) are counted with no PII. They feed the plan's success metrics (`wiki/success-metrics.md`). Cookie-less, or with consent per T-102.
- **Do not touch:** API payloads.

---

## E1 Onboarding and auth

<a id="t-010"></a>
### T-010 · Landing for everyone, with "Back to my event" (IP: landing)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | **P0** | scaffold | T-000 | M |

- **E2E:** `e2e/onboarding/landing.spec.ts`. Scenarios: signed out: no sign-up button; signed in with a current event: "Back to my event"; signed in without one: the T-025 destination; es and en copy.
- **Branch:** `feat/COMPA-TBD-landing-gated-events` (`app/page.tsx`, `components/landing/Crowd.tsx`; `components/welcome/Welcome.tsx` deleted).
- **Acceptance:** compa.lol shows the landing to everyone, with no sign-up button. A signed-in person with a current event sees "Back to my event".
- **Remaining after the branch:** `/?error=linkedin` needs a place to show its message now that `Welcome` is gone (T-012). A signed-in person without a current event needs a destination (T-025).

<a id="t-011"></a>
### T-011 · Keep the deep link through sign-in

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | **P0** | profile+QR | T-000 | S |

- **E2E:** `e2e/onboarding/deep-links.spec.ts`. Scenarios: signed-out `/u/<handle>`, `/e/<code>`, `/i/<code>` and `/connections` redirect to `/auth/linkedin?next=…` with the path kept; `next=//evil.com` falls back.
- **Files:** `app/(app)/layout.tsx`, `app/(app)/u/[handle]/page.tsx`, `lib/server/session.ts`. Read the `x-pathname` header set by T-006's proxy, or move `/u/[handle]` out of `(app)`.
- **Acceptance:**
  - A signed-out visitor opening `/u/<handle>` goes to `/auth/linkedin?next=/connect/<handle>` and lands on 05 after LinkedIn. Today it is 307 → `/` and the handle is lost (probed 2026-10-29).
  - The same applies to any `(app)` path.
  - `next` still passes `safeNext`.
- **Edge cases:** the handle does not exist, so after sign-in 05 shows not found. The visitor cancels LinkedIn (F-04). The visitor is mid-onboarding: first finish 02 and 02b, then continue to `next` (T-014).
- **Do not touch:** the `/i/<code>` redirect shape. T-075 uses it.

<a id="t-012"></a>
### T-012 · LinkedIn error states: cancel, denied, invalid scope, sync failure

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | scaffold | T-000, T-010, T-111 | S |

- **E2E:** `e2e/onboarding/signin.spec.ts`. Scenarios: `/auth/callback?error=user_cancelled_login`, `access_denied`, `invalid_scope` and a sync failure each show their copy and a retry that keeps `next`.
- **Files:** `lib/server/auth-routes.ts` (`authCallback`, `failedSignIn`), `lib/api/schemas.ts` (`CallbackQuery`), the landing page, `lib/copy/*`.
- **Acceptance:**
  - The callback maps the provider `error` to `/?error=<reason>`, with reason one of:
    - `cancelled`: `user_cancelled_login` or `user_cancelled_authorize`.
    - `denied`: `access_denied`.
    - `scope`: `invalid_scope` or `unauthorized_scope_error`.
    - `sync`: `upsertLinkedInUser` threw.
    - `unknown`: anything else.
  - Each reason has a localized copy key and a retry that keeps `next`.
  - Today every case is `?error=linkedin` (probed: `/auth/callback?error=access_denied` → `/?error=linkedin`).
- **Edge cases:** the person declines email. Email is nullable, so they must still be able to sign in. A LinkedIn account without a photo. A double click on the LinkedIn button creates two PKCE verifiers.
- **Do not touch:** the requested scopes. Supabase already requests `openid profile email` (PR #19).

<a id="t-013"></a>
### T-013 · Honest prefill copy and empty-field placeholders

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui+copy | P1 | profile+QR | T-000, T-015 | S |

- **E2E:** `e2e/onboarding/profile.spec.ts`. Scenarios: a user with only name and photo sees empty job title, company and city with placeholders; the welcome note does not promise job title or city.
- **Files:** `lib/copy/es.ts` (`welcome.noteCreate` says "Tomamos tu nombre, puesto, empresa y ciudad"), `lib/copy/en.ts`, `components/profile/ProfileForm.tsx`.
- **Acceptance:**
  - Copy says LinkedIn gives name, photo and email only. LinkedIn OIDC provides only `name`, `email`, `picture` and `locale` (captain decision; OQ #33).
  - Job title, company and city show placeholders and are optional.
- **Edge cases:** `name` falls back to "COMPA" when LinkedIn sends none (`lib/server/linkedin.ts`), so prompt the person to edit it.
- **Do not touch:** M14 sync rules.

<a id="t-014"></a>
### T-014 · Returning-user routing and onboarding completion

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db+backend+ui | P1 | profile+QR | T-000, T-010, T-011 | M |

- **E2E:** `e2e/onboarding/profile.spec.ts`. Scenarios: first sign-in goes 02 → 02b → next; returning user skips; abandoned onboarding resumes at 02.
- **Files:** `db/schema.ts` (`users.onboarded_at timestamptz null`), a new migration, `lib/server/profile.ts`, `lib/api/schemas.ts` (`Me.onboarded`), `app/(app)/layout.tsx` or the onboarding pages.
- **Acceptance:**
  - A first sign-in goes to 02 → 02b, then to `next`.
  - A returning person skips onboarding.
  - Finishing 02b sets `onboarded_at`.
  - A person who abandoned onboarding resumes at 02.
- **Edge cases:** a deep link (`/u/<handle>`) during the first sign-in. Do we force onboarding first? Recommendation: 02 only (name and consent), then the deep link.
- **Do not touch:** `?from=me` edit flows.

<a id="t-015"></a>
### T-015 · City, avatar, avatar mode and LinkedIn photo copy (IP: real-mode)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db+backend | P1 | profile+QR | T-000, T-001 | M |

- **E2E:** `e2e/onboarding/monito.spec.ts`, `e2e/profiles/me.spec.ts`. Scenarios: city saved and shown; monito look persists after reload; avatar mode photo vs monito switches the avatar everywhere.
- **Branch:** `fix/COMPA-TBD-real-mode-routes`. Adds `users.city`, `avatar`, `avatar_mode` (`photo` by default, `monito` optional) and `lib/server/avatar-storage.ts`, which copies the LinkedIn photo to the Supabase Storage `avatars` bucket.
- **Remaining after the branch:** a size cap and content-type check on the copy. Cleanup on account deletion (T-100). Re-copy when LinkedIn sync changes the photo. A license note for LinkedIn photos (risk [R-14](edge-cases-and-risks.md)).

<a id="t-016"></a>
### T-016 · Harden `photoUrl` and link writes

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | P1 | profile+QR | T-000, T-015 | S |

- **E2E:** `e2e/profiles/me.spec.ts`. Scenarios: PATCH with a foreign `photoUrl` → 400 `invalid_input` shown per field; a LinkedIn link pointing to another host is refused.
- **Files:** `lib/api/schemas.ts` (`PatchMeBody.photoUrl`, `links`), `lib/links.ts`.
- **Acceptance:**
  - `photoUrl` accepts only `https:` URLs on the Supabase Storage origin, or is removed from `PatchMeBody` in favor of an upload route.
  - Today it accepts any `z.url()` up to 500 characters, and that image is shown on the public big screen.
  - A network link must match its network's host (`linkedin.com`, `x.com`, `instagram.com`, `wa.me`). `web` must be `https:`.
- **Edge cases:** existing rows with foreign URLs, which need a read-time fallback to the monito.
- **Do not touch:** `normalizeLink` behavior for `@handle` input.

---

## E2 Events, check-in and consent

<a id="t-020"></a>
### T-020 · Gated event door `/e/<code>` with the screen-consent notice (IP: landing)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db+backend+ui | **P0** | live+seeds | T-000, T-001 | L |

- **E2E:** `e2e/events/door.spec.ts`. Scenarios: valid code → notice → check-in → Home; unknown or malformed code → not-found; signed-out door → LinkedIn with `next`; repeat check-in is idempotent; `event_not_running` before start and after end.
- **Branch:** `feat/COMPA-TBD-landing-gated-events`. It adds:
  - `events.access_code` (M19, migration `0002_event_access_code.sql`) and `lib/access-code.ts`, which generates 10 characters without look-alikes.
  - The `app/e/[code]/` pages `page.tsx`, `join/page.tsx` and `not-found.tsx`, plus `components/event/JoinConsent.tsx`.
  - `/api/e/{code}/*`, renamed from `/api/events/{slug}/*`, and `lib/server/event-door.ts` and `current-event.ts`.
- **Remaining after the branch:**
  - The OpenAPI and `docs/api-quickstart.md` need updates (T-122). `docs/specs` needs an M19 entry.
  - `RegisterForm` still sends consent blindly (T-021).
  - Data-model spec §4.7 says scans need no event QR (A1). Confirm that auto check-in by personal QR still bypasses the code, or document the change (OQ #54).

<a id="t-021"></a>
### T-021 · Ask for screen consent before sending `screenConsent: true`

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | **P0** | connections+points | T-000, T-020 (reuse `JoinConsent`) | S |

- **E2E:** `e2e/connect/register.spec.ts`. Scenarios: not checked in → `consent_required` → notice → retry succeeds; declining the notice sends nothing; already checked in → no notice.
- **Files:** `components/connect/RegisterForm.tsx` (hard-codes `screenConsent: true`), `lib/copy/*`.
- **Acceptance:**
  - The first `POST /api/connections` omits `screenConsent`.
  - On `409 consent_required`, the screen notice (M13) appears, and Accept retries with `screenConsent: true`.
  - A person already checked in never sees the notice.
  - A unit test covers the retry.
- **Edge cases:** the person declines the notice. Stay on 05 with an explanation; no request is sent. A double tap during the retry.
- **Do not touch:** the server rule in `checkInScanner` (`lib/server/connections.ts`).

<a id="t-022"></a>
### T-022 · Admin access-code rotation (IP: landing)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | P1 | live+seeds | T-000, T-020 | S |
- **State:** UI added on `feat/COMPA-TBD-super-admin-test-harness`: "Rotate code" on `/admin/events/<slug>` warns that printed QR codes stop working.

- **E2E:** `e2e/admin/events.spec.ts`. Scenarios: rotate → old code door 404, new code works; non-admin gets 403.
- **Branch:** `app/api/admin/events/[slug]/rotate-code/route.ts`.
- **Remaining after the branch:** a UI for it (T-023). Decide whether old codes keep working for people already checked in. Recommendation: yes, because check-in is stored and the code only gates the door. Printed QR codes become invalid on rotation, so the console must say so (OQ #54).

<a id="t-023"></a>
### T-023 · Admin event console: list, create, edit, end early, print QR, archive

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | live+seeds | T-000, T-020, T-022, OQ #56 | L |
- **State:** Ready on `feat/COMPA-TBD-super-admin-test-harness` (2026-10-29), pending review. `/admin`, `/admin/events/new`, `/admin/events/<slug>` and the `GET`/`PATCH /api/admin/events…`, `…/end`, `…/archive`, attendee and organizer routes. Captain change: non-super-admins get **404**, not 403 (API spec A11). Archive is `events.status = 'archived'`, not `archived_at`. E2E spec still to write once T-000 lands.

- **E2E:** `e2e/admin/events.spec.ts`. Scenarios: create, edit window, end now (pending request then shows expired), archive; validation errors; non-admin 403.
- **Files:**
  - New routes `GET /api/admin/events`, `PATCH /api/admin/events/{slug}` (name, window, end now) and `DELETE /api/admin/events/{slug}` (archive: soft delete with `events.archived_at`).
  - A new `/admin/events` page with plain styling (DESIGN.md "Surfaces").
  - `lib/api/routes.ts`, `lib/api/schemas.ts`, `lib/server/events.ts`.
- **Acceptance:**
  - Admins only (`requireAdmin`).
  - "End now" sets `ends_at = now()`, so pending requests read as expired (`statusForViewer`).
  - Editing the window validates `ends_at > starts_at` (DB check `events_window_check`).
  - The QR shows `compa.lol/e/<code>` at print size.
  - Non-admins get 403 `forbidden`.
- **Edge cases:**
  - Moving `ends_at` into the past while people are mid-scan, so they hit `event_ended`.
  - Hard delete is refused when connections exist: FK cascade would erase everyone's points.
  - Concurrent edits: last write wins, which is acceptable for admins.
- **Do not touch:** `POST /api/admin/events` contract (keep compatible).

<a id="t-024"></a>
### T-024 · Event time zone and window rules

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db+backend+ui | P1 | live+seeds | T-000, OQ #22 | M |
- **State:** Partial on `feat/COMPA-TBD-super-admin-test-harness`: `events.timezone` (IANA, default `America/Mexico_City`) and an event schedule exist and the admin console types times in the event zone. Attendee screens and `Me.currentEvent` do not use it yet.

- **E2E:** `e2e/events/window.spec.ts`. Scenarios: end time shows in the event time zone with `timezoneId` set to another zone; before-start check-in behaves per OQ #22.
- **Files:** `db/schema.ts` (`events.time_zone text not null default 'America/Mexico_City'`), a migration, `lib/format.ts` (hard-codes `es-MX`), `lib/server/events.ts`, `Me.currentEvent` (add `endsAt` and `timeZone`).
- **Acceptance:**
  - "Hasta las 22:00" shows in the event's time zone with the UI locale.
  - Check-in before `starts_at` follows the decision in OQ #22. Today it is refused with `event_not_running`.
- **Edge cases:** a DST change during an event. Attendees whose phone is in another zone.

<a id="t-025"></a>
### T-025 · Home, Ranking and Connect outside an event (IP: real-mode, partly)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui+design | **P0** | scaffold | T-000, T-030 | M |

- **E2E:** `e2e/home/home.spec.ts`. Scenarios: `currentEvent: null` shows no LIVE card and the all-year rank; `/api/invites/me` 501 hides the invite card; no request to `founders-fest`.
- **Branch:** real-mode makes Home and Ranking resilient. Landing modifies `app/(app)/home/page.tsx` and `ranking/page.tsx` too, which is a merge-conflict risk.
- **Acceptance:**
  - No page hard-codes `founders-fest` (today `home/page.tsx:23` and `ranking/page.tsx:13`).
  - With `currentEvent: null`, Home hides the LIVE card and shows the all-year rank plus "scan the event QR to join".
  - A 501 or failed invite fetch hides the invite card.
- **Remaining after the branch:** a design for "Home outside an event" (DESIGN.md "Known pending screens").

<a id="t-026"></a>
### T-026 · Leave an event or withdraw screen consent

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P2 | live+seeds | T-000, captain decision | M |

- **E2E:** `e2e/events/check-in.spec.ts`. Scenarios: leave event removes me from `/live` and the leaderboard; the other person keeps their points.
- **Acceptance:** `DELETE /api/e/{code}/check-in` removes me from `/live` and the leaderboard.
- **Edge cases:** I have accepted connections at that event, and the composite FK `connections_*_attendee_fk` cascades on delete, erasing the other person's points. Prefer a `left_at` or `hidden_at` column over a delete.

<a id="t-027"></a>
### T-027 · Multi-event overlap: an explicit current event

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P2 | live+seeds | T-000, T-020 | M |

- **E2E:** `e2e/events/check-in.spec.ts`. Scenarios: two overlapping events: current event is shown and switchable; a scan explains which event the request belongs to.
- **Acceptance:** when two of my events overlap, `findCurrentEvent` (latest check-in wins, `lib/server/people.ts`) is visible to me and switchable. Scanning someone at another overlapping event explains which event the request belongs to.

<a id="t-028"></a>
### T-028 · Seed or demo data toggle for `/live`

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+db | P2 | live+seeds | T-000, OQ #17 | M |
- **State:** Partial on `feat/COMPA-TBD-super-admin-test-harness`: `users.is_test` and `events.is_test` keep test people off real events' live screen, counters and leaderboards (data model M20). No admin toggle for seeds yet.

- **E2E:** `e2e/live/big-screen.spec.ts`. Scenarios: seed toggle hides seed people and their edges; leaderboard excludes seeds.
- **Acceptance:** `users.is_seed` (or a seed event) is excluded from production leaderboards. An admin toggle hides seeds on the big screen (plan p. 13, p. 18).

<a id="t-029"></a>
### T-029 · Admin bootstrap without a database shell

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | P2 | live+seeds | T-000 | S |
- **State:** Superseded in part on `feat/COMPA-TBD-super-admin-test-harness`: migration 0005 promotes the three captains to `super_admin`; `SEED_ADMIN_HANDLE` now sets `role`. No env allowlist.

- **E2E:** `e2e/admin/events.spec.ts`. Scenarios: an allowlisted test user is admin after sign-in; others are not.
- **Acceptance:** an env allowlist (`ADMIN_LINKEDIN_SUBS`, names only in `.env.example`) promotes matching users at sign-in. Today `SEED_ADMIN_HANDLE` needs `bun run db:seed` with DB credentials. Every promotion is logged.

---

## E3 Connect and request lifecycle

<a id="t-030"></a>
### T-030 · Real `GET /api/connections/{id}` (IP: real-mode)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | **P0** | connections+points | T-000, T-001 | M |

- **E2E:** `e2e/requests/pending.spec.ts`, `e2e/requests/accept-decline.spec.ts`. Scenarios: detail renders for requester (pending, never "declined") and addressee; stranger gets 404 `connection_not_found`.
- **Branch:** `lib/connection-detail.ts`, `getConnection` in `lib/server/connections.ts`, and topics stored in `connections.topics`.
- **Remaining after the branch:**
  - Confirm the response hides a decline from the requester (`statusForViewer`).
  - Return `interaction` only per OQ #50.
  - Add a contract test for both directions.

<a id="t-031"></a>
### T-031 · An entry to incoming requests, plus polling

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | **P0** | connections+points | T-000, T-030 | S |
- **State:** Done. The bell links to `/notifications` (T-080) and home polled already; `/connections` now renders incoming on top, `lib/use-poll.ts` pauses on hidden tabs and backs off on errors, and `/requests/[id]` shows the expired copy. `e2e/requests/incoming.spec.ts` (mock mode) covers the bell, the list, polling and the expired copy; `lib/use-poll.test.ts` covers pause and backoff.

- **E2E:** `e2e/requests/incoming.spec.ts`. Scenarios: bell count and link; incoming list on `/connections`; a request created by a second browser context appears within 4 s by polling; expired request shows `event_ended` copy.
- **Files:** `app/(app)/home/page.tsx` (the bell is an `IconButton` without `href`), `components/connections/ConnectionList.tsx` (does not render `incoming`), a new client hook `lib/use-poll.ts`.
- **Acceptance:**
  - The bell links to the first incoming request, or to the notifications list once T-080 exists.
  - `/connections` shows incoming requests on top (A7).
  - `GET /api/connections` is polled every 3 s while the tab is visible (every 30 s once Realtime is joined; conference-scale finding 3) (API spec §8 fallback). Polling pauses on `visibilitychange`.
- **Edge cases:** a request that expires while it is displayed, so `/requests/[id]` gets `event_ended`. Several requests at once. Polling backs off on errors.
- **Do not touch:** Realtime broadcasts on the server.

<a id="t-032"></a>
### T-032 · The scanner's pending screen updates live

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | connections+points | T-000, T-030, T-031 | S |

- **E2E:** `e2e/requests/pending.spec.ts`. Scenarios: requester screen flips to "Connected! +N" within 4 s of acceptance in another context; after decline stays pending; after end shows expired.
- **Files:** `app/(app)/connections/[id]/done/page.tsx`, a small client poller.
- **Acceptance:**
  - On `status: pending`, the page polls `GET /api/connections/{id}` every 3 s.
  - It switches to "Connected! +N" on `accepted`.
  - It shows "expired" after `ends_at`.
  - It never reveals a decline (M8).
- **Edge cases:** the requester leaves and returns later, so the state comes from the server and not from `sessionStorage`.

<a id="t-033"></a>
### T-033 · QR scanning fallback and camera permission

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | profile+QR | T-000 | M |

- **E2E:** `e2e/connect/scan.spec.ts`. Scenarios: camera denied (`permissions: []`) shows the fallback; fake video stream with a QR decodes on WebKit and Chromium; an event QR routes to the door; a foreign QR shows "not a COMPA QR".
- **Files:** `components/connect/ScanPanel.tsx`, a dependency (`jsqr` or `@zxing/browser`, which needs captain approval per AGENTS.md §6).
- **Acceptance:**
  - Browsers without `BarcodeDetector` (iOS Safari [Inference]) decode frames on a canvas.
  - A pre-prompt explains why the camera is needed before `getUserMedia`.
  - The denied state offers name search, Mi QR and "use your phone camera".
  - Camera tracks stop when the tab is hidden.
- **Edge cases:** an event QR (`/e/<code>`) scanned in-app should route to the event door, not to "not found". Any other QR → "This is not a COMPA QR". Low light. Front-only cameras on laptops.

<a id="t-034"></a>
### T-034 · Name search over my current event's attendees

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | profile+QR | T-000, T-020, OQ #39 | M |

- **E2E:** `e2e/connect/search.spec.ts`. Scenarios: prefix and accent-insensitive match; only my event's attendees; me excluded; no current event explained; 429 copy.
- **Files:** new route `GET /api/e/{code}/attendees?q=` (or `/api/people?q=` scoped to my current event), `lib/server/people.ts`, `components/connect/ScanPanel.tsx`. Today the search calls `slugify(query)` as an exact handle lookup.
- **Acceptance:**
  - At least 2 characters. Case- and accent-insensitive prefix match on name.
  - Only attendees checked in to my current event, excluding me.
  - At most 10 results, returning public cards only.
  - Rate-limited (T-036).
- **Edge cases:** homonyms (show headline and company). Blocked users are hidden (T-041). No current event → explain.

<a id="t-035"></a>
### T-035 · Withdraw a pending request

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | connections+points | T-000, T-030, OQ #43 | M |

- **E2E:** `e2e/requests/withdraw.spec.ts`. Scenarios: withdraw 204 then the addressee no longer sees it; withdraw after accept → `not_pending`; addressee cannot withdraw → 403.
- **Files:** new `DELETE /api/connections/{id}` (requester only, pending only), `lib/server/connections.ts`, `lib/api/routes.ts`, the done page.
- **Acceptance:**
  - 204 on success. 403 `forbidden` for the addressee. 409 `not_pending` once answered.
  - The row is deleted, or set to a new `withdrawn` status, per OQ #43, so the pair can try again at the event. The unique index `connections_pair_per_event_uq` blocks a new row otherwise.
  - The addressee's incoming list drops it on the next poll.
- **Edge cases:** a race between withdraw and accept. Lock the row `FOR UPDATE` as accept does.

<a id="t-036"></a>
### T-036 · Per-user rate limits on writes and AI routes

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+infra | P1 | connections+points | T-000, OQ #51 | M |

- **State:** Built (2026-10-29) except the search limit and the e2e spec: limits in `lib/api/rate-limits.ts`, counters in the `rate_limit_counters` table (`drizzle/0007`), the `rateLimit` route option enforced by `defineRoute`, the per-event request cap in `createConnection` and the per-connection draft cap in `draftSummary` (both count stored rows, so only successes count, and return 429 `limit_reached` with no `Retry-After`), copy `common.rateLimited` and `common.limitReached`. The attendee search route (T-034) does not exist yet; add `rateLimit` to it when it lands. The e2e spec waits for the Playwright harness (T-000).
- **E2E:** `e2e/system/rate-limits.spec.ts`. Scenarios: mock `x-compa-mock-error: rate_limited` shows the copy; real mode: the 31st scan in a minute returns 429 with `Retry-After`.
- **Files:** `lib/api/define-route.ts` (a `rateLimit` option on the route spec), `lib/api/errors.ts` (new `429 rate_limited` with `Retry-After`), the store (Upstash or Vercel KV via Marketplace, or a Postgres table).
- **Acceptance:** default limits, adjustable:
  - `POST /api/connections`: 30/min and 300/event per user.
  - `POST /api/transcribe`: 10/min and 60/day.
  - `POST /api/interactions/draft`: 10/min and 5 per connection.
  - The search route: 30/min.
  - The OpenAPI document lists 429.
  - The UI maps `rate_limited` to copy.
- **Edge cases:** shared NAT at a venue, so limit by user id and not by IP for signed-in routes. Public `/live` routes stay cached and are not limited per IP.

<a id="t-037"></a>
### T-037 · Simultaneous mutual scans

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | connections+points | T-000, T-030 | S |

- **E2E:** `e2e/requests/mutual.spec.ts`. Scenarios: two contexts scan each other; the second lands on `/requests/{id}` with Accept; one connection exists.
- **Files:** `lib/api/schemas.ts` (`ConnectionRequest.direction`), `lib/server/connections.ts` (`createConnection`), `components/connect/RegisterForm.tsx`.
- **Acceptance:**
  - When the existing row was sent by the other person and is pending, `POST` returns 200 with `direction: "received"`.
  - The UI routes to `/requests/{id}` so I can accept at once.
  - `knew` and topics from my form are not silently lost: they are sent with the accept.
- **Edge cases:** both tap Confirm within milliseconds. The unique index keeps one row (gap analysis §3).

<a id="t-038"></a>
### T-038 · Fix the "+20 each" copy on 06b

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui+copy | P1 | connections+points | T-000, T-120 | S |

- **E2E:** `e2e/requests/accept-decline.spec.ts`. Scenarios: 06b copy shows +50 for new and +20 for reconnection in es and en.
- **Files:** `lib/copy/es.ts` (`request.bothWin`), `lib/copy/en.ts`.
- **Acceptance:** the copy shows the kind points the server will award (+50 new or +20 reconnection, gap analysis C10), per the ratified table.

<a id="t-039"></a>
### T-039 · Reverse request after a decline

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | P2 | connections+points | T-000, OQ #23 | S |

- **E2E:** `e2e/requests/accept-decline.spec.ts`. Scenarios: after a decline, a reverse scan behaves per OQ #23.
- **Acceptance:** implement the captain's answer to OQ #23. Today the reverse scan returns the declined row with 200, and the scanner sees "pending" forever.

<a id="t-040"></a>
### T-040 · Award topic points (+5) in scores

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db+backend | P1 | connections+points | T-000, T-030 (topics stored), T-120 | M |

- **E2E:** `e2e/connect/register.spec.ts`. Scenarios: with topics, accepted connection credits +5 to the requester only on Home, Ranking and the done page.
- **Files:** `db/schema.ts` (`event_scores` view), a migration, `lib/points.ts` (`topicsPointsFor` is unused on the server).
- **Acceptance:**
  - An accepted connection with at least 1 topic credits +5 to the requester only, per the README.
  - `event_scores` and `lifetime_scores` include it.
  - The done page breakdown matches.
- **Edge cases:** topics on a declined or expired connection score 0. Topics edited after acceptance must not double-award.

<a id="t-041"></a>
### T-041 · Block and unblock a person

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db+backend+ui | P2 | connections+points | T-000, OQ #44 | L |

- **E2E:** `e2e/account/block-report.spec.ts`. Scenarios: blocked person's scan shows not found; hidden from search and profile; unblock restores.
- **Acceptance:**
  - A new `blocks(blocker_id, blocked_id, created_at)` table.
  - `POST /api/blocks` and `DELETE /api/blocks/{userId}`.
  - A blocked person's request fails as `user_not_found`, so the block is not revealed.
  - Blocked people are hidden from search (T-034) and from each other's profile view.
  - The `/people/[handle]` menu offers Block.
- **Edge cases:** an existing accepted connection. Hide the links; keep points per OQ #44.

<a id="t-042"></a>
### T-042 · Report a person

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db+backend+ui | P2 | connections+points | T-000, T-104 | M |

- **E2E:** `e2e/account/block-report.spec.ts`. Scenarios: report form validates reason and length; confirmation shown; admin sees the report.
- **Acceptance:** a new `reports` table and `POST /api/reports` (target user, reason enum, optional text up to 500). Admins see reports (T-104). The reporter gets a confirmation and is never told the outcome.

<a id="t-043"></a>
### T-043 · "We already knew each other" tick on the pending screen

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | connections+points | T-000, T-030 | S |

- **E2E:** `e2e/requests/pending.spec.ts`. Scenarios: knew toggle saves; after acceptance the toggle hides on `not_pending`.
- **Files:** `app/(app)/connections/[id]/done/page.tsx` (pending branch), a client toggle calling `PATCH /api/connections/{id}/knew`. The API is Ready; no UI calls it.
- **Acceptance:** the toggle saves and shows its state. On `409 not_pending` it hides, because the request was answered.

<a id="t-044"></a>
### T-044 · Remove an accepted connection

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P2 | connections+points | T-000, OQ #44 | M |

- **E2E:** `e2e/connections/list.spec.ts`. Scenarios: removing an accepted connection re-hides connections-only links on both sides; points per OQ #44.
- **Acceptance:** a member can hide an accepted connection, which re-hides their connections-only fields. Points for both stay or go per OQ #44. `/live` history keeps the edge or drops it consistently.

---

## E4 Summaries and AI

<a id="t-050"></a>
### T-050 · Summary points: the author only, or both

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db | P1 | summaries | T-000, T-120 (#29) | S |

- **E2E:** `e2e/summaries/note.spec.ts`. Scenarios: approve credits +15 to the author only (or both, per #29) on Ranking for both users.
- **Files:** `db/schema.ts` (`event_scores` credits approved interactions to both members), a migration.
- **Acceptance:** the view credits `SUMMARY_POINTS` to `interactions.author_id` only, if V2 "+15 to the author" is ratified. The route description, the view and the UI agree (gap analysis U34).

<a id="t-051"></a>
### T-051 · A single topic vocabulary from `interests`, with a neutral prompt

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | summaries | T-000, OQ #38 | M |

- **E2E:** `e2e/connect/register.spec.ts`, `e2e/summaries/note.spec.ts`. Scenarios: register chips equal `/api/interests`; AI topics are from the same list; labels localized in es and en.
- **Files:**
  - `lib/topics.ts` is a JavaScript-conference list. Production `/api/interests` returns React, Next.js, Vue… (probed).
  - `lib/ai/prompt.ts` says "at a JavaScript conference".
  - `lib/ai/summary-schema.ts`, `lib/copy/es.ts` (`register.topics` is a separate free list) and `db/seed.ts`.
- **Acceptance:**
  - The founders list is seeded into `interests`.
  - Register chips, profile interests and AI topics all read it.
  - A test asserts that the AI enum equals the seeded slugs.
  - Labels are localized by slug (DESIGN.md i18n).
- **Edge cases:** existing `user_interests` rows pointing at removed interests. Map them, or keep the rows.

<a id="t-052"></a>
### T-052 · AI cost controls

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+infra | P1 | summaries | T-000, T-036 | M |

- **E2E:** `e2e/summaries/note.spec.ts`. Scenarios: transcribe without a membership → 404; the sixth draft on a connection → 429 copy.
- **Files:** `lib/server/summaries.ts`, `lib/api/schemas.ts` (`TranscribeBody` gains `connectionId`), `lib/ai/openai.ts`.
- **Acceptance:**
  - `POST /api/transcribe` requires a connection where I am requester or addressee. Today any signed-in user may transcribe anything.
  - At most 5 drafts per connection per author.
  - A monthly spend alert is set in the OpenAI console and documented.
  - `max_output_tokens` is set on the draft call.
- **Edge cases:** the 05 note is recorded before the connection exists. Allow the transcribe with the pending connection id (OQ #30) or after the POST.

<a id="t-053"></a>
### T-053 · Edit or delete my summary

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | summaries | T-000, T-030, OQ #49 | M |

- **E2E:** `e2e/summaries/note.spec.ts`. Scenarios: author edits an approved summary without new points; delete removes it; non-author sees no edit controls and gets 403 `not_author`.
- **Files:** new `PATCH /api/interactions/{id}` (author only: summary, topics, next steps) and `DELETE /api/interactions/{id}`, `lib/server/summaries.ts`, `components/record/NoteEditor.tsx`.
- **Acceptance:**
  - The author can edit an approved summary without re-awarding points.
  - Delete removes it, and the points go per OQ #49.
  - The non-author cannot edit (403 `not_author`).
- **Edge cases:** the partial unique index `interactions_one_approved_uq`. Delete, then the other member drafts.

<a id="t-054"></a>
### T-054 · Keep the 05 voice note on the server before acceptance

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+db | P2 | summaries | T-000, OQ #30 | M |

- **E2E:** `e2e/connect/voice-note.spec.ts`. Scenarios: note recorded on 05 survives a new tab and is drafted after acceptance; deleted after expiry.
- **Acceptance:**
  - The transcript is stored with the pending connection, author-only. Today it lives in `sessionStorage` (`lib/note-draft.ts`), lost on a new tab, a device switch or private mode.
  - It is drafted on acceptance.
  - It is deleted on expiry or decline.

<a id="t-055"></a>
### T-055 · PII and hallucination guardrails

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P2 | summaries | T-000 | S |

- **E2E:** `e2e/summaries/note.spec.ts`. Scenarios: "generated by Compa" label and transcript visible before Approve (mock draft example).
- **Files:** `lib/ai/prompt.ts`, `components/record/NoteEditor.tsx`.
- **Acceptance:**
  - The prompt forbids adding facts not in the note, and drops phone numbers, emails and sensitive categories (health, religion, politics) unless the note states them as the topic.
  - The UI shows "Resumen generado por Compa" and the author's transcript before Approve.
  - Tests cover a note with a phone number.

<a id="t-056"></a>
### T-056 · "Recordar" follow-up and title

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P2 | summaries | T-000, OQ #41 | M |

- **E2E:** `e2e/summaries/note.spec.ts`. Scenarios: "Recordar" either absent or creates a reminder that shows in notifications.
- **Acceptance:**
  - The "Recordar" button, rendered today with no handler (`NoteEditor.tsx:215`), is either removed or creates a reminder.
  - The title is derived from the first sentence; the follow-up comes from `nextSteps[0]` (gap analysis C11).

<a id="t-057"></a>
### T-057 · Retention for unapproved drafts

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+infra | P2 | summaries | T-000, T-103 | S |

- **E2E:** N/A (cron); a unit test covers the selection query.
- **Acceptance:** a daily Vercel Cron deletes `interactions` with `approved_at is null` older than 7 days. Every draft call inserts a row, so drafts grow without bound.

---

## E5 Profiles, connections list and visibility

<a id="t-060"></a>
### T-060 · Fill scores, stats, relationship, last interaction, type and topics

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | P1 | profile+QR | T-000, T-030, T-070 | M |

- **E2E:** `e2e/profiles/me.spec.ts`, `e2e/profiles/other.spec.ts`, `e2e/connections/list.spec.ts`. Scenarios: real points, rank, stats, last interaction and type after a seeded accepted connection.
- **Files:** `lib/server/profile.ts` (`buildMe`, `getUser`), `lib/server/connections.ts` (`listConnections`), `lib/api/schemas.ts`.
- **Acceptance:**
  - `Me.scores`, `Me.stats` and `Me.badges` are filled.
  - `UserProfile.scores`, `relationship` and `lastInteraction` are filled.
  - `ConnectionList.people[].type` ("friend" ≥ 3 reconnections, or dropped per OQ #40) and `topics` are filled.
  - Pages show real numbers, not 0 or "—" (gap analysis U19, U20, U23).

<a id="t-061"></a>
### T-061 · Connections search, kind filter and event chip

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | profile+QR | T-000, T-060 | S |

- **E2E:** `e2e/connections/list.spec.ts`. Scenarios: search by name and company; kind filter; event chip; empty-result copy.
- **Files:** `app/(app)/connections/page.tsx` (the search `IconButton` and event `Chip` do nothing), `components/connections/ConnectionList.tsx`.
- **Acceptance:**
  - Client-side search by name or company.
  - The kind filter works with real `type`, or the Amigo chip is hidden.
  - The event chip filters meetings by event.
  - An empty result shows copy.

<a id="t-062"></a>
### T-062 · Sign-out button

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | profile+QR | T-000 | S |

- **E2E:** `e2e/account/session.spec.ts`. Scenarios: sign out lands on `/`, `/home` then redirects, note drafts cleared.
- **Files:** `app/(app)/me/page.tsx`, a small client button calling `POST /api/auth/signout`. The API is Ready; there is no button.
- **Acceptance:**
  - After sign-out, the person lands on `/` and `/home` redirects.
  - `sessionStorage` note drafts are cleared (`lib/note-draft.ts`).

<a id="t-063"></a>
### T-063 · Handle shown and editable

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P2 | profile+QR | T-000, OQ #26 | M |

- **E2E:** `e2e/profiles/me.spec.ts`. Scenarios: handle change; `handle_taken` 409 copy; old `/u/<old>` redirects.
- **Acceptance:** `PATCH /api/me { handle }` follows the `users_handle_check` pattern and returns 409 `handle_taken`. The old handle keeps redirecting for 30 days, because printed or shared QR codes encode `/u/<handle>`.

<a id="t-064"></a>
### T-064 · Someone else's badges (`/me/badges?of=<handle>`)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P2 | profile+QR | T-000, T-070 | S |

- **E2E:** `e2e/gamification/badges.spec.ts`. Scenarios: `/me/badges?of=<handle>` shows only earned badges, no progress.
- **Acceptance:** `GET /api/users/{handle}/badges` returns earned badges only, with no progress. Today `/people/[handle]` links to `?of=`, which the page ignores.

<a id="t-065"></a>
### T-065 · Edit my interests

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | profile+QR | T-000, T-051 | S |

- **E2E:** `e2e/profiles/me.spec.ts`. Scenarios: pick interests (max 10, the 11th is disabled), visible on my card per visibility.
- **Files:** `components/profile/ProfileForm.tsx`. `PATCH /api/me { interestIds }` exists; there is no UI.
- **Acceptance:** chips from `GET /api/interests`, at most 10 (schema `max(10)`), with visibility from `visibility.interests`.

<a id="t-066"></a>
### T-066 · Remove my photo or revert to LinkedIn

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P2 | profile+QR | T-000, T-015 | S |

- **E2E:** `e2e/profiles/me.spec.ts`. Scenarios: restore LinkedIn photo; remove photo falls back to the monito.
- **Acceptance:**
  - "Use the monito only" already exists via `avatar_mode` (T-015).
  - "Restore LinkedIn photo" resets `photo_edited` so M14 sync resumes.
  - Removing the photo deletes the Storage object.

---

## E6 Badges, ranking and invites

<a id="t-070"></a>
### T-070 · Real `GET /api/badges` (IP: real-mode)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | P1 | connections+points | T-000, T-001 | M |

- **E2E:** `e2e/gamification/badges.spec.ts`. Scenarios: earned, locked and secret states; filter Todas / Ganadas / Por ganar; secrets carry no hint.
- **Branch:** `lib/server/badges.ts` computes badges on read: accepted facts, scans, attendance, signup rank, topics and notes.
- **Remaining after the branch:**
  - Performance on large histories, because it runs several queries per call.
  - Secret badges must carry no progress.
  - Badge names go through the dictionary (T-111).

<a id="t-071"></a>
### T-071 · "NUEVA" sticker and seen state

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db+ui | P2 | connections+points | T-000, T-070 | S |

- **E2E:** `e2e/gamification/badges.spec.ts`. Scenarios: a newly earned badge shows "NUEVA" until `/me/badges` is opened.
- **Acceptance:** `users.badges_seen_at` (or a `user_badge_seen` table). Badges earned after it show "NUEVA" on the shelf. Opening `/me/badges` marks them seen.

<a id="t-072"></a>
### T-072 · Lifetime leaderboard (IP: real-mode)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | P1 | live+seeds | T-000 | S |

- **E2E:** `e2e/gamification/ranking.spec.ts`. Scenarios: "Todo el año" differs from "Esta noche" with two seeded events; works with no current event.
- **Branch:** `rankedLifetime` in `lib/server/live.ts` over `lifetime_scores`.
- **Remaining after the branch:** the route still needs an event code in its path. Consider `GET /api/leaderboard?scope=lifetime` so Ranking works outside an event (T-025).

<a id="t-073"></a>
### T-073 · The leaderboard `me` row and ties

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | live+seeds | T-000, T-072 | S |

- **E2E:** `e2e/gamification/ranking.spec.ts`. Scenarios: `me` row with gap and the person above; equal points display; unranked copy.
- **Acceptance:**
  - `me` is `{ rank, points, gapToNext, above }` when signed in, and `null` when I am not ranked.
  - Ties share points but get distinct ranks by connections, then check-in time (data model §4.4). The UI shows equal points without implying a tie-break the person cannot see.
  - A person with 0 points sees "Tu primera conexión te mete al ranking".

<a id="t-074"></a>
### T-074 · Real invite routes (IP: real-mode)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db+backend | P1 | connections+points | T-000, T-001 | M |

- **E2E:** `e2e/gamification/invites.spec.ts`. Scenarios: `/invite` shows my code and invitees; copy and share buttons; own code claim → 404.
- **Branch:** `invites` and `invite_claims` tables, `lib/server/invites.ts` (code created on first read, repeat-safe claim, own code → 404).
- **Remaining after the branch:** see T-075 and T-076.

<a id="t-075"></a>
### T-075 · Claim the invite after sign-in

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | connections+points | T-000, T-074 | S |

- **E2E:** `e2e/onboarding/invite-link.spec.ts`. Scenarios: `/i/<code>` → sign-in → claim once → "Invited by"; unknown code shows nothing; reload does not claim twice.
- **Files:** `app/(app)/onboarding/profile/page.tsx`. It reads only `from`; the `invite` parameter set by `/i/[code]` is ignored, so `POST /api/invites/{code}/claim` is never called.
- **Acceptance:**
  - On load with `?invite=<code>`, call the claim once, show "Invited by <name>", then strip the parameter.
  - A 404 shows nothing.

<a id="t-076"></a>
### T-076 · Invite rewards in scores, the golden cap and anti-farming

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db+backend | P1 | connections+points | T-000, T-074, T-120, OQ #48 | M |

- **E2E:** `e2e/gamification/invites.spec.ts`. Scenarios: +100 / +50 after the invitee's first accept, once; an existing account cannot farm; golden cap at 3.
- **Files:** `db/schema.ts` (score views), `lib/points.ts` (`INVITE_POINTS`, `GOLDEN_CAP_INVITES`), `lib/server/invites.ts`.
- **Acceptance:**
  - +100 to the inviter and +50 to the invitee when the invitee's first connection is accepted, credited once.
  - Only invitees whose `users.created_at` is after, or within N minutes of, the claim count. Existing accounts cannot be farmed.
  - The golden cap unlocks at 3 qualifying invitees.
- **Edge cases:** the invitee's first connection is with the inviter. Decide whether it counts (OQ #48). Account deletion of an invitee.

<a id="t-077"></a>
### T-077 · Leaderboard opt-out

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | P2 | live+seeds | T-000, OQ #46 | S |

- **E2E:** `e2e/gamification/ranking.spec.ts`. Scenarios: opted-out person absent from the leaderboard, still on the network view.
- **Acceptance:** implement OQ #46. M13 keeps everyone on the network view, but a person may want out of rankings.

<a id="t-078"></a>
### T-078 · Regenerate my invite code

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P2 | connections+points | T-000, T-074 | S |

- **E2E:** `e2e/gamification/invites.spec.ts`. Scenarios: rotate code; old link 404; old claims kept.
- **Acceptance:** `POST /api/invites/me/rotate` issues a new code. Old claims stay linked.

---

## E7 Notifications and realtime

<a id="t-080"></a>
### T-080 · Notifications list and seen state

**Status:** Done (list and seen state in PR #45; live bell, toast and Web Push on `fm/compa-notifications`).

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | connections+points | T-000, T-031 | M |

- **E2E:** `e2e/notifications/bell.spec.ts`. Scenarios: bell count equals unseen items; list shows requests, acceptances, invitee connections, badges; never a decline; opening marks seen.
- **Files:** new `/notifications` page, `GET /api/notifications`, and `users.notifications_seen_at`.
  - The list is derived: incoming pending requests, my requests accepted since the last visit, invitees who connected and badges earned. A notifications table is P2 (gap analysis P2).
- **Acceptance:**
  - The bell count equals unseen items.
  - Opening the list marks them seen.
  - Declines never appear (M8).

<a id="t-081"></a>
### T-081 · Realtime Authorization for private user channels

**Status:** Done on `fm/compa-notifications` (migration `0011_realtime_user_channels`, `components/notifications/LiveNotifications.tsx`, `e2e/notifications/live.spec.ts`).

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| infra+ui | P2 | connections+points | T-000, OQ #27 | M |

- **E2E:** `e2e/notifications/bell.spec.ts`. Scenarios: a request arrives in under 2 s through Realtime; subscribing to another user's channel is refused; polling still works if Realtime is blocked.
- **Acceptance:**
  - RLS on `realtime.messages` lets a user join only `user:<own id>`.
  - The client subscribes, and polling stays as a fallback.
  - A test shows another user's channel is refused.
  - Today the server broadcasts and no client subscribes (gap analysis U16).

---

## E8 Big screen

<a id="t-090"></a>
### T-090 · `/e/<code>/live` page (IP: landing)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | **P0** | live+seeds | T-000, T-020 | L |

- **E2E:** `e2e/live/big-screen.spec.ts`. Scenarios: 1920×1080 project: valid code renders counters and nodes; unknown code not-found; empty event shows people only; person click opens the card; empty-space click opens the leaderboard.
- **Branch:** `app/e/[code]/live/page.tsx`, `components/live/` (`LiveBoard`, `LivePanels`, `Loom`, `loom-scene.ts`, `useLiveSnapshot.ts`).
- **Remaining after the branch:** see T-091 and T-093. The empty-event state needs a check against DESIGN.md: people only, no edges.

<a id="t-091"></a>
### T-091 · `/live` at scale

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | live+seeds | T-000, T-090 | M |

- **E2E:** `e2e/live/big-screen.spec.ts` (`@load` tag) and `scripts/load-live.ts`. Scenarios: 500 nodes / 2 000 edges seeded: snapshot under 300 KB and the page stays responsive.
- **Files:** `lib/server/live.ts` (the snapshot returns every attendee and every accepted edge on each call), `components/live/*`.
- **Acceptance:**
  - At 500 attendees and 2 000 edges, the snapshot stays under 300 KB and 300 ms server time.
  - The client renders at 30 fps or more on the projector laptop.
  - Polling is at most once per 2 s, using the 1 s shared cache (`LIVE_CACHE`).
  - A load test script lives in `scripts/`.
- **Edge cases:**
  - Many screens open on the same code, absorbed by the CDN cache.
  - The snapshot carries all people even when the person card needs one.
  - Photos that fail to load fall back to the monito.

<a id="t-092"></a>
### T-092 · Retire or gate the public slug routes

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | P1 | live+seeds | T-000, T-020 | S |

- **E2E:** `e2e/live/big-screen.spec.ts`. Scenarios: `/api/events/<slug>/live` and `/leaderboard` return 404; no page requests a slug route (network assertion).
- **Acceptance:**
  - After the landing merge, no route answers on `/api/events/{slug}/live`, `…/leaderboard` or `…/live/people/{userId}`, and no page calls them.
  - Today `GET https://compa.lol/api/events/founders-fest/live` is public (probed 200), and slugs are guessable.
  - `livePerson` by user id returns only attendees of that code's event.

<a id="t-093"></a>
### T-093 · Kiosk mode for the projector

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P2 | live+seeds | T-000, T-090 | S |

- **E2E:** `e2e/live/big-screen.spec.ts`. Scenarios: with `reducedMotion: 'reduce'` no animation runs; after 3 failed polls the page shows "reconnecting" and recovers.
- **Acceptance:**
  - A Screen Wake Lock.
  - Auto-reload after 3 failed polls.
  - A "reconnecting" badge.
  - Reduced motion when the OS asks for it.
  - A 1920×1080 layout readable from 10 m (AGENTS.md §4).

---

## E9 Account, privacy and moderation

<a id="t-100"></a>
### T-100 · Delete my account

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db+backend+ui | P1 | profile+QR | T-000, OQ #24 | L |

- **E2E:** `e2e/account/delete-export.spec.ts`. Scenarios: confirm step; after deletion the session ends, the other person sees "Deleted user" and keeps points per OQ #24; event creator deletion handled.
- **Files:** new `DELETE /api/me`, `lib/server/profile.ts`, the Supabase admin API (delete `auth.users`, which cascades `users` via `auth_user_id`), Storage `avatars`, the `/me` settings section.
- **Acceptance:**
  - A confirm step.
  - The policy chosen in OQ #24 is applied, preferably **anonymize**: name "Deleted user", photo, links, email and `linkedin_raw` cleared, handle tombstoned. A hard delete cascades through `event_attendees` → `connections` → `interactions` and changes other people's scores and history.
  - The session is ended.
  - A re-sign-in with the same LinkedIn creates a fresh user.
- **Edge cases:**
  - The person is the `created_by` of an event (FK without cascade, so a delete fails).
  - Invite claims they own.
  - The deletion runs mid-event while they appear on `/live`.

<a id="t-101"></a>
### T-101 · Export my data

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P2 | profile+QR | T-000 | M |

- **E2E:** `e2e/account/delete-export.spec.ts`. Scenarios: export downloads JSON with the listed sections and no other person's hidden fields.
- **Acceptance:** `GET /api/me/export` returns JSON with profile, visibility, interests, check-ins, my connections (the other side as I may see it), my summaries, invites and points. It is rate-limited.

<a id="t-102"></a>
### T-102 · Privacy notice, terms and minimum age

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| docs+ui | P1 | captain | T-000, OQ #47 | M |

- **E2E:** `e2e/system/legal.spec.ts`. Scenarios: `/privacy` and `/terms` linked from the landing and the door, in es and en.
- **Acceptance:**
  - `/privacy` and `/terms` are linked from the landing and the event door.
  - They state what is public on the big screen (M13), that audio is not stored (`docs/contracts/ai-summaries-api.md`), that OpenAI processes notes, the retention periods (T-103), the minimum age and the deletion route.

<a id="t-103"></a>
### T-103 · Data retention after the event

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+infra | P2 | live+seeds | T-000, OQ #45 | M |

- **E2E:** N/A (cron); a unit test covers the retention query.
- **Acceptance:** a Vercel Cron applies the decided periods to `users.linkedin_raw`, unapproved drafts (T-057), stale Storage photos and emails of inactive users. Each run is logged.

<a id="t-104"></a>
### T-104 · Admin moderation

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| db+backend+ui | P2 | live+seeds | T-000, T-023, OQ #52 | L |

- **E2E:** `e2e/admin/moderation.spec.ts`. Scenarios: hide from `/live`, reset photo, ban (banned user gets 401 and disappears from cards), non-admin 403.
- **Acceptance:**
  - An admin can hide a person from an event's `/live` and leaderboard.
  - An admin can reset someone's photo to the monito.
  - An admin can ban a user (`users.banned_at`: `requireUser` refuses them and their cards disappear).
  - An admin can review reports (T-042).
  - Every action is audit-logged.

<a id="t-105"></a>
### T-105 · Sign out everywhere

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P2 | profile+QR | T-000, T-062 | S |

- **E2E:** `e2e/account/session.spec.ts`. Scenarios: sign out everywhere ends a second context's session.
- **Acceptance:** `POST /api/auth/signout { scope: "global" }` uses Supabase `signOut({ scope: "global" })`, for a phone lent at the event.

---

## E10 i18n, accessibility, resilience and layout

<a id="t-110"></a>
### T-110 · i18n foundation (IP: landing, minimal)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | scaffold | T-000 | M |

- **E2E:** `e2e/system/i18n.spec.ts`. Scenarios: `locale: 'es-MX'` → Spanish, `locale: 'en-US'` and `fr-FR` → English, on the landing and the door.
- **Branch:** `lib/i18n.ts`, `lib/copy/en.ts` and `lib/copy/index.ts`, for the landing and the event door.
- **Remaining after the branch:** T-111.

<a id="t-111"></a>
### T-111 · Every screen through the dictionary, with an error-code map and `Intl`

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | scaffold | T-000, T-110 | L |

- **E2E:** `e2e/system/i18n.spec.ts`. Scenarios: every screen in both locales has no untranslated key; each mocked error code (`x-compa-mock-error`) shows its localized copy, never the API `message`; `<html lang>` matches.
- **Files:**
  - All 28 imports of `lib/copy/es` in `app/` and `components/`.
  - `components/nav/Dock.tsx`, whose labels and `aria-label` are hard-coded Spanish.
  - `lib/format.ts` (`es-MX`) and `app/layout.tsx` (`lang="es"`).
  - `RegisterForm`, `RequestActions`, `ProfileForm`, `MonitoBuilder` and `NoteEditor`, which show the API `message`.
- **Acceptance:**
  - An `es*` system locale gives Spanish; anything else gives English.
  - `<html lang>` follows the locale.
  - Every API error `code` in `lib/api/errors.ts` has an `errors.<code>` key in both dictionaries, and a test asserts the coverage.
  - Numbers and dates use `Intl` with the resolved locale.
  - AI text stays in the speaker's language (captain decision).
- **Edge cases:** an `Accept-Language` header that is missing or `*`. A server/client locale mismatch causing hydration warnings. A 30 % text expansion in buttons, chips and the dock.

<a id="t-112"></a>
### T-112 · Offline and network errors

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | scaffold | T-000, T-111 | S |

- **E2E:** `e2e/system/resilience.spec.ts`. Scenarios: `context.setOffline(true)` shows the banner and disables writes; a slow route (`route.fulfill` with delay) shows the skeleton.
- **Acceptance:**
  - A "sin conexión" banner on `offline`.
  - Write buttons are disabled while offline, not queued (DESIGN.md).
  - `network_error` from `apiCall` maps to copy.
  - Polling pauses while offline.

<a id="t-113"></a>
### T-113 · Accessibility pass

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | scaffold | T-000, T-111 | M |

- **E2E:** `e2e/system/a11y.spec.ts`. Scenarios: `@axe-core/playwright` has no serious violations on each screen; keyboard-only path through register and accept.
- **Acceptance:**
  - Every interactive element has a visible focus style and an accessible name.
  - Text contrast is AA on the paper background (`#6F6A7E` muted text on `#FFF6E5` needs a check).
  - Toggles use `aria-pressed`, which is done in most places.
  - Animations respect `prefers-reduced-motion` (README "Sistema visual").
  - The camera view has a text alternative.
  - An axe run on each screen passes.

<a id="t-114"></a>
### T-114 · Responsive layouts at 390, 834 and 1440

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | scaffold | T-000 | M |

- **E2E:** `e2e/system/responsive.spec.ts`. Scenarios: 390, 834 and 1440 projects: no horizontal scroll, the dock reachable, screenshots compared.
- **Files:** `components/ui/Screen.tsx`, the landing, the `max-w-[390px]` containers.
- **Acceptance:**
  - At 834 and 1440 px the app uses a centered column or a two-column layout, never a stretched phone layout (captain decision: responsive views).
  - The dock stays reachable.
  - `/e/<code>/live` targets 1920.

---

## E11 Docs and decisions

<a id="t-120"></a>
### T-120 · Ratify the points table and update the specs

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| docs | P1 | captain | T-000, OQ #28, #29 | S |

- **E2E:** N/A (docs). Update the points assertions in the affected specs if values change.
- **Files:** `docs/specs/2026-10-29-data-model.md` (M3, M18), `wiki/points-rules.md`, `wiki/open-questions.md`.
- **Acceptance:**
  - The specs and wiki state the ratified V2 values (50, 20, +5, +15, +100/+50, the golden cap at 3).
  - It is decided whether "accept +20 each" is a separate award. Recommendation: no.
  - #28 and #29 are marked resolved.

<a id="t-121"></a>
### T-121 · README known limitations and an operations runbook

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| docs | P1 | captain | T-000 | S |

- **E2E:** N/A (docs). The limitations list cites the e2e status from the catalog.
- **Acceptance:** `README.md` lists what works in real mode against what is mock-only, from the [catalog](catalog.md) status. A runbook covers creating the event, promoting an admin, rotating the code, running migrations and rolling back.

<a id="t-122"></a>
### T-122 · Update the OpenAPI and quickstart for `/api/e/{code}`

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| docs | P1 | live+seeds | T-000, T-020 | S |

- **E2E:** `e2e/system/openapi.spec.ts`. Scenarios: `/api/openapi.json` lists `/api/e/{code}/*` and no `/api/events/{slug}/live`.
- **Files:** `openapi.json` (`bun run openapi`), `docs/api-quickstart.md` (still lists `/api/events/:slug/*` as public), `docs/specs/2026-10-29-api.md` (A6 says `/live` is public to anyone with the link).
- **Acceptance:** the docs match the code-gated routes, and the M19 decision is recorded.

Related: [README](README.md), [catalog](catalog.md), [actors and permissions](actors-and-permissions.md), [edge cases and risks](edge-cases-and-risks.md), [gap analysis](../backend-gap-analysis.md).

## Research tickets (2026-10-29)

Drafted by the live data-viz and UX audit research. Full ticket text, with E2E lines, lives beside each report; promote one into the epics above when you pick it up. Every one depends on [T-000](#t-000).

| Range | Source | Count |
| --- | --- | --- |
| DV-1 – DV-10 | [big-screen data viz](../research/dataviz-bigscreen/findings.md#5-backlog-tickets-format-of-docsflowsbacklogmd-all-depend-on-t-000) | 10 |
| DP-1 – DP-9 | [phone data viz](../research/dataviz-phone/findings.md#11-backlog-tickets) | 9 |
| UX-A1 – UX-A22 | [attendee audit](../research/ux-audit-parts/attendee/tickets.md) | 22 |
| UX-P1 – UX-P18 | [public and admin audit](../research/ux-audit-parts/public-admin/tickets.md) | 18 |
