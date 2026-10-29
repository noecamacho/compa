# Conference-scale readiness

What breaks when COMPA runs live at a conference (hundreds to thousands of phones, one projector), measured on a local stack on 2026-10-29. Full evidence, numbers and the reproduction script: [docs/research/conference-load.md](../docs/research/conference-load.md).

## Measured failure modes (local Supabase + 4 `next start`, 1,000 test users, ~6k connections)

| Rank | Failure | Measured | Fix | Status |
| --- | --- | --- | --- | --- |
| 1 | Every request called Supabase Auth over HTTP (`auth.getUser()`); any auth error became 401 | 52% 401 on a 1,000-person check-in burst; 39% 401 polling at 300 phones | `getClaims()` verifies the JWT locally (production signs ES256, JWKS cached 10 min); an Auth outage is `503 auth_unavailable`, never "signed out" (`lib/server/supabase.ts` `authUserId`) | Fixed |
| 2 | `GET /api/connections` read the `lifetime_scores` view, a full scan of all connections, every 3 s; rankings ran 2× per `/api/me` | 12.6 ms per call, 91% of DB time | User-scoped `lifetimePointsOf` (`lib/server/scores.ts`); rankings shared per instance for 3 s (`sharedRanking`) | Fixed |
| 3 | `/home` polled 2 endpoints every 3 s, no backoff or hidden-tab pause | 40 req/min per phone | Shared poller `lib/use-poll.ts`: one call in flight, paused in a hidden tab, backoff to 30 s, ±20 % jitter, 8 s abort. With the private Realtime channel joined (live notifications), requests and the bell poll only every 30 s as a safety net; without it, every 3 s. Simulated per phone: 3 calls/min with Realtime; without it 34 visible, 18 when hidden half the time, 8 while the API fails | Fixed |
| 4 | Supavisor client cap | `EMAXCONN` beyond 200 clients (Nano/Micro); app pool `max: 5`, no `idle_timeout` | `idle_timeout: 20, connect_timeout: 5, max_lifetime: 300`, `max` kept at 5 (see the stall below); warning on a session-pooler URL (`db/connect.ts`). Measured: 30 new instances after 40 went idle, 0/150 → 150/150 queries OK. Upsize compute for the day | Fixed |
| 5 | Pages fetched their own API over HTTP; `/home` pulled the live snapshot | 16 concurrent `/home` renders on 2 local instances wedged both (64 inner `UND_ERR_HEADERS_TIMEOUT`) | Route handlers run in-process (`lib/api/server-fetch.ts`, table in `lib/server/in-process-routes.ts`), one `/api/me` per render; the `/home` render reads only the door; its live card fetches `GET /api/e/{code}/live` from the browser (1 s CDN cache) every 15 s | Fixed |
| 6 | Deploy workflow deleted old deployments | No Instant Rollback | Keep the last 10 deployments; freeze `main` during the event ([event-day-runbook](event-day-runbook.md)) | Fixed |
| 13 | Write path awaited side effects | Up to +1.5 s per check-in, scan, accept and approval while Realtime is slow | Broadcasts, badges and accept extras run after the response (`lib/after-response.ts`); invite points paid in one transaction | Fixed |
| 18 | The scanned person on My QR never saw the request | Pollers lived only on `/home` | App-wide live notifications (Realtime plus fallback poll) in the `(app)` layout, branch `fm/compa-notifications` | In review |
| 9 | Live snapshot unbounded, selected full user rows | 1.15 MB at 1k people / 6k links; 4.5 MB Vercel limit near 3k / 20k | Columns `id, name, photo_url` only; the 1,000 most recent links; counters from `count()`; each person carries `connections` (`lib/server/live.ts`) | Fixed |
| 14 | Missing indexes | Amplifies 2 and 3 | Migration `0009_conference_scale_indexes` | Fixed |
| 10 | In-app QR scanning dead on iPhone Safari and Firefox (no `BarcodeDetector`) | Headless Chromium without the API: QR never read; after: read in 3.7 s | `jsqr` loaded only on those browsers; the banner names the camera problem and points to the camera app (`components/connect/ScanPanel.tsx`) | Fixed |
| 16 | Invite claim and creation races | 40 of 50 concurrent first loads of `/api/invites/me` returned 500 (23505); a second claim overwrote the first | Claim only an unclaimed invite; `onConflictDoNothing`, re-read, suffixed code (`lib/server/invites.ts`) | Fixed |
| 17 | Client writes without timeout or offline handling; raw English errors; failed audio dropped | A hung accept spun past 20 s; an offline decline went home with the request still pending | 15 s timeout (drafts 35 s, audio 40 s), one GET retry on a network failure, Spanish `errorText`, kept audio with retry (`lib/api/client.ts`) | Fixed |
| 19 | Access-code rotation sent the projector to "not found" | After a rotation the screen showed not-found within 8 s | A 404 keeps the last snapshot with a "code changed" pill (`lib/live-state.ts`) | Fixed |
| 20 | Outages invisible on the projector; hung fetches never resolved | A hung snapshot showed nothing; 7 requests piled up in 20 s | 8 s timeout, one poll in flight, "data from N s ago" pill, `app/e/[code]/live/error.tsx` retries every 10 s | Fixed |
| 21 | Event door `GET /api/e/{code}` uncached, 2 counts per hit | Every door scan hits Postgres | Same 1 s CDN cache as `/live` (`LIVE_CACHE`, `lib/server/events.ts`) | Fixed |

