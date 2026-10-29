# Treemap (area = topic score)

File: `proto/treemap.html`. Shots: `shots/treemap/`.

**Data encoded.** `state.topics[].score` as area, laid out with a squarified treemap in a 1200x854 rect. Up to 11 named cells plus one "+N more" cell for the rest (only when there are more than 12 topics). Name size scales with cell size (28-110 px, capped by cell width so it never clips); the score (64-150 px) shows only when the cell can hold it. Color is per topic in first-seen order, so a topic keeps its color as the layout changes.

**Why it reads at 10 m.** The biggest topics are literally the biggest shapes, readable by size alone. Small cells keep a 28 px name or just a color tile rather than shrinking text; small numbers are hidden instead of shown tiny.

**Failure modes.**
- Zero topics: invite card with QR (same as the other concepts). One topic: a single block with a very large label, no special case needed.
- Huge/steady: merging keeps at most 12 cells so the smallest label stays at least 28 px. The "+N more" cell is deliberately not to scale (its area is capped at 1.6x the smallest shown cell) because a literal sum dominated the screen; this is the one place area lies, and the cell is hatched to say so.
- Long names: two-line clamp in large cells, single-line ellipsis in small ones, hidden below 120x52 px.
- Ended: FINAL pill and sticker, no flashes. `?stale=95` leaves the top center free.
- Weakness: the treemap does not show the connection/note split; and tiny cells shuffle as scores tie, so ties sort by name.

**Motion.** Each cell transitions `left/top/width/height` 500 ms `cubic-bezier(.3,.9,.3,1)` to its new rect; new cells fade in 350 ms, dropped cells fade out and are removed after 400 ms; a cell gets a 700 ms white wash when its score rises. Reduced: transitions and wash off, layout snaps.

**Performance.** Squarify is O(n log n) on at most 12 items per render (sorting 40 topics in huge is trivial). Cells are keyed DOM nodes, only styles that changed are re-set.
