# Screen 6 — My connections `/connections` (p. 6)

## Content

List of people with photo, name, company, social links and summary status (pending / sent).

## Acceptance criteria (p. 6)

- Connections with a pending summary appear first.

## As built (2026-10-29)

- Incoming requests waiting for my answer render above the list and link to `/requests/[id]`; `GET /api/connections` is polled every 5 s while the tab is visible, with backoff and jitter (`lib/use-poll.ts`) (`docs/flows/backlog.md` T-031, API spec §8 fallback). An expired request shows the expired copy (API spec §7.3).

API: `GET /api/connections` ([api](../api.md)). Owner: person B, PR #2 ([team-and-prs](../team-and-prs.md)).
