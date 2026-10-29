# Conference-scale readiness

What breaks when COMPA runs live at a conference (hundreds to thousands of phones, one projector), measured on a local stack on 2026-10-29. Full evidence, numbers and the reproduction script: [docs/research/conference-load.md](../docs/research/conference-load.md).

## Measured failure modes (local Supabase + 4 `next start`, 1,000 test users, ~6k connections)

| Rank | Failure | Measured | Fix | Status |
| --- | --- | --- | --- | --- |
| 1 | Every request called Supabase Auth over HTTP (`auth.getUser()`); any auth error became 401 | 52% 401 on a 1,000-person check-in burst; 39% 401 polling at 300 phones | `getClaims()` verifies the JWT locally (production signs ES256, JWKS cached 10 min); an Auth outage is `503 auth_unavailable`, never "signed out" (`lib/server/supabase.ts` `authUserId`) | Fixed |
| 2 | `GET /api/connections` read the `lifetime_scores` view, a full scan of all connections, every 3 s; rankings ran 2× per `/api/me` | 12.6 ms per call, 91% of DB time | User-scoped `lifetimePointsOf` (`lib/server/scores.ts`); rankings shared per instance for 3 s (`sharedRanking`) | Fixed |
| 3 | `/home` polls 2 endpoints every 3 s, no backoff or hidden-tab pause | 40 req/min per phone | Shared poller with backoff, pause, timeout; merge endpoints | Open |
| 4 | Supavisor client cap | `EMAXCONN` beyond 200 clients (Nano/Micro); app pool `max: 5`, no `idle_timeout` | `max: 3, idle_timeout: 20, connect_timeout: 5`; upsize compute for the day | Open |
| 5 | Pages fetch their own API over HTTP; `/home` pulls the live snapshot | 50 concurrent `/home` renders wedged all instances | Call `lib/server/*` directly or `cache()`; light live-card endpoint; `error.tsx` | Open |
| 6 | Deploy workflow deletes old deployments | No Instant Rollback | Keep the last N deployments; freeze `main` during the event | Open |
| 9 | Live snapshot unbounded, selected full user rows | 1.15 MB at 1k people / 6k links; 4.5 MB Vercel limit near 3k / 20k | Columns `id, name, photo_url` only; the 1,000 most recent links; counters from `count()`; each person carries `connections` (`lib/server/live.ts`) | Fixed |
| 14 | Missing indexes | Amplifies 2 and 3 | Migration `0008_conference_scale_indexes` | Fixed |
| 21 | Event door `GET /api/e/{code}` uncached, 2 counts per hit | Every door scan hits Postgres | Same 1 s CDN cache as `/live` (`LIVE_CACHE`, `lib/server/events.ts`) | Fixed |

Verified correct under concurrency: double-tap accept (one 200, one 409), mutual scans (one row), double check-in, 300 people scanning one speaker (no lock contention; scores are views, so there are no hot rows).

## Auth contract after finding 1

- `getClaims()` proves the access token was valid when issued; a server-side sign-out is seen when the token expires (1 h). Standard Supabase guidance for server checks.
- Signed out (401, or a redirect to sign-in in layouts) only for: no session, an expired or forged JWT, or a refresh token Auth rejected with a 4xx other than 429.
- Anything else (network, timeout, 5xx, 429) is `503 auth_unavailable`. Layouts and `currentMe()` throw instead of redirecting, so an outage never sends a signed-in person back through LinkedIn. Public routes (`currentUserOrNull`) answer anonymously.
- Local verification needs an asymmetric signing key; with HS256 `getClaims()` falls back to calling Auth. Local stack: `supabase gen signing-key --algorithm ES256`, wrapped in a JSON array, and `signing_keys_path` in `supabase/config.toml`.

## Platform limits that matter on the day

- Supabase Auth per-IP limits: `/token` 150 per 5 min; `/otp`, `/magiclink`, `/verify` 30 per 5 min; built-in SMTP 2 emails per hour ([Supabase rate limits](https://supabase.com/docs/guides/auth/rate-limits)). Server-side calls share Vercel egress IPs; browser calls share the venue NAT IP.
- Supavisor clients: Nano/Micro 200, Small 400, Medium 600 ([compute and disk](https://supabase.com/docs/guides/platform/compute-and-disk)).
- Vercel function response body limit 4.5 MB.
- iOS Safari has no `BarcodeDetector`: in-app scanning does nothing on iPhone; the native camera on `/u/<handle>` works.

## Pre-event checklist (short form)

Ship the open fixes above; upsize Supabase compute; custom SMTP and raised Auth limits if email sign-in is offered; keep old deployments; OpenAI Launch tier and a budget alert; a printed door QR; an iPhone "use the camera app" note; do not rotate the access code; freeze `main`.

Related: [risks](risks.md), [architecture-stack](architecture-stack.md), [live-dashboard](live-dashboard.md), [delivery-checklist](delivery-checklist.md), [docs/flows/edge-cases-and-risks.md](../docs/flows/edge-cases-and-risks.md).
