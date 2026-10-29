# Screen 3 — Scan `/c/[handle]` (p. 5)

## Behavior

- With a session: creates the mutual connection and goes to [screen 4](connection.md).
- Without a session: shows the card of the person who invited you plus the short `/join` form; on save, connects automatically.

## Acceptance criteria (p. 5)

- Scanning the same QR twice does not duplicate the connection or the points.
- Scanning your own QR shows a message and does not connect.

Idempotency is enforced by the unique index on the ordered pair in [data-model](../data-model.md) (p. 9–10) and by `POST /api/connections` ([api](../api.md)). Owner: person A ([team-and-prs](../team-and-prs.md)).
