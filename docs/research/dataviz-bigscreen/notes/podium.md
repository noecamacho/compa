# Podium (Kahoot-style top 5)

File: `proto/podium.html`. Shots: `shots/podium/`.

**Data encoded.** `state.leaderboard` filtered to `points > 0`, first five by order: `display` (name or "Anonymous"), `photo`/`avatar()` initials fallback, `points`, `rank` + `tied` (dense tie rank, shown as "=2"). Slots 1-3 are podium blocks (sun/silver/bronze, heights 500/420/350 px), 4-5 are rows. The chasing strip uses entries 6-8 and `fifth.points - p.points` ("-15", or "tied"), plus "+N more". Counters: `counters.connections/checkedIn`, `summaries`. `phase`/`remaining` drive the LIVE pill and clock.

**Why it reads at 10 m.** Points are 72-84 px, names 40-44 px, rank numerals 62-150 px, everything else at least 28 px. Position is carried by block height and color, not by small text. The #1 block has a crown. Photos at 120 px double as recognition for the room.

**Failure modes.**
- Zero points (zero-activity, one-attendee): no empty slots; invite card "Podium opens at the first connection" with a 420 px QR, avatars of who is here, and a how-to card on the side.
- Fewer than 5 with points: dashed "You?" ghost slots and a "spots open" line instead of the strip.
- Ties: shared rank "=4"; caption "tied on points and connections, earlier check-in is listed first" appears only when a tie is visible in the top 5. Order inside a tie still follows the server tie-break. A tie spanning the 5/6 boundary shows "tied" in the strip.
- Long names/missing photos/anonymous: single-line ellipsis; initials on a stable color; anonymous shows "?" and "Anonymous".
- Ended: FINAL pill and sticker, "Final standings" caption, no pops or arrows, clock hidden. `?stale=95`: pill sits top center, nothing else is placed there.
- Known shared-runtime quirk: `COMPA.initials` takes the first code unit of a name, so emoji-leading names render a broken glyph in the avatar (seen once in long-names).

**Motion.** Reorder: `left/top/width/height` transition 400 ms `cubic-bezier(.2,.8,.2,1)` (equivalent to FLIP for five nodes; no layout thrash risk). Enter: opacity 300 ms; leave: opacity 0 then removed after 400 ms. "+N" pop: 1.7 s rise and fade, triggered when a person's `points` rises between renders. Rank arrows: shown 10 s after a rank change (green up, coral down). Counters bump 250 ms. Reduced motion (`?reduced=1`): all transitions/animations off; pops stay as a static chip for 2.5 s, arrows still show.

**Performance.** Keyed DOM, five cards plus ghosts; text only written when changed; avatars built once per person. Fold cost is in `_shared.js` (huge: about 10k events, folded only when the event count changes). Strip rebuilt only when its signature changes.
