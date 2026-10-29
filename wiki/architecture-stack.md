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

Package manager: pnpm; strict TypeScript (p. 17). Commands: `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm seed` (p. 17).

Decision records derived from this page: [ARCHITECTURE.md](../ARCHITECTURE.md). Related: [data-model](data-model.md), [api](api.md), [ai-jobs](ai-jobs.md), [agent-contract](agent-contract.md).
