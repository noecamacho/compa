# COMPA wiki — index

Read this page first. Every page in `wiki/` is listed here with a one-line summary. Claims cite the page of the source PDF they come from (`p. N`). Append to [log.md](log.md) whenever knowledge changes.

## Start here

- [overview](overview.md) — what COMPA is, the pitch, the 2-tap design rule and the build goal.
- [open-questions](open-questions.md) — 42 contradictions, gaps and ambiguities; resolved items are marked with their decision.
- [glossary](glossary.md) — English terms with the original Spanish source terms.

## Sources

- [sources/build-plan](sources/build-plan.md) — summary of the 21-page build plan PDF with a page map and the three diagrams.
- [sources/build-day-slides](sources/build-day-slides.md) — summary of the 14-slide Codex Build Day Guadalajara deck with a slide map.

## Product

- [users](users.md) — the problem and the three users: attendee, organizer, audience.
- [success-metrics](success-metrics.md) — the three demo metrics (60 s onboarding, 2 s live update, 20 connections).
- [mvp-scope](mvp-scope.md) — the 11 features by priority, what is out of scope and the cut order.
- [connection-flow](connection-flow.md) — the 8-step, 1-decision flow from profile to `/live`.
- [screens](screens/README.md) — the seven screens and their routes.
  - [screens/join](screens/join.md) — profile form, link normalization, handle and code.
  - [screens/me](screens/me.md) — home with the personal QR and counters.
  - [screens/scan](screens/scan.md) — `/c/[handle]`: connect with or without a session.
  - [screens/connection](screens/connection.md) — "Connected with…" card and the record or summarize choice.
  - [screens/summary](screens/summary.md) — dictate or write, AI draft, approve.
  - [screens/connections](screens/connections.md) — list of connections, pending summaries first.
- [live-dashboard](live-dashboard.md) — the projected `/live` layout, data feeds and privacy limits.
- [points-rules](points-rules.md) — the points table, hourly cap and idempotency rules.
- [topics-vocabulary](topics-vocabulary.md) — the fixed list of about 40 topics and where it is used.
- [rounds-and-badges](rounds-and-badges.md) — P2 rounds, badges, tribe scoreboard and "ask your event".
- [privacy-consent](privacy-consent.md) — recording consent, approval, opt-out, seeds and the `/join` notice.

## System

- [architecture-stack](architecture-stack.md) — single Next.js app on Vercel, Supabase, OpenAI; layer choices and why.
- [data-model](data-model.md) — the four tables with columns, constraints and the pair index.
- [api](api.md) — the nine route handlers and the server-side rules.
- [ai-jobs](ai-jobs.md) — transcription, profile pre-fill, summary schema, prompt, models and fallbacks.

## Delivery

- [hackathon-requirements](hackathon-requirements.md) — submission contents, eligibility, deadlines (Thu 29 10:00), evidence of Codex use, voting.
- [team-and-prs](team-and-prs.md) — four people, four branches, PR merge order, work rules and the plan's PR template.
- [timeline](timeline.md) — five phases and three gates in relative time, plus the closing-time warning.
- [agent-contract](agent-contract.md) — the plan's draft agent contract and the four prompts, translated.
- [demo-script](demo-script.md) — the 3-minute demo script, key lines and pre-stage checklist.
- [risks](risks.md) — eight risks with signals and plan B.
- [delivery-checklist](delivery-checklist.md) — the eight items that define "ready".

## Repository documents outside the wiki

- [AGENTS.md](../AGENTS.md) — the single instruction file for every agent and contributor.
- [ARCHITECTURE.md](../ARCHITECTURE.md) — system overview and ADR-style decisions derived from the plan.
- [DESIGN.md](../DESIGN.md) — product and UX design from the V2 handoff: principles, 16 screens with routes, tokens, components, internationalization, states, pending screens, `/live`, decided vs open.
- [docs/backend-gap-analysis.md](../docs/backend-gap-analysis.md) — V2 vs specs vs code: 34 use cases by status, 15 conflicts to decide, edge cases, P0/P1/P2 backlog, i18n backend impact.
- [CHANGELOG.md](../CHANGELOG.md) — Keep a Changelog history.
- [docs/engineering-standards.md](../docs/engineering-standards.md) — SOLID, KISS, DRY, no nesting, clean code.
- [docs/git-workflow.md](../docs/git-workflow.md) — commits, branches, versioning, hooks.
- [docs/agent-tooling.md](../docs/agent-tooling.md) — caveman, ponytail, Serena, repomix.
- [docs/jira/compa-bootstrap-ticket.md](../docs/jira/compa-bootstrap-ticket.md) — the Epic draft, ready to paste.
- [docs/specs/2026-10-29-data-model.md](../docs/specs/2026-10-29-data-model.md) — approved data model: users (LinkedIn-only), interests, events, check-ins, confirmed connections scoring 20 new / 10 reconnection, per-field visibility.
- [docs/specs/2026-10-29-api.md](../docs/specs/2026-10-29-api.md) — approved API: LinkedIn auth, profile and visibility, check-in, scan → pending → accept (20/10), silent decline, connections by person, public `/live` snapshot, leaderboard, Realtime channels.
- [docs/plans/2026-10-28-mvp-api-plan.md](../docs/plans/2026-10-28-mvp-api-plan.md) — MVP API plan: LinkedIn OIDC sign-up with handle+code fallback, field visibility, entities, 18 routes, connection tracking, `/live` contract, tonight's build plan.
- [docs/contracts/ai-summaries-api.md](../docs/contracts/ai-summaries-api.md) — transcribe, draft and approve routes, recorder usage and UI mocks.
