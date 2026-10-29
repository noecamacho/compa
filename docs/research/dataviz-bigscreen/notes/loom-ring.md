# Loom ring (canvas evolution of El Telar) - proto/loom-ring.html

**Encodes**: pegs = `people` on a ring in stable id order (seat = index, eased when someone joins); threads = `connections` as quadratic chords bowed toward the centre (mint `new`, gum `reconnection`); outer band = 72 density segments (count of connection endpoints per angular segment, sun fill, sqrt scale); centre disc = `counters.connections` (112 px, fitted down to 56 px); names around the ring for `leaderboard` top 10 (all when <=14 people) with `#rank`/`=rank`; the newest connection is drawn thick with ink outline and sun rings on both pegs, and called out in a bottom banner "[avatar] Ana ⇄ Luis [avatar] met|reconnected" (first names, 52 px). Side cards: people + notes, new/reconnection legend, phase clock, QR.

**Why it works at 10 m**: one simple shape; the only text on the ring is <=12 labels at 28 px, placed radially outside the density band and de-overlapped by sorting per side and enforcing a 50 px pitch; the headline number sits in the middle and the story of "who just connected" sits in a 52 px banner.

**Failure modes**
- Zero: dashed ghost pegs, centered invite card (260 px QR), banner says "Scan to join". One person: one 30 px peg (cap 17 px above 12 people), label, "Be the first" banner, centre 0. Huge (3000): pegs become 1.3 px dots, chords alpha .2 at 1 px, density band and top-10 labels stay readable; the ring reads as a band by design. 2000 behaves the same (peg size is circumference/n, floor 1.3 px).
- Long names truncated by measured width (230 px) with ellipsis; anonymous shows "Anonymous"; initials in pegs only when r>=13 (n<=~60). Ties get `=`.
- Banner/labels vs `?stale`: top-centre is empty (ring labels start y>=118 and clamp at 118 + 50 k).
- Ended: banner switches to "Event ended . N people . N connections"; clock card shows "Event ended".

**Motion**: peg angles ease to their new seat (exponential, 14%/frame, ~400 ms) when the roster changes; fresh thread 5 s glow and fade (shadowBlur 30 to 0, width 8 to 4); banner children `rise` 350 ms cubic-bezier(.2,.8,.2,1); closing: clock card pulses 1 s scale 1.04. The 3D loom's 6 deg/min spin is dropped on purpose (names would drift). **Reduced**: angles snap, no glow, no pulses, draw once per state.

**Performance**: Canvas 2D. Huge: ~3.3 ms per draw (3000 dots + 1326 chords), redraw only when dirty, moving, or a thread is <5 s old. Sound up to the 3000 pegs tested; chords above ~4000 would need a cap or bundling (not implemented).
