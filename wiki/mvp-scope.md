# MVP scope

The MVP has three pieces: a profile with social links, a connection with a summary, and a gamified live dashboard. The app is used only during the conference (p. 2).

## In scope (p. 2–3)

P0 is never cut.

| # | Feature | Priority |
| --- | --- | --- |
| 1 | Profile by form (once), with optional social links | P0 |
| 2 | Handle plus recovery code (no login, no password) | P0 |
| 3 | Personal QR; scanning it with the native camera creates the connection | P0 |
| 4 | The other person's card with "Follow on…" buttons | P0 |
| 5 | Interaction summary, written or dictated, approved and sent to both | P0 |
| 6 | `/live` dashboard: leaderboard, live topics, counters | P0 |
| 7 | Seed data (about 150 attendees) so `/live` never looks empty | P0 |
| 8 | Connection by @tag with autocomplete | P1 |
| 9 | Record the conversation with the other person's consent | P1 |
| 10 | Leaderboard rounds, badges, tribe versus tribe | P2 |
| 11 | "Ask your event" with the Codex SDK | P2 |

## Out of scope (p. 3)

- Login with OAuth (GitHub, LinkedIn, Instagram, etc.). Social networks are links only, so people can follow you.
- Native app or install as a PWA.
- Post-event recap mode, emails and exports.
- Matchmaking or recommendations of who to meet.

## Cut order if time runs out (p. 3)

First P2, then recording, then @tag. The QR, the summary and `/live` are never cut.

If the closing time is 7 p.m., the plan shrinks to P0 without @tag or recording, with seed data and a recorded demo (p. 16). See [open-questions](open-questions.md).

Related: [screens](screens/README.md), [timeline](timeline.md), [rounds-and-badges](rounds-and-badges.md).
