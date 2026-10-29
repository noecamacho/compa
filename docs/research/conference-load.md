# COMPA at conference scale: infrastructure failure modes

Scout report, 2026-10-29. Task `compa-conference-load`. Repo `noecamacho/compa`. Tested at `origin/main` `f6f65f3`. Re-checked against `origin/main` `4a56118` (PRs #47–#54) before submitting. Those PRs touch no file behind a finding except as noted under finding 8 (a new `proxy.ts`).

## 1. Bottom line

COMPA works for a demo-sized room. At conference scale (500 or more phones open at once) it fails, and it does not fail gracefully. Six problems would hit first, in this order:

1. **Auth turns load into mass "logouts".** Every authenticated request and every page render calls Supabase Auth over HTTP (`auth.getUser()`), and any error from it is treated as "not signed in". Measured locally: **52% of a 1,000-person check-in burst got 401** and **39% of polls from 300 phones got 401**. Switching to local JWT verification (`getClaims()`, which works because production signs with ES256) gave **0% 401 and 2.3× the throughput** on the same hardware.
2. **One query per 3-second poll scans every connection in the database.** `GET /api/connections` reads `lifetime_scores`, a view that aggregates all accepted connections: **12.6 ms per call at 6k connections, 91% of all database time while polling**, growing linearly. A user-scoped query takes **0.69 ms (18× faster)**.
3. **Polling volume.** An open `/home` makes 40 requests per minute and never backs off, pauses or skips overlaps. 1,000 phones means about 667 req/s and 2.4M function invocations per hour. Every request also hits Auth (item 1) and Postgres (item 2).
4. **The database pooler hard-fails at its client cap.** Measured: Supavisor answers `EMAXCONN max client connections reached, limit: 200` beyond 200 clients. Each Vercel instance holds up to 5 connections and never releases idle ones, so about 40 warm instances exhaust a Nano/Micro project.
5. **Page renders fan out over HTTP to the app's own API, including the full 1.15 MB live snapshot.** Measured: 50 concurrent `/home` loads **wedged all four local instances** (inner `/api/me` fetches timed out with `UND_ERR_HEADERS_TIMEOUT`, and the instances stopped answering even `/api/interests`).
6. **No rollback path on event day.** The deploy workflow **deletes all other deployments (up to the 100 most recent)** once a new production deploy is READY (`.github/workflows/vercel.yml`, step "Keep only the new deployment"). Every push to `main` also deploys straight to production with migrations and no preview. Instant rollback is impossible, and a bad merge during the event takes a full CI, migrate and build cycle to undo.

Also high: email magic-link sign-in will not survive a room (built-in SMTP sends 2 emails/hour; errors map to 500), and in-app QR scanning does nothing on iPhones (no `BarcodeDetector` in Safari).

Correctness under concurrency is good. Double-tap accept, mutual scans, double check-in and a 300-person "everyone scans the speaker" burst all behaved correctly in the measurements, with no lock contention.

## 2. What I did

| Step | Detail |
|---|---|
| Local stack | `supabase start` with its own project id (`compa-load`, ports 585xx). It ran Postgres 17, GoTrue, Realtime, Kong, and **Supavisor in transaction mode with production-like limits**: `default_pool_size = 15`, `max_client_conn = 200` (Nano/Micro defaults). Migrations ran through `bun run db:migrate`, then `SEED_TEST_EVENT=1 bun run db:seed`. |
| App | `next build`, then **4 × `next start`** (ports 3101–3104) behind a round-robin load client. Four processes stand in for several Vercel instances that each own a pool of `max: 5`. |
| Data | 1,000 test users created through the real-mode harness (`POST /api/admin/test-users`, `POST /api/admin/test-users/{id}/session`; cookies are real Supabase sessions). All were checked in to the test event `codex-conf-2026`. A further 5–6k accepted connections were inserted by SQL to reach a realistic "late afternoon" graph (1,000 people, ~6k edges). |
| Load client | Bun script `loadtest/load.ts` (reproduced in the appendix). Scenarios: check-in burst, scan → detail poll → accept with 10% simultaneous mutual scans and 14% double-tap accepts, a hot speaker (300 scan one person, who accepts all at once), steady polling as `/home` does it (2 calls per 3 s per phone, plus big screens), and page renders. |
| Profiling | `pg_stat_statements`, `EXPLAIN ANALYZE`, `docker stats`, and server logs. A temporary instrumentation patch in `lib/server/supabase.ts` logs why auth failed and adds a `LOADTEST_AUTH=claims` toggle to A/B `getUser()` against `getClaims()`. |
| Static audits | Three parallel sub-agents: server concurrency and DB (Opus), client and network resilience (Sonnet), and official platform limits with sources (Sonnet). Their claims were spot-checked against the code and, where measurable, against the local stack. |

**Never touched production.** The only production reads were the public JWKS (`/auth/v1/.well-known/jwks.json`, to learn the signing algorithm), response headers of `https://compa.lol`, and project metadata from `supabase projects list` and `vercel project inspect` (regions). No production data was read or written. The report contains no secrets; the keys used locally are the well-known Supabase CLI demo keys.

**Caveats on the numbers.**
- The machine was shared with other workers (other Next builds, about 15 other Supabase containers), so absolute latencies are pessimistic and noisy.
- Four Node processes on one box saturate on CPU at roughly 90–100 req/s. Vercel scales out instead, so treat local **throughput** as a floor.
- The **ratios** are reliable: error rates, `getUser` against `getClaims`, query costs, payload sizes, and query counts per action.
- Local GoTrue is a single small container, so hosted Auth will hold up better. The design flaw (auth errors become 401) is independent of capacity.
- Local GoTrue did **not** enforce per-IP rate limits (120 rapid `GET /user` and 60 refreshes all passed). The per-IP limits below therefore come from Supabase docs and were not reproduced.

## 3. Measurements

### 3.1 Check-in burst: 1,000 attendees within 10 s

| Auth mode | n | p50 | p90 | p99 | Result |
|---|---|---|---|---|---|
| `getUser()` (current code) | 1000 | 1,627 ms | 7,867 ms | 9,443 ms | **201: 479, 401: 521** |
| `getUser()`, spread over 60 s | 1000 | 202 ms | 667 ms | 9,158 ms | all OK |
| `getClaims()` (local JWT verify) | 1000 | **64 ms** | 199 ms | 411 ms | **201: 1000** |

The server logs explain the 401s: `auth failed (getUser) AuthRetryableFetchError 0 fetch failed` (610), `… 500 An unexpected error occurred` (552), `… 504 Processing this request timed out` (102). Auth errors are swallowed and reported as "not signed in" (`lib/server/auth.ts:16-17`, `lib/server/session.ts:9-10`).

A direct GoTrue `GET /auth/v1/user` burst (`loadtest/gotrue.ts`) returned 100/100 OK at 100 concurrent. At 500 concurrent it returned 251 OK, 25 × 500 and 224 socket closes. At 1,000 concurrent it returned 251 OK, 156 × 500 and 593 socket closes.

### 3.2 Steady polling (what `/home` does)

| Run | Phones | Achieved rps | p50 | p90 | p99 | Errors |
|---|---|---|---|---|---|---|
| `getUser()`, 6.1k connections | 300 | 38 | 11.2 s | 22.4 s | 25.8 s | **39% 401** |
| `getClaims()`, 6.1k connections | 300 | 89 | 3.8–4.9 s | 7.5–10.1 s | 11–15 s | 0 |
| `getClaims()`, 6.1k connections | 150 | 86–93 | 0.33–0.53 s | 1.9–4.1 s | 3.3–5.0 s | 0 |

Demand at 300 phones is 200 req/s and at 150 phones is 100 req/s. In both, the 4 local processes are CPU-bound and Postgres sits at about 45–60% of one core. On Vercel the Node layer scales out, so the ceiling moves to Postgres, Auth and the pooler. `pg_stat_statements` during the 150-phone run:

| Query | Calls | Mean | Share of DB time |
|---|---|---|---|
| `select "points" from "lifetime_scores" where user_id = $1` (from `listConnections`) | 1,989 | **12.64 ms** | **91% (25.1 s of 27.5 s)** |
| next three `connections` selects | 1,989 each | 0.14–0.36 ms | ~6% |

`EXPLAIN ANALYZE` shows the cause: `Seq Scan on connections c … rows=6113`. The `user_id` filter cannot be pushed through `cross join lateral (values (requester_id),(addressee_id))` in the `event_scores` view. A user-scoped replacement (union of `requester_id = $1`, `addressee_id = $1`, the author's approved interactions and bonus points) runs in **0.693 ms**. The whole-table rankings are also O(all data): `rankedLifetime` takes 32 ms and `rankedAtEvent` 41 ms at 6k connections, and they run 2× per `/api/me` and 2× per `/api/users/{handle}` (scan lookup). Under the page-render test they averaged **22 ms each**.

**Extrapolation (not measured at that scale):** 1,000 phones on `/home` means 333 `GET /api/connections` per second. At 12.6 ms each that is about **4.2 Postgres cores for this one query** at 6k connections, and more as the graph grows. A Micro or Small instance has 2 vCPUs.

### 3.3 Scan → accept

| Run | Pairs | Create p50 / p99 | Accept p50 / p99 | Statuses |
|---|---|---|---|---|
| `getUser()`, 1,000 pairs in 20 s | 1000 | 24.5 s / 30.1 s | 8.9 s / 30.0 s | **401: 317, client timeout (30 s): 279** on create |
| `getClaims()`, 1,000 pairs in 20 s | 1000 | 4.2 s / 11.9 s | 9.4 s / 13.2 s | create 201: 951, 200: 49; accept 200: 881, 409: 70, 403: 49 |
| `getClaims()`, 500 pairs in 20 s | 500 | 1.9 s / 5.3 s | 2.7 s / 7.0 s | no errors besides the expected 409/403 |

How to read the codes:
- **409** on accept is the double tap answered correctly: exactly one 200 per pair, verified in 137 of 143 pairs.
- **403** is a script artifact. After a mutual-scan race the "other" person becomes the addressee, and the script accepted with the wrong session.
- **Mutual scans:** both requests got 200 or 201 and resolved to one row (unique pair index plus `onConflictDoNothing`).

DB cost per cycle is low: **about 55 queries and about 8 ms of DB time per scan + accept**. Writes are not the DB bottleneck. The latency here was Node CPU on the shared box, plus local Realtime. During the 1,000-person check-in the logs showed `realtime broadcast failed … TimeoutError` 264 times and `SocketError: other side closed` 155 times. Each broadcast is **awaited** on the request path with a 1.5 s timeout (`lib/realtime.ts:19`).

**Hot speaker:** 300 people scanned one person, who then accepted all 300 concurrently. All succeeded. The slowest single statement was 26 ms (badge insert), with no lock waits. Scores are views, not counter rows, so there is no hot row.

### 3.4 Live snapshot and page renders

| Item | Measured |
|---|---|
| `GET /api/e/{code}/live` size at 1,000 people and 6k edges | **1,152.7 KB** per response (solo latency 0.21 s) |
| Projection to 3,000 people and 20k edges | ~4.4 MB, at Vercel's 4.5 MB response limit, which returns `FUNCTION_PAYLOAD_TOO_LARGE` |
| `/home` solo render | 0.96 s cold, 0.42 s warm (67 KB HTML). It fetches `/api/me` twice, the full live snapshot, the event door, connections, invites and notifications over HTTP. |
| `/home`, 50 concurrent renders, 4 instances | **All 4 instances wedged.** Inner self-fetches died with `UND_ERR_HEADERS_TIMEOUT` (79 on one instance), and only 40 `/api/me` calls reached Postgres in ~10 min. The instances stopped answering even `GET /api/interests` until restarted. |

### 3.5 Page renders at low concurrency

Not run. After the instances were restarted, both machine-wide heavy-job slots (`hr-heavy`) were held by other workers' long-running dev servers, so my servers never came back up. What was measured before that:
- `/home` solo: 0.96 s cold and 0.42 s warm.
- During the 50-concurrent run, `pg_stat_statements` showed each event and lifetime ranking query at about 22 ms mean, two of each per `/api/me`.
- One `/home` render therefore costs at least 4 ranking queries (about 90 ms of Postgres), 8 HTTP self-calls, and a 1.15 MB JSON parse.

The fix check (`CONC=4` and `CONC=16 bun loadtest/load.ts pages …`) is in §8.2 and should run after finding 5 is fixed.

### 3.6 Pooler client cap

`loadtest/pooler.ts` opens N idle clients against Supavisor (transaction mode, `max_client_conn = 200`):
- 150 clients: all OK.
- 250 clients: **200 OK, 50 × `(EMAXCONN) max client connections reached, limit: 200`**.

The app's pool, `createDatabase(url, max = 5)` → `postgres(url, { prepare: false, max })` (`db/connect.ts:6-7`, default used by `db/client.ts:16`), has no `idle_timeout`, so every warm Vercel instance keeps up to 5 client sockets open.

## 4. Ranked findings

Severity is the impact if it happens. Likelihood is for a 500–1,000-person event with one projector and most attendees on `/home`. IDs carry over to the dispatch list in §6.

| # | Finding | Severity | Likelihood | Evidence | Fix (smallest first) |
|---|---|---|---|---|---|
| 1 | **Auth on every request through GoTrue; any auth error becomes 401 or a redirect to `/`** | Critical | Certain at peak | §3.1, §3.2: 52% and 39% 401s. Code: `lib/server/auth.ts:16,26`, `lib/server/session.ts:9`, `app/(app)/layout.tsx:12-13` | Use `supabase.auth.getClaims()` in `requireUser`, `currentUserOrNull` and `hasSession` (production JWKS is ES256, so verification is local and the JWKS is cached). Treat an auth `error` as 503 (retryable), never as 401. Measured result: 0% 401, 2.3× throughput. |
| 2 | **`lifetime_scores` full scan on every 3 s poll; full-table rankings on `/api/me` and scan lookups** | Critical | Certain; grows with the graph | §3.2: 12.6 ms, 91% of DB time. `lib/server/connections.ts:262-265`, `lib/server/scores.ts:16-52`, `lib/server/profile.ts:24,166`, views in `db/schema.ts:312-344` | (a) Replace `lifetimePoints` with the user-scoped union query (0.69 ms). (b) Memoize `rankedAtEvent` and `rankedLifetime` per instance for 3–5 s. (c) Later: a materialized view refreshed by `pg_cron` every 5–10 s with a precomputed rank. |
| 3 | **Polling storm with no backoff** | Critical | Certain | `components/home/IncomingRequests.tsx:18-51` (2 × `setInterval` 3 s; no hidden-tab pause, in-flight guard or backoff), `components/connections/PendingWatcher.tsx:8-17`. `/home` = 40 req/min per phone. | Self-scheduling `setTimeout` loop: one request in flight, pause when hidden, exponential backoff with jitter on error, `AbortSignal.timeout(8000)`. Merge the two `/home` polls into one cheap endpoint (`unseenCount` plus incoming). Slow to 5–10 s, and use the Realtime broadcasts already sent (`lib/realtime.ts`) as the fast path. |
| 4 | **Pooler client cap and pool settings** | High | Likely at peak | §3.6: `EMAXCONN` at 200. `db/connect.ts:7` (`max: 5`, no `idle_timeout`, default 30 s `connect_timeout`) | `postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 5, max_lifetime: 300 })`. Check the production Supavisor `max_client_conn` and pool size, and upsize compute for the event day (Small: 400 clients; Medium: 600). |
| 5 | **Server Components fetch their own API over HTTP; `/home` pulls the full live snapshot; no error boundary** | High | Certain on `/home` | §3.4: instances wedged at 50 concurrent renders. `lib/api/server-fetch.ts:37`, `app/(app)/home/page.tsx:28-32,47` (`apiGet` throws), no `error.tsx` outside `app/admin` | Call `lib/server/*` directly from pages, or wrap `/api/me` in React `cache()` so layout and page share it. Give `LiveCard` a tiny endpoint (last 3 pairs plus counters). Switch `loadLive` and the invites call to `apiGetSafe`. Add `app/(app)/error.tsx` with retry. |
| 6 | **No rollback; every `main` push deploys to production** | High | Likely (people keep merging during the event) | `.github/workflows/vercel.yml`: step "Keep only the new deployment" deletes all other deployments (up to 100) once the new one is READY; no preview (captain decision 2026-10-29); migrations run on each deploy (`vercel.json`). | Before the event: disable or limit the deletion step to keep the last 3 deployments, so Vercel Instant Rollback works. Freeze merges to `main` during the event window. Write the runbook (§5.2). |
| 7 | **Email magic-link sign-in breaks in a room** | Critical if email is the fallback for people without LinkedIn | Likely | Built-in SMTP sends 2 emails/hour (Supabase docs). `/otp` and `/verify` limits are 30 per 5 min per IP, and server-side calls come from Vercel egress IPs. `lib/server/auth-routes.ts:39-42` maps every error, including 429, to 500. The PKCE link fails when opened in a different browser, and `failedSignIn` drops `next`, so the event code is lost (`auth-routes.ts:20,47-50`). | Configure custom SMTP and raise the Auth rate limits (dashboard). Map 429 to a clear message. Preserve `next` on failure. Better: a 6-digit OTP code entered on the same page (avoids PKCE cross-browser and mail scanners eating links). |
| 8 | **Session refresh is never persisted (`proxy.ts` does not refresh it), which can cause a logout wave about 1 h after the sign-in wave** | High | Likely, inferred and not reproduced | `proxy.ts` (added on main in `4a56118`) only forwards the pathname header; it does not refresh the Supabase session. `lib/server/supabase.ts:17` `setAll` writes cookies with no try/catch, but Server Components cannot set cookies. `lib/api/server-fetch.ts` drops the inner response's `Set-Cookie`. A rotated refresh token lost after the reuse interval (10 s) revokes the session. | Extend the existing `proxy.ts` with the standard `@supabase/ssr` `updateSession`, keeping the pathname header. Wrap `setAll` in try/catch. Verify with `jwt_expiry = 60` locally (test in §6). |
| 9 | **Live snapshot payload is unbounded and selects full user rows** | High | Certain size growth; the 4.5 MB failure needs about 3k people | §3.4: 1.15 MB at 1k/6k. `lib/server/live.ts:24` selects all `users` columns (including `linkedin_raw`), and `:32-38` returns all edges | Select `id, name, photo_url` only. Cap edges (most recent 500 to 1,500) and send counters from `count()`. Add a `since` delta. Projectors are CDN-cached (`s-maxage=1`), but every `/home` render still fetches it server-side (finding 5). |
| 10 | **In-app QR scanning is dead on iPhone Safari and Firefox, with no message** | High | Certain for iOS users | `components/connect/ScanPanel.tsx:16-17,38`: when `BarcodeDetector` is missing the camera starts and nothing ever scans. `:74` passes an inline `onHandle` in the effect deps (`:51`), so the camera restarts on every render and keystroke. | Short term: when there is no detector, show "Use your phone's camera app on the QR" (the `/u/<handle>` path works end to end). Proper: the `barcode-detector` ponyfill (zxing-wasm). Keep `onHandle` in a ref and add an in-flight guard. |
| 11 | **Big screen: Three.js loom rebuilds everything on each check-in; the join QR is too small to scan across a room** | High for the projector | Likely at 500+ people | `components/live/loom-scene.ts:119-120,160,176-188` (layout key from all ids, so every new attendee rebuilds all `TubeGeometry` threads; one mesh per thread is ~7k draw calls; 60 fps continuous). `LiveBoard.tsx:50-55`: QR ≈144 px at 1920 px with `margin: 0` (`app/e/[code]/live/page.tsx:21`). | Merge threads into one `BufferGeometry`/`LineSegments` and `InstancedMesh` pegs. Do not rebuild existing threads. Render at 10–15 fps or on change. Cap edges. Add a join mode with a QR of at least 15–20 vh with a 4-module quiet zone and a short URL. Add `webglcontextlost` handling. |
| 12 | **No rate limiting or abuse caps; OpenAI cost is open** | High (leaderboard integrity, cost) | Plausible: the access code is on the projector | No limiter anywhere. Points can be farmed with sock-puppet email accounts and invites (`lib/server/invites.ts:69-87`). `/api/interactions/draft` and `/api/transcribe` have no per-user caps. `MAX_AUDIO_BYTES = 15 MB` (`lib/ai/transcribe.ts:5`) is above Vercel's 4.5 MB body limit. | Per-user limits in SQL (for example, at most 30 connection requests per minute; at most 5 drafts per connection) returning 429. Do **not** use IP-based WAF limits, because the venue NAT shares one IP. Lower `MAX_AUDIO_BYTES` to 4 MB. Set an OpenAI project budget alert and move the project to a higher usage tier. Capping scored connections is a product call (§7). |
| 13 | **Write path awaits side effects** | Medium | Certain under Realtime or DB slowness | `acceptConnection` awaits `awardExtras` (badges load all of a person's connections and cities: `badgeFactsFor`, `badges.ts:97-118`; `signupIndex` at `:74`) and `announceAcceptance`. Broadcast timeout 1.5 s (`lib/realtime.ts:19`), awaited on check-in, create, accept and approve. §3.3: 264 broadcast timeouts during the check-in burst. | Move `awardExtras` and `broadcast` into `after()` from `next/server`. Put `awardInvite` in one transaction (`invites.ts:72-84`). Compute `signupIndex` once per user. |
| 14 | **Missing indexes** | Medium | Amplifies 2 and 3 | Found by the audit and confirmed in `\d connections` (only `requester_idx`, `addressee_idx`, `(event_id,status)` and the pair index) | `event_attendees(user_id, checked_in_at desc)`, `interactions(connection_id)`, `interactions(author_id) where approved_at is not null`, `bonus_points(event_id)`, `users(created_at)`, `connections(addressee_id,status)`, `connections(requester_id,status)`. Ship them before doors open, while the tables are small (drizzle-kit migrations are usually wrapped in a transaction, which rules out `CONCURRENTLY` [unverified for this setup]). |
| 15 | **No observability or alerting** | Medium | Certain (you would be blind) | No Sentry, OpenTelemetry or `instrumentation.ts`. No `app/error.tsx` or `global-error.tsx`. Pollers swallow errors (`.catch(() => null)`). | Turn on Vercel Observability (function errors and duration per route). Set a Supabase dashboard alert or watch CPU and connections. Add `instrumentation.ts` with `onRequestError` logging. Keep a person watching logs during the event (§5.2). |
| 16 | **Invite races return 500** | Medium | Plausible | `invites.ts:48` claims with no `isNull(inviteeId)` guard (a second claim overwrites the first). `ownInvite` reads then inserts with no conflict handling (`invites.ts:15-20`), so two concurrent `/api/invites/me` calls raise 23505, a 500, and `/home` breaks (`apiGetOrNull` rethrows). | Add the guard. Use `onConflictDoNothing()` and then re-select. |
| 17 | **Client writes have no timeout, no offline handling, and lose audio** | Medium | Likely on venue Wi-Fi | `lib/api/client.ts:26-32` has no timeout or abort. Raw English errors are shown ("Failed to fetch"). `RequestActions.tsx:32-39` navigates home in `finally` even when decline failed. `components/record/VoiceNoteButton.tsx:34-39` drops the recorded `File` when upload fails (`uploadForTranscript`, `lib/audio/recorder.ts:186-199`), and it has no unmount cleanup, so the mic stays open. | 15 s default timeout. Friendly offline and 401 messages. Retry GETs. Keep the audio `File` for "retry upload". Cancel recording on unmount. |
| 18 | **The scanned person never sees the incoming request while showing "My QR"** | Medium | Certain | Pollers live only on `/home`. `/connect` has none. The Realtime `user:` broadcasts have no subscriber. | One shared lightweight poller or Realtime subscription in the `(app)` layout or Dock, with a badge or toast. |
| 19 | **Access-code rotation kills the projector** | Medium | Plausible (the admin has a rotate button) | `useLiveSnapshot.ts:35`: a poll that gets 404 calls `router.refresh()`, the page renders `notFound()` and polling stops, so the projector shows "not found" until someone reloads it with the new code. The join QR is built once. | Do not rotate during the event (runbook), or return the new code or a redirect to screens. |
| 20 | **The big screen does not show an outage clearly** | Medium | Plausible | `useLiveSnapshot.ts`: the stale pill appears only after a failed fetch *resolves*; a hung fetch never resolves. No `error.tsx` on `/e/[code]/live`. | `AbortSignal.timeout`, "updated Xs ago", auto-reload after about 60 s of failures, and `error.tsx` with auto-retry. |
| 21 | **The event door is uncached; `GET /api/e/{code}` runs 2 counts per hit** | Low–Medium | Certain at the doors | `lib/server/events.ts:56-85` has no cache header. | Add `LIVE_CACHE` (`s-maxage=1`) to the door response. It is public. |
| 22 | **Points race and correctness checks** | Low (verified OK) | n/a | Measured §3.3: double-tap accept gives exactly one 200 and one 409 (`FOR UPDATE` plus `status='pending'` guard); a mutual scan gives one row; double check-in is idempotent; the hot speaker had no contention. | None. One small loss: in a mutual scan the loser's `knew`/`topics` are dropped (`connections.ts:36,56`). |

### Platform facts that frame the risks (sources in §8)

| Fact | Value | Implication |
|---|---|---|
| Vercel plan | **Pro** (per the workflow comment in `.github/workflows/vercel.yml`). Function region **iad1**. | Concurrency (30k, burst 1,000 per 10 s per region) is not the limit. A cold surge at doors-open can briefly return `503 FUNCTION_THROTTLED`. |
| Supabase project | `compa`, **us-east-1**, created 2026-10-29. Plan and compute size **unknown to me**. | Co-located with iad1, which is good. From Guadalajara, each round trip costs about 60–80 ms before any server work. |
| Production JWT signing | **ES256** (public JWKS) | `getClaims()` verifies locally, so fix 1 needs no Supabase change. |
| Supabase Auth per-IP limits | `/token` 150/5 min (burst 30); `/otp`, `/magiclink`, `/signup`, `/user` 30/5 min; `/verify` 30/5 min; built-in SMTP 2 emails/hour per project | Server-side Auth calls come from Vercel egress IPs shared by all users, and browser-direct calls come from the venue NAT IP. Raise these for the event day. Whether `GET /user` is enforced is [unverified]. Moving to `getClaims()` removes the question. |
| Supavisor client cap | Nano/Micro 200, Small 400, Medium 600 (Postgres 60/60/90/120) | See finding 4. |
| Supabase Realtime | Free 200 connections / 100 msg/s; Pro 500 / 500 (higher with the spend cap off) | Today the app only *sends* broadcasts and nothing subscribes. Subscribing per phone (finding 18) would need Pro sizing. |
| Supabase egress | Free 5 GB; Pro 250 GB | Polling at 1,000 phones pulls about 18 KB per phone every 3 s from Vercel to the client, but DB egress stays small. The 1.15 MB live snapshot fetched server-side per `/home` render is the egress risk. |
| OpenAI | `gpt-4o-mini-transcribe`: Build tier 2,000 RPM / 150k TPM; Launch 10k RPM / 2M TPM; $0.003/min. 25 MB per file. | 150k TPM on Build can throttle a burst of voice notes. Move to Launch and set a budget alert. The transcribe route has `maxDuration = 30` (`app/api/transcribe/route.ts:5`), so a slow OpenAI call returns 504 and the client drops the audio (finding 17). |
| LinkedIn OIDC | Daily app and member limits are not published; check the Analytics tab of the developer portal | One OAuth exchange per user, so low risk. Confirm the redirect allow-list includes `https://compa.lol/auth/callback**`. |

## 5. Pre-conference checklist and day-of runbook

### 5.1 Checklist (in order; each item is small)

1. [ ] **Ship fixes 1, 2a, 3 and 4** (auth via `getClaims`, user-scoped lifetime points, poller backoff and pause, pool settings). These four remove the measured failure modes.
2. [ ] **Ship finding 5's minimum**: `apiGetSafe` for `loadLive`/invites, a light `LiveCard` endpoint, and `app/(app)/error.tsx`.
3. [ ] **Ship the indexes (finding 14)** before doors open, while the tables are small.
4. [ ] **Supabase dashboard:** confirm the plan is not Free (Free pauses and has a 5 GB egress cap). Upsize compute to **Small or Medium for the day**. Note the Supavisor pool size and `max_client_conn`. Turn the spend cap off or raise it for the day.
5. [ ] **Supabase Auth:** configure custom SMTP if email sign-in is offered. Raise the `token_refresh`, `otp`/`magiclink`, `verify` and `sign_in_sign_ups` limits. Consider raising `jwt_expiry` for the day (finding 8).
6. [ ] **Vercel:** keep older deployments (edit the cleanup step) so Instant Rollback works. Set a spend alert. Turn on Observability. Confirm the production env has `OPENAI_*`, Supabase keys and `NEXT_PUBLIC_SITE_URL=https://compa.lol`.
7. [ ] **OpenAI:** move to at least the Launch tier and set a project budget alert.
8. [ ] **LinkedIn app:** the OIDC product is enabled and the redirect URLs include production.
9. [ ] **Projector:** a laptop with a discrete GPU, or the fixed loom. Chrome kept awake. A tested full-screen `/e/<code>/live`. A **printed big QR** of `/e/<code>` at the doors and on the stage, so you do not depend on the on-screen QR. Do not rotate the access code.
10. [ ] **iPhone guidance:** a sign or a line in the MC script: "scan the person's QR with your camera app". This covers finding 10 until the ponyfill ships.
11. [ ] **Rehearse:** run `loadtest/load.ts` (appendix) against a **local** build with the fixes. Target: 1,000-person check-in in 10 s with 0 non-2xx, 300 phones polling with p99 under 2 s on 4 local processes, and `/home` at 50 concurrent with no wedge.
12. [ ] **Freeze `main`** from one hour before doors until the event ends. Fixes go only through the runbook below.

### 5.2 Day-of runbook

| Signal | Where to look | Action |
|---|---|---|
| Many people "logged out" or kicked to `/` | Vercel logs: 401 rate on `/api/connections`; Supabase Auth logs | Pre-fix: GoTrue is saturated or rate-limiting, so raise the Auth limits in the dashboard. Post-fix: should not happen. Check that the access token has not expired without a refresh (finding 8). |
| `/home` slow or erroring | Vercel function duration on `/home` and `/api/me`; Supabase CPU | Upsize Supabase compute (online and quick). Ask the room to close `/home` tabs they are not using; the live screen is cached. |
| `EMAXCONN` or `remaining connection slots` in logs | Vercel logs; Supabase Database → connections | Upsize compute (raises the cap). Short term: redeploy with a lower `max`. |
| Big screen frozen or "not found" | Projector | Reload the tab. If the code was rotated, open the new `/e/<code>/live`. |
| A bad deploy | Vercel dashboard | **Instant Rollback** to the previous deployment (only possible if the cleanup step was disabled; otherwise revert on `main` and wait for CI and build, about 5–10 min). Migrations are forward-only, so roll code back only to a commit compatible with the current schema. |
| OpenAI 429 or 5xx | Vercel logs on `/api/transcribe` and `/api/interactions/draft` | Tell people to type the note. The app falls back to text when transcription fails (audio is lost, finding 17). |
| Points look farmed | `/admin` people list; SQL on `connections` by `requester_id` per minute | Remove puppet accounts from the event (admin `DELETE /api/admin/events/{slug}/attendees/{userId}`). |

## 6. Fix dispatch list (for firstmate)

Each line is independently shippable, in priority order. Effort: S is under 1 h, M is 1–3 h.

1. **F1 auth** (S): `getClaims()` in `lib/server/auth.ts` and `lib/server/session.ts`; auth error gives 503, not 401. The instrumentation diff I used is a starting point (§8.3). Add a unit test that a thrown or errored auth gives 503 and no claims gives 401.
2. **F2a lifetime points** (S): replace `lifetimePoints` in `lib/server/connections.ts:262-265` with the user-scoped union SQL (§3.2). **F2b** (S): 3–5 s per-instance memo for `rankedAtEvent`/`rankedLifetime` in `lib/server/scores.ts`.
3. **F3 pollers** (M): one shared polling hook (setTimeout chain, pause when hidden, backoff, timeout, in-flight guard) used by `IncomingRequests`, `AlertsBell` and `PendingWatcher`. Merge the two `/home` polls.
4. **F4 pool** (S): `db/connect.ts` options.
5. **F5 `/home`** (M): `apiGetSafe`, a light live card endpoint, `(app)/error.tsx`, React `cache()` around `/api/me`.
6. **F6 deploy safety** (S): stop deleting old deployments; document the freeze and rollback in `wiki/` and `docs/`.
7. **F9 live payload** (S): select only the needed columns; cap edges.
8. **F14 indexes** (S): one additive migration.
9. **F8 session refresh** (M): `updateSession` in the existing `proxy.ts`. Verify with local `jwt_expiry = 60`: sign in, wait 70 s, navigate a page without pollers, and confirm you are still signed in.
10. **F10 scanning** (S for the message, M for the ponyfill).
11. **F13 `after()`** (S): side effects off the response path.
12. **F7 email sign-in** (M): 429 mapping, preserve `next`, OTP code (also needs dashboard SMTP).
13. **F11 loom performance and join QR** (M–L; owned by whoever owns `/live` now).
14. F12 rate limits, F16 invite races, F17 client writes, F18 shared poller, F19/20 projector resilience, F21 door cache.

The reproductions are cheap: everything in §3 reruns from the appendix in about 15 minutes on a local stack.

## 7. Decisions that belong to the captain

1. **Supabase plan and compute for the event day:** stay as is / upsize to Small / upsize to Medium. Upsizing costs a few dollars for the day and raises the Postgres CPU and pooler caps.
2. **Is email sign-in offered at the event?** Yes, which requires custom SMTP and raised limits today / no, LinkedIn only, and hide the email form for the day.
3. **Deploy freeze and rollback:** keep the old-deployment cleanup / keep the last N deployments so Instant Rollback works, plus a merge freeze during the event.
4. **Leaderboard anti-farming:** no cap / cap scored connections per person per event (number to choose) / admin cleanup only.

## 8. Appendix

### 8.1 Sources for platform numbers
- Vercel: https://vercel.com/docs/functions/concurrency-scaling, https://vercel.com/docs/functions/limitations, https://vercel.com/docs/caching/cdn-cache, https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting, https://vercel.com/docs/plans/pro-plan
- Supabase: https://supabase.com/docs/guides/auth/rate-limits, https://supabase.com/docs/guides/platform/compute-and-disk, https://supabase.com/docs/guides/realtime/limits, https://supabase.com/docs/reference/javascript/auth-getclaims, https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits, https://supabase.com/pricing
- OpenAI: https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe, https://developers.openai.com/api/docs/guides/rate-limits, https://developers.openai.com/api/docs/pricing
- LinkedIn: https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits

### 8.2 Reproduce

```sh
# in a compa worktree (never against production)
supabase init --force
# edit supabase/config.toml: project_id "compa-load"; ports 543xx -> 585xx; [db.pooler] enabled = true,
#   default_pool_size = 15, max_client_conn = 200; studio/analytics/storage/edge_runtime/local_smtp disabled
supabase start -x studio,imgproxy,edge-runtime,logflare,vector,postgres-meta,mailpit,storage-api
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:58522/postgres bun run db:migrate
# .env.local: DATABASE_URL=postgresql://postgres.pooler-dev:postgres@127.0.0.1:58529/postgres,
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:58521, anon and service keys from `supabase start`,
#   TEST_AUTOMATION_SECRET=<any 32+ chars>
SEED_TEST_EVENT=1 bun run db:seed          # prints the door /e/<code>
hr-heavy bun run build
hr-heavy sh -c 'for p in 3101 3102 3103 3104; do ./node_modules/.bin/next start -p $p & done; wait'
export BASES=http://localhost:3101,http://localhost:3102,http://localhost:3103,http://localhost:3104 SECRET=<secret> CODE=<code>
bun loadtest/load.ts setup 1000 7      # test users + sessions
bun loadtest/load.ts checkin 10000     # 1000 check-ins within 10 s
bun loadtest/load.ts scan 1000 20000   # scan -> detail -> accept, with races
bun loadtest/load.ts hot 300           # speaker hotspot
bun loadtest/load.ts poll 300 60 2     # /home polling + 2 projectors
CONC=16 bun loadtest/load.ts pages 80  # page renders
# SQL graph padding (accepted connections among checked-in people) and EXPLAIN: see §3.2
```

### 8.3 Instrumentation used for the auth A/B (lab only, not a PR)

```ts
// lib/server/supabase.ts (appended); auth.ts and session.ts call authUserId(supabase) instead of getUser()
export async function authUserId(supabase: ServerClient): Promise<string | null> {
  if (process.env.LOADTEST_AUTH === "claims") {
    const { data, error } = await supabase.auth.getClaims();
    if (error) console.error("auth failed (claims)", error.name, error.message);
    return data?.claims.sub ?? null;
  }
  const { data, error } = await supabase.auth.getUser();
  if (error) console.error("auth failed (getUser)", error.name, error.status, error.message);
  return data.user?.id ?? null;
}
```

For the real fix, drop the toggle, keep `getClaims()`, and return 503 on `error` instead of `null`. Note that `getClaims()` only proves the JWT is valid until it expires; it does not see a server-side sign-out within that window. That is acceptable for this app (1 h tokens) and is the standard Supabase recommendation for server-side checks.

### 8.4 Load script

`loadtest/load.ts` (Bun; refuses any non-localhost base URL):

```ts
// Local conference load test for COMPA. Never point BASES at production.
// Usage: bun loadtest/load.ts <cmd> [args]   (env BASES=http://localhost:3101,http://localhost:3102 SECRET=...)
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const BASES = (process.env.BASES ?? "http://localhost:3101").split(",");
if (BASES.some((b) => !/localhost|127\.0\.0\.1/.test(b))) throw new Error("local only");
const SECRET = process.env.SECRET ?? "";
const CODE = process.env.CODE ?? "";
const USERS_FILE = process.env.USERS_FILE ?? "loadtest/users.json";
let rr = 0;
const base = () => BASES[rr++ % BASES.length]!;

type U = { id: string; handle: string; cookie: string };
type Sample = { label: string; ms: number; status: number; bytes: number };
const samples: Sample[] = [];

async function call(label: string, method: string, path: string, opts: { cookie?: string; body?: unknown; auto?: boolean; timeoutMs?: number } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.auto) headers["x-compa-automation"] = SECRET;
  const t0 = performance.now();
  let status = 0;
  let text = "";
  let setCookies: string[] = [];
  try {
    const r = await fetch(base() + path, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      redirect: "manual",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30000),
    });
    status = r.status;
    setCookies = r.headers.getSetCookie();
    text = await r.text();
  } catch (e) {
    status = (e as Error).name === "TimeoutError" ? 599 : 598;
  }
  const ms = performance.now() - t0;
  samples.push({ label, ms, status, bytes: text.length });
  return { status, text, setCookies, ms };
}

const pct = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))] ?? 0;
function report(title: string, wallMs: number) {
  const by = new Map<string, Sample[]>();
  for (const s of samples) by.set(s.label, [...(by.get(s.label) ?? []), s]);
  const lines = [`### ${title}  (wall ${(wallMs / 1000).toFixed(1)} s, instances ${BASES.length})`, "", "| endpoint | n | rps | p50 ms | p90 ms | p99 ms | max ms | statuses | avg KB |", "|---|---|---|---|---|---|---|---|---|"];
  for (const [label, xs] of by) {
    const ms = xs.map((x) => x.ms).sort((a, b) => a - b);
    const st = new Map<number, number>();
    for (const x of xs) st.set(x.status, (st.get(x.status) ?? 0) + 1);
    const kb = xs.reduce((a, x) => a + x.bytes, 0) / xs.length / 1024;
    lines.push(`| ${label} | ${xs.length} | ${(xs.length / (wallMs / 1000)).toFixed(1)} | ${pct(ms, 50).toFixed(0)} | ${pct(ms, 90).toFixed(0)} | ${pct(ms, 99).toFixed(0)} | ${ms.at(-1)!.toFixed(0)} | ${[...st].map(([k, v]) => `${k}:${v}`).join(" ")} | ${kb.toFixed(1)} |`);
  }
  const out = lines.join("\n") + "\n";
  console.log(out);
  writeFileSync("loadtest/results.md", out + "\n", { flag: "a" });
  samples.length = 0;
}

async function pool<T>(items: T[], n: number, fn: (x: T, i: number) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const k = i++;
      await fn(items[k]!, k);
    }
  }));
}

