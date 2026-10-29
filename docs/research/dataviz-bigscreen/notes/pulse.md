# Pulse (connection tide)

Prototype: `proto/pulse.html`. Shots: `shots/pulse/`.

**Data encoded.** `C.rateSeries` over `state.connections` (all, kind=new, kind=reconnection) in 60 s buckets from event start: stacked area, mint new under gum reconnection. Last point = live 60 s count at `now`. Big number = connections in the last 60 s (ended: peak minute). Cards: `counters.connections/newCount/reconnections`. Milestones: first connection (with `nameOf` first names), 100th/500th/1000th/2000th, peak minute (earliest on ties). Band: last 10 min of the event (`eventEndsAtSec - 600`) in coral-soft. `idleFor`, `phase`, `remaining`.

**Why it works at 10 m.** A single silhouette (a tide rising or falling) and one 230 px number; annotations are 28 px labels with leader lines, packed into 4 lanes. Total curve has a heavy outline so the split colors are secondary. Y ticks are 28 px and sparse.

**Scales.** X domain grows with the event (`max(15 min, 1.12 x elapsed)`, capped at the event length) so a young event fills the chart; the closing band appears when the domain reaches the end. Y max is a "nice" step above the peak.

**Failure modes.**
- Zero / one attendee: dotted flat baseline, "The tide is out" card, QR enlarged to 260 px.
- Idle > 3 min and 0 in the last minute: "Flat line" nudge card on the chart.
- Ended: no live dot, band shown, "Final" tag, big number switches to the event record.
- Raw per-minute values (no smoothing) so the curve matches the peak label; Catmull-Rom with the control points clamped, so it never dips below the baseline.
- Long names: first names only, 10 chars + ellipsis. Anonymous shows "Anonymous". Label collisions: 4 lanes, then falls back to the least-used lane.
- Bursts of 40+/min: Y rescales, earlier history flattens (accepted).

**Motion.** Live dot ring pulse 2 s ease-out infinite; numbers tween 400 ms; the chart redraws every 500 ms tick (no transition on `d`). Reduced: ring stops, tweens and transitions off.

**Performance.** One SVG of about 6 paths, redrawn per tick; O(connections x 4) for the series (about 8k ops at `huge`). Milestone labels are rebuilt as HTML each tick; fine at this size.

**Open.** 60 s buckets are jagged at `huge` (peak 19/min vs mean 11); a 3-min moving average toggle may be nicer for the big room but hides the peak.
