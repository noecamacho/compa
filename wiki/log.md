# Wiki log

Append-only. Newest entry at the bottom. Entry format: `## [YYYY-MM-DD] <operation> | <title>` where operation is `ingest`, `query` or `lint` (see [AGENTS.md](../AGENTS.md)).

## [2026-10-28] ingest | COMPA build plan PDF (21 pages)

- Source: `raw/pasillo-plan-de-construccion.pdf`, read in full (text layer plus page images for the diagrams on p. 4, p. 8 and p. 16).
- Created: `sources/build-plan`, `overview`, `users`, `success-metrics`, `mvp-scope`, `connection-flow`, `screens/*` (6 pages plus README), `live-dashboard`, `points-rules`, `topics-vocabulary`, `rounds-and-badges`, `privacy-consent`, `architecture-stack`, `data-model`, `api`, `ai-jobs`, `team-and-prs`, `timeline`, `agent-contract`, `demo-script`, `risks`, `delivery-checklist`, `open-questions`, `glossary`, `index`.
- Naming: the source uses a former product name; the wiki uses COMPA everywhere and records the former name only in the glossary and the source summary.
- Decisions recorded outside the wiki: `ARCHITECTURE.md` (ADR-001 to ADR-009 derived from p. 7–11), `DESIGN.md` (principles from p. 1, p. 6, p. 17).
- Open questions: 18 items logged in `open-questions`, including the plan's own closing-time contradiction (p. 16, p. 20).
- Decision recorded (captain, 2026-10-28 19:30): submission deadline 10:00 on 2026-10-29 for MVP, README and demo video; logged in `timeline` and `open-questions` #1; fast-path rules added to `AGENTS.md`.
- Repository PR template: derived from the plan's template (p. 15) and extended with Jira, wiki impact and standards gates; the plan's "Video / GIF" item became the optional evidence line under "How it was tested".

## [2026-10-28] lint | Stack decision: Bun, Supabase, Vercel

- Team decision (user, 2026-10-28): Bun is the package manager and runtime, replacing the plan's pnpm (p. 17); Next.js + strict TypeScript + Tailwind stays; Supabase and Vercel confirmed.
- Updated: `architecture-stack`, `agent-contract`, `ARCHITECTURE.md` (ADR-001), `AGENTS.md` section 4, `docs/jira/compa-bootstrap-ticket.md`, `.gitignore` (non-Bun lockfiles ignored).

## [2026-10-28] ingest | Codex Build Day Guadalajara slides (14 slides)

- Source: `raw/build-day-slides/slide-01.png` to `slide-14.png`, read in full from the page images; page and links captured in `sources/build-day-slides`.
- Created: `sources/build-day-slides`, `hackathon-requirements`.
- Updated: `timeline` (event and submission deadlines now sourced), `delivery-checklist` (submission items the plan lacks), `open-questions` (#1 resolved by the deck, #14 extended, #19 added on Codex evidence), `glossary`, `index`.
- Hook change: `raw/README.md` is exempt from the `raw/` immutability check so the source index can grow.

## [2026-10-28] query | Which license does COMPA use?

- The captain chose MIT; `LICENSE` added. Updated `open-questions` #14 (license resolved, repository visibility still open).

## [2026-10-29] query | AI core for transcription and summaries

- `lib/ai/*` implements `ai-jobs`: Spanish transcription, Structured Outputs summary, verbatim fallback (p. 12). `lib/topics.ts` ships a 41-topic placeholder list until `open-questions` #4 is settled.

## [2026-10-29] query | API scaffold from the data-model and API specs

- Code implements `docs/specs/2026-10-29-data-model.md` and `2026-10-29-api.md` (branch `docs/COMPA-TBD-mvp-api-plan`): `db/schema.ts`, `drizzle/0000_init.sql`, `lib/api/routes.ts` (contract, mock mode, `openapi.json`) and `lib/server/*`; usage in `docs/api-quickstart.md`. Summaries award `SUMMARY_POINTS = 25` per M18, which the summaries contract still contradicts ("no points").
