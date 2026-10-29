# Heatmap: topics x time

Prototype: `proto/heatmap.html`. Shots: `shots/heatmap/`.

**Data encoded.** Rows = `state.topics` top 10 by `score` (rank shown, ties share a rank). Columns = 5-min buckets from `scn.eventStartsAtSec` to `eventEndsAtSec` (24 for 2 h, 36 for 3 h). Cell = per-bucket weight rebuilt from `state.connections[].topics` (+1) and `state.summaries[].topics` (+3), same weights as `score`, so row total (right) equals the sum of the row. Header: `counters.connections`, `remaining`, `phase`. NOW column from `elapsed`.

**Why it works at 10 m.** One hue (light sky to ink) with monotonic lightness, so it survives color-blindness and grayscale. Shape (a hot band, a cooling row) reads before any number. Numbers (28 px+) only in cells >= 45% of max, so no clutter. Labels 34 px, totals 40 px, header numbers 72 px. Hatched columns say "not yet", white says "quiet".

**Failure modes.**
- Zero / one attendee: 10 skeleton rows (dashed labels), empty past cells, hatched future, a card explaining how the grid fills, QR 200 px, legend max = 3.
- < 10 topics: remaining rows stay skeleton.
- Many columns (36): cell 38 px still fits 2-digit numbers; 3 digits would not (not seen: max cell 35 in `huge`).
- Long topic names: ellipsis at 290 px. Ties: same rank number.
- Pre: all hatched, no NOW. Ended: no NOW, all past, header pill FINAL, caption "Final: X was the topic of the night". Axis ticks under the NOW tag are hidden.
- Scale is relative to the max cell, so one burst washes out older columns (accepted; the number labels carry exact values).

**Motion.** Rows slide to new rank: 500 ms `cubic-bezier(.2,.8,.2,1)`; new row fades in 400 ms; cell color 400 ms; NOW column slides 500 ms when the bucket changes. Triggered only when connections, summaries, bucket or phase change. `?reduced=1` / prefers-reduced-motion: all transitions off (shared CSS), values still update.

**Performance.** Keyed DOM (10 rows x up to 36 cells = 360 divs), built once, restyled on change; no per-tick work except the clock and NOW line. Recompute is O(connections), fine at 1,900 connections.

**Open.** Sparse events (trickle): most cells are 1, so few numbers show; consider a floor of "label if v >= 2 or the row max".
