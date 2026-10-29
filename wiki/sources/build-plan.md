# Source: COMPA build plan (PDF)

**File:** [`raw/pasillo-plan-de-construccion.pdf`](../../raw/pasillo-plan-de-construccion.pdf), 21 pages, Spanish.
**Title in the source:** "Build plan" (translated). The source PDF calls this product "Pasillo"; the product name is COMPA and that is the only name used in this repository.
**Context:** written for the Codex Community Hackathon GDL, 2026-10-28, author credited as Sebastian Gandoulf Perez (p. 1).

## Page map

| Pages | Section in the source | Wiki page |
| --- | --- | --- |
| 1 | Summary, one-line pitch, why it can win, design rule | [overview](../overview.md) |
| 1–2 | Problem, users, goals, success metrics | [users](../users.md), [success-metrics](../success-metrics.md) |
| 2–3 | MVP scope: in (P0/P1/P2), out of scope, cut order | [mvp-scope](../mvp-scope.md) |
| 3–4 | User flow diagram (8 steps, 1 decision) | [connection-flow](../connection-flow.md) |
| 4–6 | Specs per screen (7 screens) with acceptance criteria | [screens](../screens/README.md) |
| 6–7 | Gamification and `/live` dashboard: layout, points, live topics, P2 rounds and badges | [live-dashboard](../live-dashboard.md), [points-rules](../points-rules.md), [topics-vocabulary](../topics-vocabulary.md), [rounds-and-badges](../rounds-and-badges.md) |
| 7–8 | Architecture and stack (diagram, 5 components; table of layer choices) | [architecture-stack](../architecture-stack.md) |
| 9–11 | Data model (4 tables, SQL) and API (route handlers) | [data-model](../data-model.md), [api](../api.md) |
| 11–12 | AI: transcription, summaries, topics; JSON schema; system prompt; models; fallbacks | [ai-jobs](../ai-jobs.md) |
| 12–13 | Privacy and consent | [privacy-consent](../privacy-consent.md) |
| 13–15 | Team split, PR merge order, work rules, PR template | [team-and-prs](../team-and-prs.md) |
| 15–16 | Timeline (5 phases, 3 gates) and closing-time warning | [timeline](../timeline.md) |
| 16–18 | AGENTS.md draft and four agent prompts (A–D) | [agent-contract](../agent-contract.md) |
| 19 | Demo script and pitch for JSConf | [demo-script](../demo-script.md) |
| 19–20 | Risks and plan B | [risks](../risks.md) |
| 20–21 | Delivery checklist | [delivery-checklist](../delivery-checklist.md) |

## Diagrams (not in the text layer)

- p. 4: connection flow, "8 steps, 1 decision". Transcribed in [connection-flow](../connection-flow.md).
- p. 8: architecture, "5 components". Transcribed in [architecture-stack](../architecture-stack.md).
- p. 16: timeline, "5 phases, 3 gates". Transcribed in [timeline](../timeline.md).

## Known contradictions and gaps

Collected in [open-questions](../open-questions.md). The plan itself flags one: the event page states two different closing times (p. 16, p. 20).
