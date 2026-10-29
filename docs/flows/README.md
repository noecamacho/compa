# User flows and build backlog

Date: 2026-10-29 · Ticket: `COMPA-<TBD>` · Baseline: `main` @ `617cb93`, plus the unpushed branches `feat/COMPA-TBD-landing-gated-events` ("landing") and `fix/COMPA-TBD-real-mode-routes` ("real-mode"), read from their local worktrees.

This folder is the map from **what a person does** to **what has to be built**. It extends the [backend gap analysis](../backend-gap-analysis.md): that page asks whether each V2 screen works, and this one asks whether each user flow works end to end. It also covers the actors, permissions, risks and an agent-ready backlog.

## Documents

| Document | What it answers | Size |
| --- | --- | --- |
| [actors-and-permissions.md](actors-and-permissions.md) | Who the actors are; who may do what (permission matrix); which create, read, update and delete operations exist per entity, and which are missing | 14 actors, 34 missing CRUD operations |
| [catalog.md](catalog.md) | Every user flow: entry, steps (screen → API → result), alternates, error codes → copy keys, edge cases, status per layer, **e2e coverage**, tickets | 74 flows (F-01–F-74) |
| [edge-cases-and-risks.md](edge-cases-and-risks.md) | What is not yet handled: abuse, AI, privacy, operations, concurrency, security | 40 risks (R-01–R-40) |
| [backlog.md](backlog.md) | Agent-ready tickets grouped by epic, with priority, lane, dependencies, files, acceptance criteria, e2e scenarios, edge cases and "do not touch" | 86 tickets (T-000–T-122): 12 P0, 48 P1, 26 P2; 11 in progress |

Status words are the same everywhere:

- **Ready:** works in real mode.
- **Partial:** works, but something the flow needs is dropped or missing.
- **Mock-only:** works only in mock mode.
- **Missing:** not built.
- **IP:** in progress on one of the two branches above.

Decision ids (M1–M19, A1–A9) refer to the [data-model spec](../specs/2026-10-29-data-model.md) and the [API spec](../specs/2026-10-29-api.md). M19, the event access code, is IP on the landing branch. "OQ #n" means [wiki/open-questions.md](../../wiki/open-questions.md) row n.

## How an agent uses the backlog

