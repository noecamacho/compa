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

Decision records derived from this page: [ARCHITECTURE.md](../ARCHITECTURE.md). Related: [data-model](data-model.md), [api](api.md), [ai-jobs](ai-jobs.md), [agent-contract](agent-contract.md).
