# Constellation (force graph) - proto/constellation.html

**Encodes** (from the folded state): nodes = `people` (checked in); node radius = `points` (sqrt, relative to max); edges = `connections` (`a`,`b`,`kind`: mint `new`, gum `reconnection`, `t` drives the 5 s fresh state); soft clusters = people's `interests` grouped by the top 5-8 shared topics (popularity = people holding it + 8 x `topics[].score`), anchor labels are big pills on an ellipse; labels (`#rank name . points`, `=` when `tied`) for `leaderboard.slice(0,10)` plus the endpoints of the newest connection; side cards: `counters`, `phase`/`remaining`, newest connection, QR.

**Why it works at 10 m:** few big labelled objects (<=8 anchors, <=12 names, all >=28 px), size = status, colour only means edge kind (clusters use sky/sun/coral/violet tints so they never collide with mint/gum). Numbers are 72 px.

**Failure modes handled**
- Zero people: dashed ghost ring + centered invite card with 300 px QR (corner QR hidden). One person: one big node, hint pill "Be the first...". No connections yet: hint pill instead of legend.
- Scale modes by people count: `full` <=120 (avatar circles 22-50 px with initials), `mid` <=600 (8-30 px, initials only when r>=14), `dots` >600 (2-12 px, no outline, one batched path). Edges: width/alpha scale with count (3.5 px/.85 down to 1 px/.16 above 1200); above 400 edges between different clusters are drawn as curves pulled to the centre (cheap bundling).
- Long names: `fit()` truncates with an ellipsis by measured width; HTML names use CSS ellipsis. Missing photos / anonymous: initials or "?" on silver (photos are not drawn on the canvas by design; HTML avatars in the newest card use `COMPA.avatar`). Local code-point-safe initials (see bug below).
- Ties: `=N` prefix. Label collisions: greedy search over 16+ candidate spots with leader lines; anchor pills are reserved first.
- `?stale=95`: nothing occupies top-centre (x 600-1320, y<100).

**Motion spec**: new node pops 450 ms ease-out-cubic (scale .3 to 1 with 20% overshoot-free swell) and flies from its cluster anchor; sim runs 1 tick/frame (damping .8, collision strength .5, anchor pull .006) until mean speed <.03 then stops redrawing; fresh edge: 8-16 px, ink outline, mint/gum glow (shadowBlur 34 to 0) fading linearly over 5 s, endpoint rings pulse (sin, 360 ms period); newest-connection card re-renders on change. **Reduced** (`?reduced=1`): body gets `.reduced`, sim is pre-solved synchronously (90-260 ticks) on every state change, no pop, no glow/fade (fresh edges stay thick for 5 s then thin), draw only on `render()`.

**Performance**: single canvas 1920x1080, DPR 1. Spatial grid for collisions (O(n)), edge springs capped at 1500 per tick (round-robin). Huge (3000 people, 1326 edges at t=7560, headless Chromium): ~1.4 ms sim + ~1.3 ms draw per frame, 60 fps; pre-warm 90 ticks at load takes ~0.5 s. Never settles while events keep arriving (continuous low-cost ticks). Untested: >2000 simultaneous edges (the 1900 total in `huge` appears only near the end).
