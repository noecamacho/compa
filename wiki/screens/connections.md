# Screen 6 — My connections `/connections` (p. 6)

## Content

List of people with photo, name, company, social links and summary status (pending / sent).

## Acceptance criteria (p. 6)

- Connections with a pending summary appear first.

## As built (2026-10-29)

- Incoming requests waiting for my answer render above the list and link to `/requests/[id]`; `GET /api/connections` is polled every 3 s while the tab is visible (every 30 s once the private Realtime channel is joined), with backoff and jitter (`lib/use-poll.ts`) (`docs/flows/backlog.md` T-031, API spec §8 fallback). An expired request shows the expired copy (API spec §7.3).

## Profile history and mutual connections (2026-11-11)

- The profile's last interaction shows its stored date. Its mutual-connections link opens `/connections?mutual=<handle>`, showing only shared people, with search, kind and event filters plus a link back to all connections ([profile page](../../app/(app)/people/[handle]/page.tsx), [connections page](../../app/(app)/connections/page.tsx), [regression spec](../../e2e/connections/dates-and-mutual.spec.ts)).
- Activity uses days after 24 hours and a calendar date after a week; notification dates use the same localized clock as Home, in Mexico City time ([formatters](../../lib/format.ts), [formatter tests](../../lib/format.test.ts)).

API: `GET /api/connections` ([api](../api.md)). Owner: person B, PR #2 ([team-and-prs](../team-and-prs.md)).