const users = (): U[] => JSON.parse(readFileSync(USERS_FILE, "utf8"));
const cookieOf = (sc: string[]) => sc.map((c) => c.split(";")[0]!).filter((c) => !c.endsWith("=")).join("; ");

// Create N test users (not checked in) and sign each in; save handles + cookies.
async function setup(n: number, prefixSeed: number) {
  const created: { id: string; handle: string }[] = existsSync(USERS_FILE) ? users() : [];
  const batches = Math.ceil((n - created.length) / 50);
  await pool(Array.from({ length: Math.max(0, batches) }, (_, b) => b), 4, async (b) => {
    const r = await call("setup:create", "POST", "/api/admin/test-users", { auto: true, body: { count: 50, seed: prefixSeed * 1000 + b } });
    if (r.status !== 201 && r.status !== 200) return console.error("create", r.status, r.text.slice(0, 200));
    for (const u of JSON.parse(r.text).users) created.push({ id: u.id, handle: u.handle });
  });
  const out: U[] = [];
  await pool(created.slice(0, n), 8, async (u) => {
    const r = await call("setup:session", "POST", `/api/admin/test-users/${u.id}/session`, { auto: true });
    if (r.status !== 200) return console.error("session", r.status, r.text.slice(0, 200));
    out.push({ ...u, cookie: cookieOf(r.setCookies) });
  });
  writeFileSync(USERS_FILE, JSON.stringify(out));
  console.log(`users ready: ${out.length}`);
}

