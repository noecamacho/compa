# Event-day runbook: deploys, rollback and watching the app

How to keep COMPA deployable and observable while people scan, accept and watch `/e/<code>/live`. Source: conference-load investigation (2026-10-29, findings 6 and 15).

## Deploy freeze

Every push to `main` deploys to production with migrations and no preview ([git-workflow](../docs/git-workflow.md), `.github/workflows/vercel.yml`). From one hour before doors until the event ends:

- Merge nothing to `main` unless it is a fix for a live incident.
- Never trigger a Vercel build or redeploy by hand.

## Rollback

The deploy workflow keeps the **10 newest READY production deployments** and prunes the rest after a new deploy is READY (it never prunes if the new one failed). So Instant Rollback always has targets.

1. Vercel dashboard → project `compa` → Deployments → pick the last good production deployment → **Instant Rollback** (or `vercel rollback <deployment-url>`). This moves `compa.lol` in seconds and skips CI, migrate and build.
2. Migrations are forward-only and run on deploy ([AGENTS.md](../AGENTS.md)): roll code back only to a deployment compatible with the current schema. Migrations are additive (expand first), so the previous deployment normally still works.
3. Then revert the bad commit on `main` through a PR. Instant Rollback pins the project to the old deployment until the next production deploy.

Fallback when no target is usable: revert on `main`, wait for CI, migrate and build (5–10 min).

## What to watch

| Signal | Where | Meaning |
| --- | --- | --- |
| `GET /api/health` | Browser, or an uptime monitor at ≤1 request/min | 200 `{status:"ok",db:"ok"}`; 503 `{status:"degraded",db:"down"}` when `select 1` fails or takes over 2 s. Never cached. |
| JSON error lines | Vercel → project → Logs, search `"level":"error"` | Fields: `event` (`route_error`, `render_error`, `action_error`, `proxy_error`), `requestId`, `method`, `path` (no query), `status`, `digest`, `error`. |
| A user's report | Error screens show `Ref: <digest>`; every API error response has an `x-request-id` header | Search the Vercel logs for that value. Route errors log `requestId` (Vercel's `x-vercel-id`); render errors log `digest` too. |
| Function errors and duration per route | Vercel → Observability | Built in on Pro; no extra service. |
| Database CPU and connections | Supabase dashboard → Reports | Upsize compute when connections or CPU saturate. |

Only 5xx are logged on routes; 4xx are expected business answers (see `lib/api/errors.ts`).

## Error screens

`app/error.tsx` covers pages outside the signed-in app, `app/(app)/error.tsx` the attendee screens, `app/admin/error.tsx` the console, and `app/global-error.tsx` a crash of the root layout itself (inline styles, no global CSS). Each offers a retry.

Related: [risks](risks.md), [delivery-checklist](delivery-checklist.md), [live-dashboard](live-dashboard.md).
