# Live data visualization research

Date: 2026-10-29 · Ticket: `COMPA-<TBD>` · Baseline: `main` @ `f6f65f3` · Research and prototypes only; no product code changed.

Question: how to get the most from the real-time data on the big screen (`/e/<code>/live`) and on phones, including zero activity, rushes, the end of the event and the edge cases.

## Parts

| Part | What | Tickets |
| --- | --- | --- |
| [sim/](sim/README.md) | Seeded event simulator, 11 scenarios (zero, one attendee, trickle, steady, rush, 3,000 people, end of event, after event, ties, long names, clock skew) and replay helpers | — |
| [dataviz-bigscreen/findings.md](dataviz-bigscreen/findings.md) | 12 big-screen concepts, 155 shots at 1920×1080, ranked | DV-1 – DV-10 |
| [dataviz-phone/findings.md](dataviz-phone/findings.md) | 8 phone concepts, 376 shots at 360/390/430/834 | DP-1 – DP-9 |

Run any prototype: `cd docs/research && python3 -m http.server 4100`, then open `dataviz-bigscreen/proto/<concept>.html?scenario=steady&speed=10`.

## Headlines

1. **Ship a "director" shell for `/live`.** One board that switches mode with phase and activity (idle, main, rush, closing, finale), with hysteresis. It never shows an empty screen: zero activity becomes a 600 px QR.
2. **The snapshot is too thin.** `LiveSnapshot` has no start/end time, check-in time, topics or note count, so countdown, closing phase and topic race cannot be built (DV-1). Its full payload is about 1 MB at 3,000 people (DV-9, DP-1).
3. **Phones should lead with "my spot", not the podium.** Shared ranks and point bands at scale; a light per-viewer endpoint (DP-1).
4. **The end of the event is the best moment and today it just stops.** Finale on the big screen (DV-7) and a shareable 9:16 recap on phones (DP-5).
5. **Staleness is not detected** unless a poll fails (DV-6). Anonymous opt-out is in the plan but absent from every payload, and the wiki and DESIGN.md disagree (DV-10, DP-8).

## Second wave: five more views, a switcher and an event contract (2026-10-29, PR `fm/compa-live-viz-fable`)

Brief (captain): more data-viz proposals that radically change the style but play within COMPA's data, clickable to switch, otherwise rotating; only real events change the picture, otherwise slow ambient motion. Brainstormed twelve directions (3D galaxy, generative garden, kinetic type, physics jar, isometric city, weather map, subway map, aquarium, fireworks sky, knitting, pinball, campfire) and built the five that read best from 10 m and from a phone, each with its own medium so the rotation never feels like one chart in different colours:

| View | Medium | Idle (slow, never still) | Check-in | Connection | Points | Rank climb |
| --- | --- | --- | --- | --- | --- | --- |
| Cosmos | Three.js, perspective camera | Camera orbits, stardust turns, stars breathe | Star born with a flare | Comet flies star to star, target pulses | Star pulses gold | Star pulses coral |
| Garden | Generative SVG + CSS | Stems sway, clouds drift, sun rays spin | Sprout appears | Bee flies on a pollen trail between the two flowers | Flower blooms (pop) | Flower blooms |
| Type ("marquee") | DOM kinetic typography | Columns scroll (ranking, newest pairs), counters breathe | Row lights mint | Pair joins the column | Row lights mint | Row lights mint |
| Marbles | Canvas physics (verlet, sorted sweep) | Gravity tilts slowly, random nudges | Ball drops from the top | Dashed spring pulls the pair, rings flash | Ball inflates with a burst | Coral ring |
| Skyline | Canvas isometric city | Windows twinkle, blimp crosses, stars twinkle | Building rises from the ground | Fireworks from roof to roof | Floors rise | Glow on the tower |

Shared pieces:

- `lib/live/events.ts`: `eventsSince(seen, snapshot)` diffs two snapshots into typed events (check-in, connection, points, rank into the top five). The first snapshot seeds and emits nothing; an unchanged snapshot emits nothing, so a quiet room shows only ambient motion. A rush is trimmed to the newest six with a count (`trimEvents`).
- `components/live/viz/Caption.tsx` + `useLiveEvents.ts`: every new view says in words what happened ("Ana ⇄ Luis", "+10 Ana", "Zoe is in", "Ana → #2"), one event per 1.6 s, the last one lingers 4 s, then nothing. Reduced motion holds the first event of a batch until the next batch.
- Switcher (`LiveStage.tsx`): the indicator strip is now a group of buttons. Tap one to hold it (rotation stops, a pin shows), tap it again to release; keyboard works; `?viz=` hides the strip and pins for good, `?rotate=` keeps working.
- Badges and topics are not in the live snapshot yet, so no view can react to them (see `wiki/open-questions.md`).

Found on the way: keyframes declared inside Tailwind's `@theme` are only emitted when an `--animate-*` token uses them, so the stage's `viz-in`, `viz-out` and `viz-progress` never reached the CSS; moved out of `@theme`, the cross-fade and the progress bar now actually run.

Verification: `bun test` (events, garden, marbles, skyline math), `e2e/live/live-board.spec.ts` ("switcher", "events", and every existing loop now covers nine views: zero, rush, ended, thousands, phone fit, reduced motion); screenshots idle vs reacting for each view under `LIVE_SHOTS`. Not measured on a projector; software WebGL in headless Chromium only.

## Not verified

No projector or real-phone test; performance measured in headless Chromium on a Mac; thresholds tuned on simulated data; QR codes in prototypes are placeholders.

Related: [wiki/live-dashboard.md](../../wiki/live-dashboard.md), [UX audit](ux-audit.md), [backlog](../flows/backlog.md).
