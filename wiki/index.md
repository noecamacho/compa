# COMPA wiki — index

Read this page first. Every page in `wiki/` is listed here with a one-line summary. Claims cite the page of the source PDF they come from (`p. N`). Append to [log.md](log.md) whenever knowledge changes.

## Start here

- [overview](overview.md) — what COMPA is, the pitch, the 2-tap design rule and the build goal.
- [open-questions](open-questions.md) — 18 contradictions, gaps and ambiguities in the plan; nothing here is decided.
- [glossary](glossary.md) — English terms with the original Spanish source terms.

## Sources

- [sources/build-plan](sources/build-plan.md) — summary of the 21-page build plan PDF with a page map and the three diagrams.

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

- [team-and-prs](team-and-prs.md) — four people, four branches, PR merge order, work rules and the plan's PR template.
- [timeline](timeline.md) — five phases and three gates in relative time, plus the closing-time warning.
- [agent-contract](agent-contract.md) — the plan's draft agent contract and the four prompts, translated.
- [demo-script](demo-script.md) — the 3-minute demo script, key lines and pre-stage checklist.
- [risks](risks.md) — eight risks with signals and plan B.
- [delivery-checklist](delivery-checklist.md) — the eight items that define "ready".

## Repository documents outside the wiki

- [AGENTS.md](../AGENTS.md) — the single instruction file for every agent and contributor.
- [ARCHITECTURE.md](../ARCHITECTURE.md) — system overview and ADR-style decisions derived from the plan.
- [DESIGN.md](../DESIGN.md) — product and UX design intent derived from the plan.
- [CHANGELOG.md](../CHANGELOG.md) — Keep a Changelog history.
- [docs/engineering-standards.md](../docs/engineering-standards.md) — SOLID, KISS, DRY, no nesting, clean code.
- [docs/git-workflow.md](../docs/git-workflow.md) — commits, branches, versioning, hooks.
- [docs/agent-tooling.md](../docs/agent-tooling.md) — caveman, ponytail, Serena, repomix.
- [docs/jira/compa-bootstrap-ticket.md](../docs/jira/compa-bootstrap-ticket.md) — the Epic draft, ready to paste.
