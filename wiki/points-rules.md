# Points rules

Business rules live on the server, never on the client: points, idempotency and the check that the author belongs to the connection (p. 11). Implementation lives in `lib/points.ts`, server only (p. 17). Since 2026-10-29 the table comes from the V2 design handoff (`design/compa-v2/README.md`, "Puntos") and supersedes the plan's table (p. 7) and data model M3/M18.

## Points table (V2 design)

| Action | Points | To whom | Where it is written |
| --- | --- | --- | --- |
| New connection accepted | +50 | both people | `connections.points` (check constraint, migration `0001`) |
| Reconnection accepted | +20 | both people | `connections.points` |
| Topics marked while registering | +5 | the scanner | `bonus_points` (`reason = topics`, `ref_id` = connection) |
| Voice note approved | +15 | the author | `interactions.points` |
| Invited friend's first accepted connection **at the invite's event** | +100 / +50 | inviter / invitee | `bonus_points` (`invite_inviter`, `invite_invitee`) |
| Three invited friends connected | golden cap | inviter's monito | `users.golden_cap_at`, `users.avatar` |

Invites are always tied to an event (captain decision, 2026-10-29): `invites.event_id` is the inviter's current event when the link is made, the friend lands at that event's door, and `awardInvite` pays only when the accepted connection belongs to that same event. A connection at another event pays nothing. Rows from before this rule keep their inviter's latest event (migration `0012`); an inviter who never checked in leaves a row with no event, which cannot be claimed (`409 invite_needs_event`) or paid. The golden cap still counts paid invites from every event.

"Accept a request: +20 for each" from the handoff README is not awarded separately; it is the reconnection line ([open-questions](open-questions.md) #28).

## Idempotency

- `connections` has a unique index on `(event_id, least(requester_id, addressee_id), greatest(...))` (data model M5).
- `bonus_points` has `unique (user_id, reason, ref_id)`, the shape the plan gave `points` (p. 9–10).
- One approved note per connection (`interactions_one_approved_uq`, M18).
- Badges are stored once per `(user_id, badge_id)` in `user_badges`; rules are pure functions in `lib/badges/rules.ts`.

## Scores

`event_scores` and `lifetime_scores` are views (migration `0002`): accepted connections pay both people, approved notes pay their author, `bonus_points` pay whoever they name. The leaderboard (`GET /api/events/{slug}/leaderboard?scope=event|lifetime`) orders by points, connections, then earliest check-in, and adds `me` (rank, the row above and the gap) when the viewer is signed in. Rankings are shared per server instance for 3 s, so a new point can take up to 3 s to move a rank; a person's own lifetime total on `GET /api/connections` is read live from their rows ([conference-scale](conference-scale.md)).

Related: [data-model](data-model.md), [rounds-and-badges](rounds-and-badges.md), [screens](screens/README.md).
