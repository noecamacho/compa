# Event clock (radial time) - proto/event-clock.html

**Encodes**: the event window `eventStartsAtSec..eventEndsAtSec` (`eventLength`) is a 360 degree track from 12 o'clock clockwise; elapsed arc filled (mint, coral in `closing`) with a sun "now" knob; the last 10 min are tinted coral on the track; quarter marks (0:30, 1:00 ...) sit on the track; every `connection` falls into one of 240 time bins and draws an outward bar (height 24-90 px = sqrt-ish of bin count, mint `new` stacked under gum `reconnection`); a "Peak N/min" pill marks the busiest bin when >=4 in it. Centre: `remaining` as 160 px "42:10 / left". Side: people + connections (72 px), new/reconnection counts (56 px), newest connection card, QR.

**Why it works at 10 m**: one dominant number in the middle, one shape to read (a burst is a tall comb). Everything else is 28 px+. Phase is readable from colour alone (mint live, coral closing, sun ended).

**Phases**: `pre` "Starts in" + countdown to start, empty track. `live` countdown. `closing` (remaining <=600): arc and digits coral, "Closing soon" line, digits + knob pulse. `ended`: arc full, centre "Event ended / N people / N connections", header pill "Event ended"; all values come from the final state so after-event is stable.

**Failure modes**: zero activity: ghost dotted ticks around the track, countdown still ticking, invite card with 280 px QR on the right (corner QR hidden). One attendee: same ghost ticks with counters 1/0. Windows much longer than the data (scenario replays 600 s of 7200 s) show a short elapsed arc and all ticks in one sector, which is the honest encoding. Long names: first names with CSS ellipsis in the newest card. Anonymous: `display`. Missing photos: `COMPA.avatar` initials. Top-centre is free for the stale pill; peak pill is clamped to y>=96 and inside the stage. Known nit: "30m" at 3 o'clock touches the track edge on some widths.

**Motion**: only the digits change each second (no tween). Fresh bar bin glows (shadowBlur 26) for 5 s + one bin; newest card `rise` 350 ms; closing pulse 1 s (scale 1.03 digits, knob +-5 px, phase pill 1.05). **Reduced**: no glow, no pulse, redraw only on state change.

**Performance**: Canvas 2D, ~0.45 ms/draw at 3000 people/1326 connections (bins make cost independent of connection count: 240 bars). Redraw loop only while a fresh bin or `closing` is active, else idle.
