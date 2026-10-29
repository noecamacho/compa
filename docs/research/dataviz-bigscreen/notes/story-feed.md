# Story feed

Prototype: `proto/story-feed.html`. Shots: `shots/story-feed/`.

**Data encoded.** `state.feed` (newest first, 40) diffed by key `t|type|a|b|badge`; `connection_accepted` (names, `kind` mint=new / gum=reconnection, shared `topics`), `summary_approved` (names + topics only, never text), `badge`, `checkin`. Side: `counters.connections/checkedIn/summaries` (128 px / 84 px), `nameOf`/`display` (Anonymous), `idleFor`, `phase`.

**Why it works at 10 m.** One hero card (54 px names, 112 px avatars) carries the story; older cards shrink (38, 34, 30, 28 px) and fade, so the eye only reads the top. Color = event kind. Fixed slots, no scrolling. Anonymous people use the shared avatar: grey "?" and the name "Anonymous", never a photo.

**Rate limiting.** One card per 2.5 s max. If more than 3 events are queued, they collapse into one green card "+N connections in the last minute" (N from `state.connections` last 60 s) with topic chips ("AI x6"). After that, rush mode (20 s) keeps updating the same card in place instead of adding cards. Low-priority badges (handshake, early bird, closer) are dropped while anything else is queued; Marathon always passes. Queue capped at 80.

**Quiet.** No release for 8 s and `idleFor >= 20` s: rotating prompt card ("Who here works on AI? Go find them", uses top topic or a public interest), replaced not stacked, every 8 s. Zero activity: "Be the first" card + prompt + QR at 340 px.

**Edge cases.** Long names: ellipsis (max 46% each, RTL and emoji names tested). Missing photo: initials. Ended: one "FINAL" card with totals, feed freezes. Pre: countdown. Dynamic-length event ok.

**Motion.** Enter: slide from -48 px + fade, 400 ms `cubic-bezier(.2,.8,.2,1)`; older cards move top/height/font-size/opacity in the same 400 ms. Counters tween 400 ms. Reduced: no transitions, no tweens.

**Performance.** At most 7 DOM cards; diff over <= 40 events each 200 ms tick. Avatars re-rendered only when the size changes.

**Known gap.** First paint seeds the last 5 events without animation; a clock jump (`clock-skew`) after boot would show a burst, which the aggregator absorbs.
