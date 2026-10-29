# Points rules

Business rules live on the server, never on the client: points, idempotency and the check that the author belongs to the connection (p. 11). Implementation lives in `lib/points.ts`, server only (p. 17). Since 2026-10-29 the table comes from the V2 design handoff (`design/compa-v2/README.md`, "Puntos") and supersedes the plan's table (p. 7) and data model M3/M18.

## Points table (V2 design)

| Action | Points | To whom | Where it is written |
| --- | --- | --- | --- |
| New connection accepted | +50 | both people | `connections.points` (check constraint, migration `0001`) |
| Reconnection accepted | +20 | both people | `connections.points` |
| Topics marked while registering | +5 | the scanner | `bonus_points` (`reason = topics`, `ref_id` = connection) |
| Voice note approved | +15 | the author | `interactions.points` |
| Invited friend's first accepted connection | +100 / +50 | inviter / invitee | `bonus_points` (`invite_inviter`, `invite_invitee`) |
| Three invited friends connected | golden cap | inviter's monito | `users.golden_cap_at`, `users.avatar` |

"Accept a request: +20 for each" from the handoff README is not awarded separately; it is the reconnection line ([open-questions](open-questions.md) #28).

## Idempotency

- `connections` has a unique index on `(event_id, least(requester_id, addressee_id), greatest(...))` (data model M5).
- `bonus_points` has `unique (user_id, reason, ref_id)`, the shape the plan gave `points` (p. 9–10).
- One approved note per connection (`interactions_one_approved_uq`, M18).
- Badges are stored once per `(user_id, badge_id)` in `user_badges`; rules are pure functions in `lib/badges/rules.ts`.

## Scores

`event_scores` and `lifetime_scores` are views (migration `0002`): accepted connections pay both people, approved notes pay their author, `bonus_points` pay whoever they name. The leaderboard (`GET /api/events/{slug}/leaderboard?scope=event|lifetime`) orders by points, connections, then earliest check-in, and adds `me` (rank, the row above and the gap) when the viewer is signed in.

Related: [data-model](data-model.md), [rounds-and-badges](rounds-and-badges.md), [screens](screens/README.md).
