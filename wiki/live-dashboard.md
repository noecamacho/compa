# Live dashboard `/live`

`/live` is the projected screen: a Kahoot-style podium, the most-discussed topics and counters, updated in real time (p. 6). It is screen 7 of the plan (p. 6).

## Layout (16:9 screen, readable from 10 m) (p. 6)

- Left: animated podium of the top 5 (photo, name, points). Positions reorder with animation.
- Right: bar race of the 8 most-discussed topics.
- Top: large counters (connections, summaries, active people) and the QR to join.
- Bottom: feed of recent events ("Ana ⇄ Luis talked about AI"), without the summary content.
- Strong colors, huge typography, 300–500 ms transitions.

## Data

- Initial snapshot from `GET /api/live`; updates through Supabase Realtime on `connections`, `interactions` and `points` (p. 9, p. 11).
- Topic scoring: before summaries exist, each connection adds the pair's shared interests ("topics that connect"); each approved summary adds its topics with weight ×3 ("topics people talk about") (p. 7).
- Seed data (about 150 attendees, about 300 connections, about 80 summaries) plus an optional simulator adding a connection every 3–5 s; a toggle hides seeds (p. 18).

## Resilience (as built, [conference-load](../docs/research/conference-load.md) findings 19 and 20)

- `useLiveSnapshot` polls every 3 s with one request in flight and an 8 s timeout; a failed poll keeps the last snapshot and shows "Reconnecting… data from N s ago".
- A 404 (the access code was rotated) keeps the board up with "The event code changed. Open the new screen link from Admin." instead of falling to the not-found door; polling continues.
- A failed server render of `/e/<code>/live` shows a large outage message (`error.tsx`) that retries every 10 s.

## As built (2026-10-29)

The plan's podium-plus-topics layout was replaced by **Loom+**, chosen after prototyping four concepts and the research in [docs/research/live-dataviz.md](../docs/research/live-dataviz.md); rationale, scores and screenshots in [docs/research/live-dataviz-decision.md](../docs/research/live-dataviz-decision.md).

| Piece | Behavior |
| --- | --- |
| Loom | Pegs on a ring (people), threads (accepted connections; mint new, bubblegum reconnection); new threads draw in, then settle. Instanced and merged, so 2,500 people and 4,000 links stay drawable |
| Pulse | Connections per minute, last 30 min, with a mood line (steady, rush, quiet, empty, upcoming, final) |
| Feed | The 4 newest pairs, "Ana ⇄ Luis", names only (p. 6) |
| Ranking | Top 5; equal points and connections share a place |
| States | Upcoming, empty and ended cards over the loom; final podium after the close; "Ends in N min" in the last ten minutes; "Reconnecting… last update" when polls fail or stall |

Data: polling every 3 s (15 s after the close, backing off to 30 s on failure); the snapshot carries `event.phase`, `startsAt`, `endsAt`, each person's connection count and at most the newest 1,500 connections (`docs/specs/2026-10-29-api.md` §5). Topics are not in the snapshot yet, so there is no topic race. Scenarios and their e2e coverage: `lib/testing/live-scenarios.ts`, `e2e/live/live-board.spec.ts`.

## Privacy (p. 13)

Shows leaderboard names and points plus aggregated topics. Never shows the text of a summary. Attendees can opt out and appear as "Anonymous".

Related: [points-rules](points-rules.md), [topics-vocabulary](topics-vocabulary.md), [rounds-and-badges](rounds-and-badges.md), [demo-script](demo-script.md). Owner: person D, PR #4 ([team-and-prs](team-and-prs.md)).
