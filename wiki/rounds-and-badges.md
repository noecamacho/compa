# Rounds, badges and tribes (P2)

All items here are P2 and the first thing cut if time runs out (p. 3). Owner: person D, PR #7 "Extras" (p. 14).

- Rounds of 15–20 minutes that reset the scoreboard; the winner is announced at each break (p. 7). `points.round` defaults to 1 (p. 10).
- Badges (p. 7): Bridge (3+ different tribes), Talker (5+ summaries), Streak (3 connections in 10 minutes).
- Tribe versus tribe scoreboard (p. 7). Tribe values in the SQL comment: Frontend, Backend, AI, Design, Other (p. 9).
- "Ask your event" organizer analyst with the Codex SDK (p. 3, p. 8 diagram, dashed "P2" box).

## Accessories (built, 2026-10-29)

Badges can give accessories the person wears. The golden cap is the first: earned after three friends joined through the referral code ([points-rules](points-rules.md#referral-codes-captain-decision-2026-10-29)), with progress 1/3, 2/3 on `/invite` and the home card.

- One registry, `lib/monito/accessories.ts`: the accessory id (`golden_cap`), what it changes on the monito (`ACCESSORY_LOOK`) and where it sits over a round photo as fractions of the photo's size (`ACCESSORY_PLACEMENT`). A new accessory adds one entry to each.
- The API carries `accessories` on every picture: `Card`, `Me`, leaderboard rows, the `/live` snapshot people and the home live-card pairs. `Avatar` (`components/monito/Avatar.tsx`) puts it on the monito and draws it over the photo (`AccessoryOverlay`, the same pixels as the monito's hat), at every size from a 30 px ranking row to the big screen. The stored photo and monito never change.
- The person can wear or hide it: the switch on `/invite` (`PATCH /api/me {showAccessories}`, `users.show_accessories`, default on). Hidden, it disappears from every view; it stays earned.
- Screenshots at 390, 834 and 1440 in Spanish and English: [docs/evidence/referral-codes](../docs/evidence/referral-codes/).

Related: [points-rules](points-rules.md), [mvp-scope](mvp-scope.md).
