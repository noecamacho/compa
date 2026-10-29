# COMPA wiki — index

Read this page first. Every page in `wiki/` is listed here with a one-line summary. Claims cite the page of the source PDF they come from (`p. N`). Append to [log.md](log.md) whenever knowledge changes.

## Start here

- [overview](overview.md) — what COMPA is, the pitch, the 2-tap design rule and the build goal.
- [open-questions](open-questions.md) — 56 contradictions, gaps and ambiguities; resolved items are marked with their decision.
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
- [live-dashboard](live-dashboard.md) — the projected `/live` layout, data feeds and privacy limits; as built: Loom+ with pulse, feed and state cards.
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
- [event-day-runbook](event-day-runbook.md) — deploy freeze, Instant Rollback (last 10 production deployments kept), health endpoint and structured error logs.
- [conference-scale](conference-scale.md) — measured failure modes at conference load (auth, scores, polling, pooler, page fan-out, live payload, rollback), fix status, platform limits and the pre-event checklist.
- [delivery-checklist](delivery-checklist.md) — the eight items that define "ready".

## Repository documents outside the wiki

- [AGENTS.md](../AGENTS.md) — the single instruction file for every agent and contributor.
- [ARCHITECTURE.md](../ARCHITECTURE.md) — system overview and ADR-style decisions derived from the plan.
- [DESIGN.md](../DESIGN.md) — product and UX design from the V2 handoff: principles, 16 screens with routes, tokens, components, internationalization, states, pending screens, `/live`, decided vs open.
- [docs/backend-gap-analysis.md](../docs/backend-gap-analysis.md) — V2 vs specs vs code: 35 use cases checked end to end (Ready, Partial, Mock-only, Missing, Conflict), 15 conflicts, edge cases, post-freeze P0/P1/P2 backlog, i18n status.
- [docs/testing/real-mode.md](../docs/testing/real-mode.md) — testing against the real database: test users without LinkedIn, sign-in-as, the automation header, the Codex Conf 2026 seed, safety rules.
- [docs/flows/README.md](../docs/flows/README.md) — user flows and build backlog: how agents pick a ticket, definition of done (Playwright e2e per flow), the e2e harness (`bun run e2e`, fixtures, tags, CI).
  - [docs/flows/actors-and-permissions.md](../docs/flows/actors-and-permissions.md) — 14 actors, permission matrix, CRUD matrix per entity, 34 missing CRUD operations.
  - [docs/flows/catalog.md](../docs/flows/catalog.md) — 74 user flows (F-01–F-74) with steps, error codes, edge cases, status per layer, e2e coverage and tickets.
  - [docs/flows/edge-cases-and-risks.md](../docs/flows/edge-cases-and-risks.md) — 40 unhandled risks (abuse, AI, privacy, operations, concurrency, security) with tickets.
  - [docs/flows/backlog.md](../docs/flows/backlog.md) — 86 agent-ready tickets (T-000–T-122; 12 P0, 48 P1, 26 P2) by epic, with e2e scenarios.
- [docs/research/live-dataviz.md](../docs/research/live-dataviz.md) — live data-viz research: simulator, big-screen and phone concepts, DV/DP tickets.
- [docs/research/conference-load.md](../docs/research/conference-load.md) — conference load test: measurements, 22 ranked infrastructure findings, runbook and the reproduction script.
- [docs/research/live-dataviz-decision.md](../docs/research/live-dataviz-decision.md) — the live board that shipped (Loom+): four concepts scored, scale work, scenario screenshots.
- [docs/research/ux-audit.md](../docs/research/ux-audit.md) — whole-app UX and edge-case audit at all breakpoints; 139 findings, UX-A/UX-P tickets.
- [Codex evidence](../docs/evidence/codex/README.md) — five bilingual marketing edits, editable compositions, session evidence, sources and verification limits.
- [CHANGELOG.md](../CHANGELOG.md) — Keep a Changelog history.
- [docs/api-quickstart.md](../docs/api-quickstart.md) — local mock requests, backend setup, and email sign-in requirements for hosted Supabase.
- [docs/engineering-standards.md](../docs/engineering-standards.md) — SOLID, KISS, DRY, no nesting, clean code.
- [docs/git-workflow.md](../docs/git-workflow.md) — commits, branches, versioning, hooks.
- [docs/agent-tooling.md](../docs/agent-tooling.md) — caveman, ponytail, Serena, repomix.
- [docs/jira/compa-bootstrap-ticket.md](../docs/jira/compa-bootstrap-ticket.md) — the Epic draft, ready to paste.
- [docs/specs/2026-10-29-data-model.md](../docs/specs/2026-10-29-data-model.md) — approved data model: users (LinkedIn-only), interests, events, check-ins, confirmed connections scoring 20 new / 10 reconnection, per-field visibility.
- [docs/specs/2026-10-29-api.md](../docs/specs/2026-10-29-api.md) — approved API: LinkedIn auth, profile and visibility, check-in, scan → pending → accept (20/10), silent decline, connections by person, public `/live` snapshot, leaderboard, Realtime channels.
- [docs/plans/2026-10-28-mvp-api-plan.md](../docs/plans/2026-10-28-mvp-api-plan.md) — MVP API plan: LinkedIn OIDC sign-up with handle+code fallback, field visibility, entities, 18 routes, connection tracking, `/live` contract, tonight's build plan.
- [docs/contracts/ai-summaries-api.md](../docs/contracts/ai-summaries-api.md) — transcribe, draft and approve routes, recorder usage and UI mocks.