// Burst: everyone checks in within `spreadMs`.
async function checkin(spreadMs: number) {
  const us = users();
  const t0 = performance.now();
  await Promise.all(us.map(async (u) => {
    await Bun.sleep(Math.random() * spreadMs);
    await call("POST check-in", "POST", `/api/e/${CODE}/check-in`, { cookie: u.cookie, body: { screenConsent: true } });
  }));
  report(`check-in burst: ${us.length} attendees within ${spreadMs} ms`, performance.now() - t0);
}

// Random pairs scan and accept, with a share of simultaneous mutual scans and double-tap accepts.
async function scanAccept(pairs: number, spreadMs: number) {
  const us = users();
  const t0 = performance.now();
  await Promise.all(Array.from({ length: pairs }, async (_, i) => {
    const a = us[Math.floor(Math.random() * us.length)]!;
    let b = us[Math.floor(Math.random() * us.length)]!;
    if (b.id === a.id) b = us[(us.indexOf(a) + 1) % us.length]!;
    await Bun.sleep(Math.random() * spreadMs);
    const mutual = i % 10 === 0;
    const [r] = await Promise.all([
      call("POST connections", "POST", "/api/connections", { cookie: a.cookie, body: { toHandle: b.handle, screenConsent: true } }),
      mutual ? call("POST connections (mutual race)", "POST", "/api/connections", { cookie: b.cookie, body: { toHandle: a.handle, screenConsent: true } }) : Promise.resolve(null),
    ]);
    if (r.status >= 300) return;
    const id = JSON.parse(r.text).connectionId as string;
    await call("GET connections/:id", "GET", `/api/connections/${id}`, { cookie: b.cookie });
    const double = i % 7 === 0;
    await Promise.all([
      call("POST accept", "POST", `/api/connections/${id}/accept`, { cookie: b.cookie, body: {} }),
      double ? call("POST accept (double tap)", "POST", `/api/connections/${id}/accept`, { cookie: b.cookie, body: {} }) : Promise.resolve(null),
    ]);
  }));
  report(`scan → accept: ${pairs} pairs within ${spreadMs} ms (10% mutual-scan race, 14% double-tap accept)`, performance.now() - t0);
}

