# Points rules

Business rules live on the server, never on the client: points, idempotency and the check that the author belongs to the connection (p. 11). Implementation lives in `lib/points.ts`, server only (p. 17). Since 2026-10-29 the table comes from the V2 design handoff (`design/compa-v2/README.md`, "Puntos") and supersedes the plan's table (p. 7) and data model M3/M18.

## Points table (V2 design)

| Action | Points | To whom | Where it is written |
| --- | --- | --- | --- |
| New connection accepted | +50 | both people | `connections.points` (check constraint, migration `0001`) |
| Reconnection accepted | +20 | both people | `connections.points` |
| Topics marked while registering | +5 | the scanner | `bonus_points` (`reason = topics`, `ref_id` = connection) |
| Voice note approved | +15 | the author | `interactions.points` |
| A friend joins through my referral code **while I am checked in to an event** | +100 | inviter, on that event | `bonus_points` (`invite_inviter`, `ref_id` = invite row), `invites.inviter_points` |
| A friend joins through my referral code while I am outside an event | 0 | — | `invites.inviter_points = 0`, `invites.event_id` null |
| The referred friend's first accepted connection, at any event | +50 | invitee | `bonus_points` (`invite_invitee`) |
| Three friends joined through my code, in or out of events | golden cap | inviter: worn on the monito and over the photo | `users.golden_cap_at`; shown unless `users.show_accessories` is false |

### Referral codes (captain decision, 2026-10-29)

Supersedes the event-scoped invites of PR #73. Everyone always has a referral code: their handle, shared as `/i/<handle>`. While the inviter is at an event the link lands the friend at that event's door; otherwise it goes through sign-in to onboarding. Either way `POST /api/invites/{code}/claim` records one `invites` row per friend (`code` null, unique `invitee_id`) and, in the same transaction, pays the inviter +100 on the event they are checked in to **at that moment** (`findCurrentEvent`); outside an event it pays nothing, and `/invite` says so before the share buttons ("Estás fuera de un evento: tus invitaciones cuentan para la gorra dorada, pero no suman puntos"). Inside one it says "+100 pts en <event>". The pure rules are `referralPointsFor` and `unlocksGoldenCap` in `lib/points.ts`.

- Only people new to COMPA count: a person who has already checked in to an event gets `409 referral_not_new` (anti-farming, [open-questions](open-questions.md) #48).
- Idempotent: a repeated or concurrent claim hits the unique invitee and pays nothing more; the golden cap is set once (`golden_cap_at is null` guard).
- The golden cap counts every claimed row of the inviter, whether it paid points or not. It is no longer written into `users.avatar`; it is applied at render time (`lib/monito/accessories.ts`), so hiding it works. Looks saved before migration `0013` keep the cap they were given.
- Old links keep working: a code from before (`<handle>` or `<handle>-<suffix>` in `invites.code`) still names its inviter. An old claimed row whose friend had not connected yet keeps its promise: +100 at the friend's first connection at that link's event. Migration `0013` sets `inviter_points = 100` on old rows that already paid.

"Accept a request: +20 for each" from the handoff README is not awarded separately; it is the reconnection line ([open-questions](open-questions.md) #28).

## Connections outside an event

Owner decision, 2026-10-29: a connection made outside any event (`connections.event_id` null, see [connection-flow](connection-flow.md#as-built-scanning-someone-outside-an-event-2026-10-29)) pays nothing.

| Award | Outside an event |
| --- | --- |
| New / reconnection accepted | 0 to both; the kind is still decided and stored (`pointsFor(kind, null)` is 0; DB check pins `points = 0`) |
| Topics marked while registering | 0 (no `bonus_points` row) |
| Voice note approved | 0 (`interactions.points = 0`, `pointsAwarded: 0`) |
| Referral: invitee's first accepted connection | not paid here; it waits for the friend's first accepted connection at an event |
| Badges | none awarded; badge facts read only connections and notes at events |
| Event and lifetime rankings, live board | untouched: `event_scores` skips event-less rows; no `connection.accepted` or `summary.approved` broadcast |

**A later meeting at an event** (decision for this feature): an accepted event-less connection counts as having met before, so the pair's next connection at an event is a **reconnection, +20** (`metAtEarlierEvent` in `lib/server/connections.ts`, `decideKind` in `lib/points.ts`). The register screen already preselects "reconnection" for anyone the scanner is connected with. Accepting an event-less request after either person has checked in to an event still pays 0: the context is fixed when the request is created.

## Idempotency

- `connections` has a unique index on `(event_id, least(requester_id, addressee_id), greatest(...))` (data model M5).
- `bonus_points` has `unique (user_id, reason, ref_id)`, the shape the plan gave `points` (p. 9–10).
- One approved note per connection (`interactions_one_approved_uq`, M18).
- Badges are stored once per `(user_id, badge_id)` in `user_badges`; rules are pure functions in `lib/badges/rules.ts`.

## Scores

`event_scores` and `lifetime_scores` are views (migration `0002`): accepted connections pay both people, approved notes pay their author, `bonus_points` pay whoever they name. The leaderboard (`GET /api/events/{slug}/leaderboard?scope=event|lifetime`) orders by points, connections, then earliest check-in, and adds `me` (rank, the row above and the gap) when the viewer is signed in. Rankings are shared per server instance for 3 s, so a new point can take up to 3 s to move a rank; a person's own lifetime total on `GET /api/connections` is read live from their rows ([conference-scale](conference-scale.md)).

Related: [data-model](data-model.md), [rounds-and-badges](rounds-and-badges.md), [screens](screens/README.md).
