# finale (end-of-event awards)

File: `proto/finale.html`. Shots: `shots/finale/` (`--scene-all` = contact sheet of every scene, `--scene-N` = one scene).
URL: `?scene=N` pins scene N (1-based, no auto-advance); `?scene=all` renders thumbnails of all scenes (scaled 1920x1080 frames, 4 per row).

## Scenes (auto-advance, then stay on the closer)
recap 6 s, top topic 6 s, awards 6.5 s each (two cards per scene), badges 6 s, podium 9 s, closer (stays).
Every scene with no data is skipped: no topics = no topic scene; a single award = one centred card; no points = no podium.

## Data encoded (all computed from folded state)
- Recap: `counters.checkedIn / connections / summaries`. Topic: `topics[0]` (+ `.connections`, `.summaries`, next three as chips).
- Most connections: max `people[].connections`. Most reconnections: count of `connections[].kind === "reconnection"` per person. Top note-taker: max `people[].summaries`.
- Early bird: `connections[0]` (both people share it). Last-minute connector: most connections with `t` in the last 600 s before `eventEndsAtSec`. Badge hunter: max `people[].badges.length`; badges scene: `badges[]` total + 4 most frequent names.
- Ties share the award: "Ana & Luis", more than two = "Ana, Luis +3" (first names) plus "shared award". Podium: `leaderboard[0..2]`, tied rank shows "tie" and "+N more tied" when the tie is longer than the podium.
- Closer: QR to profile/connections, `counters`, "See you at the next event".

## Why it works at 10 m
One message per scene, numbers 120-200 px, names 52-64 px, one avatar row, brand fills. Podium steps use sun/silver/bronze with the rank as a 130 px digit.

## Failure modes
- Zero or one attendee: zero = only the closer; one = recap, podium of one (only if points > 0), closer. No empty awards.
- Long/RTL/CJK names: `.truncate` plus `unicode-bidi: isolate`; award names use first names when several win. Missing photo = initials, anonymous = "?".
- Not ended yet: still plays, with a "preview: event still running" pill. Stale: no live-only element, so no dimming; the pill stays in the free top centre.
- Scenes are rebuilt only when their HTML changes (late approved notes after the end), not on every tick.

## Motion
- Scene change: cross-fade 500 ms + translateY 24 px. Podium: 3rd rises at 0.2 s, 2nd at 1.6 s, 1st at 3.0 s (700 ms, cubic-bezier(.2,.9,.3,1.2)); 70 confetti pieces fall 3.2 s linear from 3.0 s.
- `?shot=1` and `?reduced=1` show the end state (confetti frozen in shot, hidden in reduced); reduced still advances scenes, as instant cuts (transitions are disabled, a cut is not motion).

## Performance
DOM only, about 70 confetti `<i>` that animate with transform (compositor). Computation is one pass over `people` and `connections`; recomputed only when state changes (every 2 s tick checks a signature).