// Speaker: everyone scans one person, who accepts all of them concurrently (hot row).
async function hotPerson(n: number) {
  const us = users();
  const star = us[0]!;
  const fans = us.slice(1, n + 1);
  const t0 = performance.now();
  const ids: string[] = [];
  await Promise.all(fans.map(async (f) => {
    const r = await call("POST connections → speaker", "POST", "/api/connections", { cookie: f.cookie, body: { toHandle: star.handle, screenConsent: true } });
    if (r.status < 300) ids.push(JSON.parse(r.text).connectionId);
  }));
  await Promise.all(ids.map((id) => call("POST accept (speaker)", "POST", `/api/connections/${id}/accept`, { cookie: star.cookie, body: {} })));
  report(`hot person: ${fans.length} scan one speaker, speaker accepts all at once`, performance.now() - t0);
}

// Steady state: each phone polls what /home polls every 3 s; `screens` big screens poll /live.
async function poll(phones: number, seconds: number, screens: number) {
  const us = users().slice(0, phones);
  const t0 = performance.now();
  const until = Date.now() + seconds * 1000;
  const loop = async (fn: () => Promise<unknown>) => {
    await Bun.sleep(Math.random() * 3000);
    while (Date.now() < until) {
      const s = Date.now();
      await fn();
      await Bun.sleep(Math.max(0, 3000 - (Date.now() - s)));
    }
  };
  await Promise.all([
    ...us.map((u) => loop(() => Promise.all([call("GET connections", "GET", "/api/connections", { cookie: u.cookie }), call("GET notifications", "GET", "/api/notifications", { cookie: u.cookie })]))),
    ...Array.from({ length: screens }, () => loop(() => call("GET live", "GET", `/api/e/${CODE}/live`))),
  ]);
  report(`polling: ${us.length} phones on /home (2 calls / 3 s) + ${screens} live screens, ${seconds} s`, performance.now() - t0);
}