1. **Pick a ticket.** Start with P0 in the order of the [top 10](backlog.md#top-10-p0-and-p1-in-suggested-order), then P1 by epic. Check two things first:
   - The ticket is not **IP**. If it is, review that branch instead.
   - Everything in "Depends on" is merged. Every ticket depends on [T-000](backlog.md#t-000), the e2e harness.
   - If a dependency is an open question (OQ #n), ask the captain before building. Never guess a product rule (AGENTS.md §2).
2. **Read the context.** AGENTS.md says to read `wiki/index.md` first. Then read the flows the ticket links in [catalog.md](catalog.md), the files under "Files", and the "Do not touch" notes.
3. **Branch and worktree.** Create them from `main` (AGENTS.md §1b, §3):

   ```sh
   git -C /home/noe/Projects/compa fetch origin
   git -C /home/noe/Projects/compa worktree add ../compa-worktrees/<short-name> -b <type>/COMPA-TBD-<short-kebab-summary> origin/main
   ```

   - The type follows Conventional Commits: `feat`, `fix`, `docs`, `ci`, `refactor`, `test`, `perf`, `build` or `chore`.
   - Put the ticket id in the PR title and body, for example "T-031".
   - One ticket per branch. Split anything bigger than **M** into several PRs.
4. **Build.** Follow `docs/engineering-standards.md`:
   - zod at every boundary, no `any`, no nesting deeper than 2, business rules on the server.
   - New routes go in `lib/api/routes.ts` and `lib/api/schemas.ts` with examples, so mock mode and `openapi.json` stay in sync (`bun run openapi`).
   - New copy goes in both dictionaries.
   - A new migration takes the next free number. Check every open branch for the number first ([T-001](backlog.md#t-001)).
5. **Test.** Write e2e specs as described in [E2E tests](#e2e-tests) below, plus unit tests.
6. **Open the PR.** Use the template in `.github/PULL_REQUEST_TEMPLATE.md` with every section filled; "N/A" needs a word of why.
   - Update `CHANGELOG.md` for user-visible changes.
   - Add one line to `wiki/log.md` when knowledge changes.
   - Update the flow's **Status** and **E2E coverage** in [catalog.md](catalog.md), and the ticket's state here.
   - Commits use Conventional Commits in English, with **no AI attribution** (the hooks enforce it).
   - Never push to `main`, and never merge your own PR.

## Definition of done

A ticket is done when **all** of these hold:

- [ ] Every acceptance criterion in the ticket is met and checked off in the PR.
- [ ] **Every ticket ships with Playwright e2e specs under `e2e/` that run the affected flows from [catalog.md](catalog.md)**, covering the happy path, every listed edge case and every error state, plus unit tests. CI must run them. Tickets marked "E2E: N/A" have no user-facing behavior and still need unit tests.
- [ ] The specs pass in the projects `mobile-390`, `tablet-834` and `desktop-1440` (and `live-1920` for big-screen work), in **both locales**, and with **reduced motion** on `mobile-390`.
- [ ] `bun run lint && bun run typecheck && bun test && bun run build` pass locally and in CI (AGENTS.md §4). The CI gate is [T-003](backlog.md#t-003).
- [ ] New and changed routes are in `lib/api/routes.ts` with documented error codes and mock examples, and `openapi.json` is regenerated.
- [ ] Every new error code has a copy key in `lib/copy/es.ts` and `lib/copy/en.ts`. The UI never shows the API `message` (DESIGN.md "Internationalization").
- [ ] The catalog status and e2e coverage for the touched flows are updated, and `wiki/log.md` has a line.
- [ ] No secrets anywhere. Env values live only in Vercel (captain decision); only variable names go in `.env.example`.
- [ ] One other agent or person reviewed the PR.

## E2E tests

The harness is ticket [T-000](backlog.md#t-000): `playwright.config.ts`, `e2e/fixtures/` and the first spec `e2e/smoke.spec.ts`. Import `test` and `expect` from `e2e/fixtures` (`index.ts` merges every fixture).

```sh
bun run e2e:install                         # once: Chromium and WebKit with system deps
API_MODE=mock bun run e2e                   # mock-mode specs; starts `bun run dev` with API_MODE=mock
TEST_AUTOMATION_SECRET=... bun run e2e      # real-mode specs against a dev server on the test project
E2E_BASE_URL=https://compa.lol bun run e2e  # read-only @prod specs only
```

Tag each test: `@mock` needs a server with `API_MODE=mock`, `@real` needs `TEST_AUTOMATION_SECRET` and the seeded test project, `@prod` is read-only and safe against compa.lol. Untagged tests run in every mode. The config drops `@real` on a mock server and `@mock` on a real one, and real-mode fixtures skip themselves without the secret and refuse compa.lol.

Layout, one folder per catalog section:

```text
e2e/
  fixtures/          index.ts, mock.ts, real-mode.ts, real-user.ts, test-event.ts, two-users.ts
  onboarding/        landing, signin, profile, monito, deep-links, invite-link
  events/            door, check-in, window
  connect/           my-qr, scan, search, register, voice-note
  requests/          incoming, pending, accept-decline, withdraw, mutual
  summaries/         note
  connections/       list
  profiles/          me, other
  home/              home
  gamification/      badges, ranking, invites
  notifications/     bell
  live/              big-screen
  admin/             events, moderation
  account/           session, delete-export, block-report
  api/               contract suite generated from lib/api/routes.ts (mock and real), openapi
  system/            resilience, rate-limits, i18n, a11y, responsive
  smoke.spec.ts
```

Each flow in [catalog.md](catalog.md) names its spec file and the scenarios to assert in its **E2E coverage** row.

### Running locally against a local Supabase

Real mode never targets production. A local stack works without the test project:

1. `supabase init` in a scratch folder, set a unique `project_id` and free ports in `supabase/config.toml`, then `supabase start` (realtime, studio and storage can stay off; broadcasts fail silently).
2. Put its URL, anon and service-role keys, `DATABASE_URL` and a random `TEST_AUTOMATION_SECRET` (32+ characters) in `.env.local`; run `bun run db:migrate` and `SEED_TEST_EVENT=1 bun run db:seed`.
3. Build once and serve two ports: `next start -p 3471` (real) and `API_MODE=mock next start -p 3472` (mock). Build from a clean checkout: `next build` typechecks `e2e/` too.
4. `API_MODE=mock E2E_BASE_URL=http://localhost:3472 bunx playwright test` and `E2E_BASE_URL=http://localhost:3471 bunx playwright test` (with `.env.local` loaded). Agents sharing a worktree pass `--output=test-results/<area>`.

The email sign-in spec reads the magic link from the local Mailpit (`E2E_MAILPIT_URL`, default the API port + 3). WebKit needs system libraries (`sudo npx playwright install-deps`); without them run the Chromium projects and leave WebKit to CI.

### Two modes

**Mock mode** covers error and edge paths without data. Mock mode serves every route from the OpenAPI examples (`docs/api-quickstart.md`).

| Want | How |
| --- | --- |
| Signed-in screens without a database | Start the app with `API_MODE=mock bun run dev`. `hasSession()` then returns true, and server-side `apiGet` sends `x-compa-mock: 1` (`lib/server/session.ts`, `lib/api/server-fetch.ts`) |
| A documented error on a client call | `mock.mockError('not_at_event', '**/api/connections')` (a `page.route` that adds `x-compa-mock-error`); without the URL every API call gets it. `mock.mockStatus(n)` and `mock.mockExample(name)` work the same way |
| A named success example | Header `x-compa-mock-example: fallback` on `POST /api/interactions/draft`, or `notSubstantive` |
| An error on a server-rendered page | `mock.mockServerError('event_not_found')` sets the test-only cookie `compa-mock-error`; `lib/api/server-fetch.ts` forwards it as `x-compa-mock-error` only under `API_MODE=mock` (`lib/api/mock-cookie.ts`). Every server fetch of that request gets it, so pick a code each of them documents |
| Network failure or slowness | `context.setOffline(true)`; `page.route(url, r => setTimeout(() => r.continue(), 3000))` |

Asking for an error a route does not document returns `400 mock_error_unknown`. Treat that as a broken test, not a pass.

**Real mode** covers paths that need data. It needs a **seeded test event** and test users in a **separate test Supabase project**, never production (`docs/testing/real-mode.md`).

- `realUser` creates a test user once per worker through the sign-in-as route (`x-compa-automation`, API spec A11), reuses it for the worker's tests, puts its Supabase session cookies in the test's browser context and deletes it at the end. **LinkedIn is never called.**
- `testEvent` reads the seeded Codex Conf 2026 (slug, access code, join URL) as `@codex-test-admin` and, before each worker, moves its window back to running when it has ended or not started. For time-dependent cases use `page.clock` or a test event whose window is in the past or the future.
- `twoUsers` gives two fresh test users, each signed in in its own browser context, for request and accept, mutual scans and live updates. Assert with `expect.poll` (5 s cap), never fixed sleeps.
- `testUsers(n)` and `signIn(context, user)` are the building blocks (`e2e/fixtures/real-mode.ts`).

### Matrix

| Dimension | Values | How |
| --- | --- | --- |
| Viewport | `mobile-390` (390×844, touch, WebKit and Chromium), `tablet-834` (834×1194), `desktop-1440` (1440×900), `live-1920` (1920×1080, `e2e/live/**` only) | `projects` in `playwright.config.ts` |
| Locale | Spanish (`locale: "es-MX"`, `Accept-Language: es-MX`) and English (`locale: "en-US"`); spot-check `fr-FR` → English | Project `use.locale` + `extraHTTPHeaders` |
| Motion | `reducedMotion: "reduce"` variant on `mobile-390` | Project `use.reducedMotion` |
| Media | Chromium projects launch with a fake camera and microphone (`--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`); a scan spec adds `--use-file-for-fake-video-capture=<qr.y4m>` with `test.use({ launchOptions })`. WebKit gets `permissions: []` for the denied path | `launchOptions.args` |
| Target | Local `bun run dev` (default; CI builds and runs `next start`), any local server through `E2E_BASE_URL`, or `E2E_BASE_URL=https://compa.lol` for read-only `@prod` smoke tests | `baseURL`, `--grep @prod` |

### Artifacts and CI

- `.github/workflows/e2e.yml` runs on every pull request. The `mock` job installs Chromium and WebKit, builds the app and runs the specs against `next start` with `API_MODE=mock`, in four shards.
- The `real` job runs `@real` specs only when the captain sets the repository variable `E2E_TEST_BASE_URL` (a deployment on the separate test project) and the secret `E2E_TEST_AUTOMATION_SECRET`.
- Every test keeps its trace, screenshot and video on failure (`retain-on-failure`, `only-on-failure`); the job uploads them with the HTML report.

## Counts at a glance

| Measure | Count |
| --- | --- |
| Flows | 74. UI layer: 2 Ready, 30 Partial, 12 Mock-only, 19 Missing, 10 IP, 1 no UI |
| E2E specs existing today | Every built flow and all 46 API operations ([coverage status](catalog.md#e2e-coverage-status)) |
| Tickets | 86: P0 12, P1 48, P2 26; 11 in progress on the two branches |
| Missing CRUD operations | 34 |
| Risks | 40 (8 high impact) |
| New open questions | 14 (#43–#56 in [wiki/open-questions.md](../../wiki/open-questions.md)) |

Related: [gap analysis](../backend-gap-analysis.md), [DESIGN.md](../../DESIGN.md), [API quickstart](../api-quickstart.md), [wiki index](../../wiki/index.md).
