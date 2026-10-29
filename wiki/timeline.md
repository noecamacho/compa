# Timeline: 5 phases, 3 gates

The plan uses relative time from kickoff (T+0:00) and three gates; nobody moves to the next phase without crossing the previous one (p. 15).

## Diagram, transcribed (p. 16)

Caption in the source: "Three gates order the night: scaffold, full flow and freeze".

| Time | Phase | Content |
| --- | --- | --- |
| 0:00 – 0:20 | Kickoff (A) | PR #0: scaffold, SQL migration, `AGENTS.md` and Vercel deploy |
| — | **Gate 1:** PR #0 on `main`, everyone starts | |
| 0:20 – 1:20 | P0 in parallel (A, B, C, D) | Profile and QR · connections and points · summaries · `/live` and seeds |
| 1:20 – 1:40 | Integration | Merge #1 to #4 and test the full flow on iPhone and Android |
| — | **Gate 2:** P0 flow end to end in production | |
| 1:40 – freeze | P1 and polish | @tag, recording with consent, and `/live` animations |
| — | **Gate 3:** feature freeze, 45 min before closing | |
| freeze – close | Demo ready | Backup video, README with the agent workflow, submission and pitch rehearsed twice |

## Decided deadline (captain, 2026-10-28)

Submission of the MVP, `README.md` and a demonstration video is due before 10:00 on 2026-10-29. Feature freeze at 09:00; the last hour is README, video and submission. The relative phases above still order the work; see the fast path in [AGENTS.md](../AGENTS.md).

## Closing-time warning (p. 16)

Confirm the closing time now. The event page says 7 p.m. at the top and 9 p.m. in the details. If it is 7 p.m., the plan shrinks to P0 without @tag or recording, with seed data and a recorded demo. Tracked in [open-questions](open-questions.md) and [risks](risks.md).

The Jira breakdown by phase is in [docs/jira/compa-bootstrap-ticket.md](../docs/jira/compa-bootstrap-ticket.md). Related: [team-and-prs](team-and-prs.md), [delivery-checklist](delivery-checklist.md).