// Page renders (server components fan out to the API over HTTP).
async function pages(n: number) {
  const us = users().slice(0, n);
  const t0 = performance.now();
  await pool(us, Number(process.env.CONC ?? 50), async (u) => {
    await call("GET /home page", "GET", "/home", { cookie: u.cookie });
    await call("GET /api/me", "GET", "/api/me", { cookie: u.cookie });
    await call("GET leaderboard", "GET", `/api/e/${CODE}/leaderboard`, { cookie: u.cookie });
  });
  report(`page loads: ${us.length} attendees open /home, /api/me, leaderboard (${process.env.CONC ?? 50} concurrent)`, performance.now() - t0);
}

async function live(n: number) {
  const t0 = performance.now();
  await pool(Array.from({ length: n }, (_, i) => i), 20, async () => {
    await call("GET live", "GET", `/api/e/${CODE}/live`);
  });
  report(`live snapshot: ${n} requests, 20 concurrent`, performance.now() - t0);
}

const [cmd, a1, a2, a3] = process.argv.slice(2);
const num = (x: string | undefined, d: number) => (x ? Number(x) : d);
const commands: Record<string, () => Promise<void>> = {
  setup: () => setup(num(a1, 100), num(a2, 1)),
  checkin: () => checkin(num(a1, 10000)),
  scan: () => scanAccept(num(a1, 200), num(a2, 10000)),
  hot: () => hotPerson(num(a1, 100)),
  poll: () => poll(num(a1, 100), num(a2, 60), num(a3, 2)),
  pages: () => pages(num(a1, 100)),
  live: () => live(num(a1, 200)),
};
await (commands[cmd ?? ""] ?? (async () => console.log(Object.keys(commands).join(" "))))();
```

`loadtest/pooler.ts`:

```ts
// Open N idle client connections to the pooler at once (each Vercel instance holds up to max=5).
import postgres from "postgres";
const n = Number(process.argv[2]);
const clients = Array.from({ length: n }, () => postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 }));
const res = await Promise.allSettled(clients.map((c) => c`select 1`));
const errs = new Map<string, number>();
for (const r of res) if (r.status === "rejected") { const k = String(r.reason?.message).slice(0, 80); errs.set(k, (errs.get(k) ?? 0) + 1); }
console.log(`clients=${n} ok=${res.filter((r) => r.status === "fulfilled").length}`, Object.fromEntries(errs));
await Promise.all(clients.map((c) => c.end({ timeout: 1 })));
```

### 8.5 Wiki update (ready to apply)

This scout opens no PR, so the wiki change could not land from here. Apply it with the first fix PR (`git apply`). It adds `wiki/conference-scale.md`, an index line, a `wiki/log.md` query entry and a pointer from `wiki/risks.md`:

```diff
diff --git a/wiki/conference-scale.md b/wiki/conference-scale.md
new file mode 100644
index 0000000..c219521
--- /dev/null
+++ b/wiki/conference-scale.md
@@ -0,0 +1,29 @@
+# Conference-scale readiness
+
+What breaks when COMPA runs live at a conference (hundreds to thousands of phones, one projector), measured on a local stack on 2026-10-29. Full evidence, numbers and the reproduction script: the scout report `compa-conference-load` (firstmate data, not in this repo).
+
+## Measured failure modes (local Supabase + 4 `next start`, 1,000 test users, ~6k connections)
+
+| Rank | Failure | Measured | Fix |
+| --- | --- | --- | --- |
+| 1 | Every request calls Supabase Auth over HTTP (`auth.getUser()`); any auth error becomes 401 | 52% 401 on a 1,000-person check-in burst; 39% 401 polling at 300 phones | `getClaims()` (production signs ES256, verified locally): 0% 401, 2.3× throughput; auth error → 503 |
+| 2 | `GET /api/connections` reads the `lifetime_scores` view, a full scan of all connections, every 3 s | 12.6 ms per call, 91% of DB time | User-scoped union query: 0.69 ms; memoize rankings 3–5 s |
+| 3 | `/home` polls 2 endpoints every 3 s, no backoff or hidden-tab pause | 40 req/min per phone | Shared poller with backoff, pause, timeout; merge endpoints |
+| 4 | Supavisor client cap | `EMAXCONN` beyond 200 clients (Nano/Micro); app pool `max: 5`, no `idle_timeout` | `max: 3, idle_timeout: 20, connect_timeout: 5`; upsize compute for the day |
+| 5 | Pages fetch their own API over HTTP; `/home` pulls the 1.15 MB live snapshot | 50 concurrent `/home` renders wedged all instances | Call `lib/server/*` directly or `cache()`; light live-card endpoint; `error.tsx` |
+| 6 | Deploy workflow deletes old deployments | No Instant Rollback | Keep the last N deployments; freeze `main` during the event |
+
+Verified correct under concurrency: double-tap accept (one 200, one 409), mutual scans (one row), double check-in, 300 people scanning one speaker (no lock contention; scores are views, so there are no hot rows).
+
+## Platform limits that matter on the day
+
+- Supabase Auth per-IP limits: `/token` 150 per 5 min; `/otp`, `/magiclink`, `/verify` 30 per 5 min; built-in SMTP 2 emails per hour ([Supabase rate limits](https://supabase.com/docs/guides/auth/rate-limits)). Server-side calls share Vercel egress IPs; browser calls share the venue NAT IP.
+- Supavisor clients: Nano/Micro 200, Small 400, Medium 600 ([compute and disk](https://supabase.com/docs/guides/platform/compute-and-disk)).
+- Vercel function response body limit 4.5 MB: the live snapshot reaches it at about 3,000 people and 20k connections.
+- iOS Safari has no `BarcodeDetector`: in-app scanning does nothing on iPhone; the native camera on `/u/<handle>` works.
+
+## Pre-event checklist (short form)
+
+Ship fixes 1–5 and the missing indexes; upsize Supabase compute; custom SMTP and raised Auth limits if email sign-in is offered; keep old deployments; OpenAI Launch tier and a budget alert; a printed door QR; an iPhone "use the camera app" note; do not rotate the access code; freeze `main`.
+
+Related: [risks](risks.md), [architecture-stack](architecture-stack.md), [live-dashboard](live-dashboard.md), [docs/flows/edge-cases-and-risks.md](../docs/flows/edge-cases-and-risks.md).
diff --git a/wiki/index.md b/wiki/index.md
index 95d1f3a..0df1a9b 100644
--- a/wiki/index.md
+++ b/wiki/index.md
@@ -47,6 +47,7 @@ Read this page first. Every page in `wiki/` is listed here with a one-line summa
 - [agent-contract](agent-contract.md) — the plan's draft agent contract and the four prompts, translated.
 - [demo-script](demo-script.md) — the 3-minute demo script, key lines and pre-stage checklist.
 - [risks](risks.md) — eight risks with signals and plan B.
+- [conference-scale](conference-scale.md) — measured failure modes at conference load (auth, polling, pooler, page fan-out, rollback), platform limits and the pre-event checklist.
 - [delivery-checklist](delivery-checklist.md) — the eight items that define "ready".
 
 ## Repository documents outside the wiki
diff --git a/wiki/log.md b/wiki/log.md
index 6653ee4..88e7690 100644
--- a/wiki/log.md
+++ b/wiki/log.md
@@ -167,3 +167,7 @@ Append-only. Newest entry at the bottom. Entry format: `## [YYYY-MM-DD] <operati
 ## [2026-10-29] query | Admin console responsive pass
 
 - `/admin` now follows the V2 breakpoints (390/834/1440): tables from md, cards below, consequence dialogs proportional to stakes (`components/admin/ConfirmDialog.tsx`), inline validation in `EventForm`. UI only; no API or data-model change.
+
+## [2026-10-29] query | What breaks when COMPA runs live at a conference?
+
+- Local load test (1,000 test users, ~6k connections, Supavisor capped at 200 clients): per-request `auth.getUser()` turns Auth errors into 401 (52% of a check-in burst), the `lifetime_scores` view scans all connections on every 3 s poll (91% of DB time), the pooler refuses clients past 200, `/home` self-fetches wedge instances, and the deploy workflow deletes rollback targets. New page [conference-scale](conference-scale.md).
diff --git a/wiki/risks.md b/wiki/risks.md
index f42a989..9517437 100644
--- a/wiki/risks.md
+++ b/wiki/risks.md
@@ -13,4 +13,6 @@ The biggest risk is the live demo (network, time and adoption); each risk has a
 | Time runs out | P0 incomplete mid-evening | Cut in the order of the scope section; feature freeze 45 min before closing |
 | Closing time uncertain (page says 7 and 9 p.m.) | — | Confirm with the organizers now and adjust the timeline |
 
+Conference-scale infrastructure risks, measured: [conference-scale](conference-scale.md).
+
 Related: [mvp-scope](mvp-scope.md) (cut order), [timeline](timeline.md), [open-questions](open-questions.md).
```
