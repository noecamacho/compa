# Live board concepts: prototype notes

Prototypes (vanilla JS, 2D canvas/DOM, one rush/zero/ended/thousands snapshot each) live in the scratchpad, not the repo; screenshots are `<concept>-<scenario>-<w>.jpg` here.
Scores 1 (bad) to 5 (good), judged from the screenshots and the fps run. Caveats at the bottom.

| Criterion | Loom+ | Constellation | Podium race | Heartbeat |
| --- | --- | --- | --- | --- |
| Readable at 10 m (type 26-32 px, big numbers) | 4 | 3 | 5 | 4 |
| Live-ness / momentum (new thread, pulse, feed) | 5 | 3 | 2 | 4 |
| Empty state (zero) | 4 | 3 | 4 | 4 |
| Ended state | 4 | 3 | 5 | 4 |
| Thousands: look | 3 | 1 | 5 | 5 |
| Thousands: perf (headless, 5 s rAF, cached layer) | 51 fps | 46 fps | 60 fps | 48 fps |
| Privacy (names only, no photos) | 4 | 4 | 5 | 4 |
| Phone 390 fit | 4 | 3 | 4 | 3 |
| Reuses existing code (loom, leaderboard, counters) | 5 | 2 | 3 | 2 |
| Total (perf not scored) | 33 | 22 | 33 | 28 |

Naive redraw of every thread/edge each frame (no cached layer), thousands: Loom+ 18 fps, Constellation 32 fps.
Constellation force layout: 742 ms for 2500 nodes (70 iterations), not incremental.

Why the scores
- Loom+: only concept where one glance shows "something just happened" (fresh thread, centre plate with the last pair, pulse bars, feed). The ring itself is decoration at 10 m; the feed and ranking carry the text. At 2500 people the ring becomes a solid disc and threads wash to a pastel haze.
- Constellation: honest hairball. The sim pairs people at random, so label propagation found one giant group and no clusters (I dropped blobs over 60 % of nodes). Top-name labels collide. At 2500 nodes it is a snowstorm. Worst on every axis except "looks like a network".
- Podium race: best 10 m legibility and best ended state ("Ganadores"), good ghost-podium empty state. Between point changes nothing moves, so no momentum, and it ignores connections entirely (the product's core action).
- Heartbeat: clear momentum and trends, scales for free (bins). The fixed event-window histogram failed on `rush`: all 294 connections fall in 12 min of a 4 h window, so the chart was an empty plot with a spike. I had to start the axis 10 min before the first connection. 5-min bins also move slowly; the 30 x 1-min strip inside Loom+ is the better shape.

Verdict
Loom+ wins (tied with Podium on score, but Podium has no momentum and no connections): keep the loom, add the 30-minute pulse strip, the recent feed and a centre plate that doubles as state overlay (waiting for first check-in / last pair / ended totals). Steal two things: Podium's "Podio final" treatment for ended and its ghost-podium idea for the empty ranking. The evidence does not argue against your pick, but it does say the ring must change above roughly 500 people (draw only the newest ~300 threads, or bin threads into density), and it must cache the static layer (51 vs 18 fps).

Surprises
- Payload: the `thousands` snapshot is 976 KB of JSON (4075 connections) every 3 s. Pulse, feed and heartbeat need only per-minute counts plus the last ~10 connections; ask for `activity: [{minute, new, reconnection}]` and `recent[]` instead of the whole list. [Inference] this matters more than any rendering choice.
- A feed naming both sides of each pair ("Ana G. ⇄ Luis R.") exposes who met whom to the whole room; the loom already draws threads but not names. Needs a privacy call (consent text, or show only first names / hide reconnections). Not in `wiki/privacy-consent.md` as far as I checked [Unverified].
- Phone: Loom+ stacks into a 1305 px scroll; Heartbeat's counter callout covers its own chart at 390 wide.

Caveats
- Fredoka was not installed: Lilita One stands in. 2D canvas, not Three.js, so Loom+ perf is an approximation of the WebGL scene.
- The snapshot is static: the "fresh" thread and centre plate replay the 10 newest connections on a 1.6 s loop; the feed does not scroll.
- fps is one headless Chromium run on shared hardware, software rendering [Unverified on a real projector machine]. Timezone labels use America/Mexico_City.
