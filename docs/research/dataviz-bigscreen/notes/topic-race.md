# Topic race (bar race of top 8)

File: `proto/topic-race.html`. Shots: `shots/topic-race/`.

**Data encoded.** `state.topics` top 8 by `score`. Bar length = score / max (640 px max). Each bar is split into `connections` (mint, weight 1) and `summaries * 3` (sun, weight 3), so the split is exact. Value label is the total at 68 px. "Rising" tag: topic with the biggest growth in the last 300 s, computed from `state.connections[].topics` (+1) and `state.summaries[].topics` (+3); needs growth of at least 2 and is hidden after the event ends.

**Why it reads at 10 m.** One metric, one direction, big numbers right at the bar end, 40 px labels, two-color legend in 28 px. Order carries the story; the split is a secondary cue that survives as color blocks even when labels are not read.

**Failure modes.**
- Zero topics: invite card "Topics appear when people connect" with QR and the scoring rule in one sentence.
- Fewer than 8 topics: remaining rows are dashed ghosts, first one says "More topics appear with every connection...".
- One topic: single full bar; fine.
- Long names: 340 px label column, ellipsis, full name in `title`. Ties in score: stable order by name, so rows do not flicker.
- Small bars: 20 px minimum so the border never collapses; a tiny note segment gets at least 14 px.
- Ended: FINAL pill and sticker, rising tag removed, no flash. `?stale=95` leaves the top center free.

**Motion.** Row `transform: translateY` 500 ms `cubic-bezier(.3,.9,.3,1)` on reorder; bar `width` and value `left` use the same curve so the number rides the bar end. New row fades in (350 ms), departing row fades then is removed after 400 ms. A bar flashes (600 ms brightness) when its topic gains score. Reduced: no transitions, no flash, tag still visible.

**Performance.** Eight keyed rows; width/left transitions are cheap at this count. Growth is recomputed per render over `connections` (huge: a few thousand), O(n) every 250 ms; if it matters, move it to an incremental accumulator.
