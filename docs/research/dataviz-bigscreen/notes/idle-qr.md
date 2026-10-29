# idle-qr (attract mode)

File: `proto/idle-qr.html`. Shots: `shots/idle-qr/`.

## Data encoded
- `phase`, `remaining`, scenario `eventStartsAtSec`: top-right clock ("Starts in" in pre, "left" live, "Ends in" closing, "Event ended").
- `counters.checkedIn` (huge number), `registered` ("of N registered"), `people[].checkedInAt` (avatar stack, newest first, 19 + "+N" chip), `COMPA.avatar` (initials fallback, anonymous = "?").
- `idleFor` > 180 s while live/closing: tip card turns coral "Quiet minute? Find someone who likes <topics[0].name>" (no topic: "say hi to someone new").
- Rotating tip every 6 s: +50 new, +20 reconnection, +15 voice note, +5 topics (from `COMPA.POINTS`).

## Why it works at 10 m
- QR is 600 px in a sun card, headline 104 px, counter 150 px, tip 44-46 px, avatars 92 px. Bilingual headline always: locale language big, the other under it.
- One idea per block, high contrast ink on flat fills, QR on pure white with a quiet zone (the fake QR here stands in for the real server-rendered one).

## Failure modes
- Zero people: counter 0 plus a dashed "Be the first" card instead of an empty avatar area. One person: one avatar, "1 person is in".
- Huge: stack capped at 19 avatars + "+N"; counter uses `Intl.NumberFormat`.
- Missing/broken photos: initials on a stable hue. Anonymous: grey "?", never a photo. Long names are never shown here.
- Stale (`?stale=95`): shared pill sits in the free centre of the 100 px top bar; counter and avatar stack dim to 45 % (`.livey`); QR and clock stay full strength.
- Ended: headline becomes "Thanks for coming", tip becomes "Scan to see your profile and connections".
- The URL under the QR (`compa.app/e/demo`) is a placeholder; the real one is `joinUrl` from the page props.

## Motion
- New avatar: scale .3 to 1, 420 ms, cubic-bezier(.2,.9,.3,1.4), only for arrivals after the first paint (keyed DOM, existing photos never reload).
- Counter bump 450 ms on change. Tip cross-fades in 400 ms (translateY 14 px to 0).
- `?reduced=1` (or OS setting): body.reduced kills all animation and the tip stays on the first one.

## Performance
- Keyed DOM sync, at most 20 avatar nodes, re-render every 500 ms only touches changed nodes. No canvas, no libs.