New, found while fixing 4: through the local Supavisor (transaction mode), postgres.js queries that queue behind a busy connection can stall until the function times out; the same bursts run fine against Postgres directly. Matches the open report porsager/postgres#970. Not verified on production; the pool stays at 5 so fewer queries queue. Watch function durations at doors-open.

Verified correct under concurrency: double-tap accept (one 200, one 409), mutual scans (one row), double check-in, 300 people scanning one speaker (no lock contention; scores are views, so there are no hot rows).

## Auth contract after finding 1

- `getClaims()` proves the access token was valid when issued; a server-side sign-out is seen when the token expires (1 h). Standard Supabase guidance for server checks.
- Signed out (401, or a redirect to sign-in in layouts) only for: no session, an expired or forged JWT, or a refresh token Auth rejected with a 4xx other than 429.
- Anything else (network, timeout, 5xx, 429) is `503 auth_unavailable`. Layouts and `currentMe()` throw (to `app/error.tsx`) instead of redirecting, so an outage never sends a signed-in person back through LinkedIn. `currentMe()` reads only a 401 or 404 from `/api/me` as a visitor. Public routes (`currentUserOrNull`) answer anonymously.
- Server Components cannot write cookies, so `setAll` ignores that failure (the Supabase SSR pattern) instead of turning a token refresh during a render into a 503. Persisting refreshed sessions on page loads (`proxy.ts`) is finding 8, still open.
- Local verification needs an asymmetric signing key; with HS256 `getClaims()` falls back to calling Auth. Local stack: `supabase gen signing-key --algorithm ES256`, wrapped in a JSON array, and `signing_keys_path` in `supabase/config.toml`.

## Platform limits that matter on the day

- Supabase Auth per-IP limits: `/token` 150 per 5 min; `/otp`, `/magiclink`, `/verify` 30 per 5 min; built-in SMTP 2 emails per hour ([Supabase rate limits](https://supabase.com/docs/guides/auth/rate-limits)). Server-side calls share Vercel egress IPs; browser calls share the venue NAT IP.
- Supavisor clients: Nano/Micro 200, Small 400, Medium 600 ([compute and disk](https://supabase.com/docs/guides/platform/compute-and-disk)).
- Vercel function response body limit 4.5 MB.
- iOS Safari has no `BarcodeDetector`: in-app scanning uses the jsQR fallback there (finding 10); the native camera on `/u/<handle>` also works.

## Pre-event checklist (short form)

Ship the open fixes above; upsize Supabase compute; custom SMTP and raised Auth limits if email sign-in is offered; keep old deployments; OpenAI Launch tier and a budget alert; a printed door QR; an iPhone "use the camera app" note; do not rotate the access code; freeze `main`.

Related: [risks](risks.md), [architecture-stack](architecture-stack.md), [live-dashboard](live-dashboard.md), [delivery-checklist](delivery-checklist.md), [docs/flows/edge-cases-and-risks.md](../docs/flows/edge-cases-and-risks.md).
