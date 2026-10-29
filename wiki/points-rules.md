# Points rules

Business rules live on the server, never on the client: points, idempotency, the hourly cap and the check that the author belongs to the connection (p. 11). Implementation lives in `lib/points.ts`, server only (p. 17).

## Points table (p. 7)

| Action | Points | Anti-spam rule |
| --- | --- | --- |
| New mutual connection | +10 | The same pair scores only once |
| Connection with someone from another tribe ("bridge") | +15 extra | Only if both have a tribe |
| Approved summary | +25 per person | The AI must mark it as substantive |
| First connection of the day | +5 | Once per person |

**Cap:** at most 12 scoring connections per person per hour (p. 7).

## Idempotency (p. 9–10)

- `connections` has a unique index on the ordered pair (`least(a_id,b_id)`, `greatest(a_id,b_id)`), so A→B and B→A are the same connection.
- `points` has `unique (attendee_id, reason, ref_id)`; `reason` is one of `connection`, `bridge`, `summary`, `first_of_day`; `ref_id` is the connection or interaction that generated it.

## Where points are awarded (p. 10)

- `POST /api/connections` creates the connection idempotently and awards points.
- `POST /api/interactions/:id/approve` approves, shares with both and awards points (+25 to each, p. 18).
- Summary points live in `lib/points.ts` as `awardSummaryPoints`, written by the AI lane (person C) because it lands before the connections lane; the connections lane adds its functions to the same file (team decision 2026-10-29).

Risk "spam to climb the podium" → hourly cap and points only for mutual connections (p. 20).

Open points (who exactly receives +10, what happens to capped connections) are in [open-questions](open-questions.md). Related: [data-model](data-model.md), [rounds-and-badges](rounds-and-badges.md).
