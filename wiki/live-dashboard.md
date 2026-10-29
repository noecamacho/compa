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

## Privacy (p. 13)

Shows leaderboard names and points plus aggregated topics. Never shows the text of a summary. Attendees can opt out and appear as "Anonymous".

Related: [points-rules](points-rules.md), [topics-vocabulary](topics-vocabulary.md), [rounds-and-badges](rounds-and-badges.md), [demo-script](demo-script.md). Owner: person D, PR #4 ([team-and-prs](team-and-prs.md)).
