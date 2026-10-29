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

## As built: connections outside an event (2026-10-29)

The shipped routes are in `lib/api/routes.ts` and `openapi.json`. For connections made outside an event:

| Route | Event-less behaviour |
| --- | --- |
| `POST /api/connections` | No running event for the scanned person → `201` with `event: null`; repeat or reverse scan → `200` with the same id; test user with a real user → `409 test_user_not_allowed`. `not_at_event` no longer exists |
| `POST /api/connections/{id}/accept` | `points: 0`, kind kept; no topics bonus, referral, badges or live broadcast; concurrent accepts: one `200`, the other `409 not_pending` |
| `POST /api/connections/{id}/decline`, `PATCH …/knew` | unchanged; an event-less request never expires |
| `GET /api/connections`, `GET /api/connections/{id}` | `event: null` on meetings, incoming requests and the detail; points breakdown all 0 |
| `GET /api/notifications` | `eventName: null`; an event-less request stays until answered |
| `GET /api/users/{handle}` | `atEvent: false` when the person is at no running event; `connection.eventSlug: null` for the pair's event-less connection |
| `POST /api/interactions/{id}/approve` | `pointsAwarded: 0`; no badge or live broadcast |
| Leaderboard, `/api/e/{code}/live*`, admin counts | event-scoped, so event-less rows never appear |

Ownership by route: [team-and-prs](team-and-prs.md). Related: [data-model](data-model.md), [ai-jobs](ai-jobs.md).
