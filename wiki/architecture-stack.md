# Architecture and stack

A single Next.js app on Vercel serves the phone and `/live`; Supabase stores the data and pushes changes in real time; OpenAI is only called from the server (p. 7).

## Diagram, transcribed (p. 8, "5 components")

Caption in the source: "Everything goes through the server and /live listens for changes in real time".

- **Attendee's phone** — `/join` · `/me` · `/c/[handle]` · `/connection` · `/connections`. Browser, no install. → Next.js
- **`/live` screen** — podium, topics, counters; projected on stage. → Next.js, and ← Realtime from Supabase
- **Next.js on Vercel** — `/api/attendees`, `/api/connections`, `/api/interactions`, `/api/transcribe`, `/api/live`; `lib/points.ts`: points and rules. → OpenAI API, → Supabase
- **OpenAI API** — voice transcription; summaries with a schema
- **Supabase** — Postgres: 4 tables; Realtime: live changes
- **Codex SDK (P2, dashed)** — organizer's analyst: "ask your event"

## Layer choices (p. 8)

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend and API | Next.js (App Router) + TypeScript + Tailwind | One repo, one deploy, the language of the JSConf audience |
| Data and real time | Supabase (Postgres + Realtime) | Tables in minutes and subscriptions for `/live` |
| AI | OpenAI API (transcription + Structured Outputs) | JSON output validated by schema |
| QR | `qrcode` to generate; native camera to scan | No own scanner: the QR is a URL |
| Animations | framer-motion | Podium and bars that reorder |
| Validation | zod | Same schemas on client and server |
| Deploy | Vercel + short domain | HTTPS for microphone and camera |

Scanning with the native camera avoids the iPhone problem: Safari has no `BarcodeDetector`, so no in-app scanner is built (p. 8).

Package manager and runtime: Bun (team decision 2026-10-28, replaces the plan's pnpm); backend and hosting: Supabase and Vercel (confirmed by the team); strict TypeScript (p. 17). Commands: `bun run dev`, `bun run lint`, `bun run typecheck`, `bun run build`, `bun run seed` (p. 17).

## Load-bearing choices at conference scale ([conference-scale](conference-scale.md))

- Sessions are checked with `supabase.auth.getClaims()`: the JWT is verified locally against the cached JWKS (ES256), so a request does not call Supabase Auth; an Auth failure is `503 auth_unavailable`, never "signed out" (`lib/server/supabase.ts`).
- Scores stay views (no hot rows); per-person reads go through that person's rows (`lifetimePointsOf`), whole-board rankings are shared per instance for 3 s (`sharedRanking`, `lib/server/scores.ts`).
- Public event reads (`/api/e/{code}`, `/live`) carry a 1 s CDN cache; the live snapshot is capped at the 1,000 most recent links.

### Polling, page reads, pool and side effects

Measured on a local stack (Supavisor capped at 200 clients, two `next start` instances); numbers in [conference-scale](conference-scale.md).

| Concern | How the app behaves now | Where |
| --- | --- | --- |
| Client polling | One shared poller: one call in flight, paused in a hidden tab, exponential backoff to 30 s, ±20 % jitter, 8 s abort. `/home` polls requests every 5 s and the bell every 10 s (about 18 calls per minute per phone instead of 40) | `lib/use-poll.ts` |
| Page data | Server Components run the route handler in-process instead of fetching their own API over HTTP; one `/api/me` per render. `/home` reads the event door and the three newest pairs (`GET /api/e/{code}/live/recent`), never the full big-screen snapshot | `lib/api/server-fetch.ts`, `lib/server/in-process-routes.ts` |
| Database pool | Per instance: `max` 5, idle sockets closed after 20 s, connect timeout 5 s; warns when `DATABASE_URL` is the session pooler (5432) | `db/connect.ts` |
| Side effects | Realtime broadcasts, badge awards and the accept extras run after the response (`after()`); invite points are paid in one transaction | `lib/after-response.ts`, `lib/realtime.ts` |

Decision records derived from this page: [ARCHITECTURE.md](../ARCHITECTURE.md). Related: [data-model](data-model.md), [api](api.md), [ai-jobs](ai-jobs.md), [agent-contract](agent-contract.md).
