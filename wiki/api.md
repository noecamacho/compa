# API (Next.js route handlers) (p. 10–11)

| Method | Route | What it does | Priority (inferred) |
| --- | --- | --- | --- |
| POST | `/api/attendees` | Creates the profile, normalizes links, generates handle and code, sets the cookie | P0 |
| POST | `/api/session/recover` | Handle + code → cookie | P0 |
| GET | `/api/attendees/search?q=` | @tag autocomplete | P1 |
| POST | `/api/connections` | `{ targetHandle, method }` → creates the connection idempotently and awards points | P0 |
| GET | `/api/connections` | My connections with card and summary status | P0 |
| POST | `/api/transcribe` | Audio → text | P0 (dictation) / P1 (recording) |
| POST | `/api/interactions/draft` | Text → `{summary, topics, next_steps, substantive}` | P0 |
| POST | `/api/interactions/:id/approve` | Approves, shares with both and awards points | P0 |
| GET | `/api/live` | Initial snapshot of leaderboard, topics and counters | P0 |

Priorities are inferred from [mvp-scope](mvp-scope.md); the plan marks only the search route as P1 (p. 10).

## Server-side rules (p. 11, p. 17)

- Points, idempotency, the hourly cap and the check that the author belongs to the connection run on the server, never on the client.
- Never call OpenAI or award points from the client.
- Every write is validated with zod.
- Approve blocks when `substantive=false` and awards +25 to each party (p. 18).

Ownership by route: [team-and-prs](team-and-prs.md). Related: [data-model](data-model.md), [ai-jobs](ai-jobs.md).
