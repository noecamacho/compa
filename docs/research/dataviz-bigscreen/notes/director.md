# director (recommended /live composite)

File: `proto/director.html` (about 400 lines, vanilla JS and SVG, no libs). Shots: `shots/director/<scenario>.jpg`, plus `steady--stale-95`, `clock-skew-and-reconnect--stale-95`, `steady--lang-es`.
Self-check of the state machine: open `?selftest=1` (11 asserts, title becomes "selftest PASS"). HUD at bottom-left shows mode, rate60, idleFor and seconds since the last flip, hidden with `?shot=1`.

## Modes and layouts
| Mode | When | Layer |
| --- | --- | --- |
| idle | phase `pre`; or live with < 3 connections; or live with `idleFor` > 180 s | giant QR 600 px, joined counter, avatar stack, rotating tip / "Quiet minute?" prompt |
| main | live with activity | counters row, 28-node ring of connections, top 5, topic race (top 6), feed (3 chips), QR corner 200 px |
| rush | live, connections per last 60 s >= 20 | giant pulse number + 12-minute bars, aggregate of last 5 min (connections, notes, arrivals, hot topics, "on a roll" top 3), top 5, QR 200 px |
| closing | phase `closing` (last 10 min), not idle | main layer; the top bar turns coral and the countdown "Ends in 8:42" is 68 px |
| finale | phase `ended` | podium top 3, three totals, top topic, QR; the full sequence is the `finale` concept |

The top bar (brand, phase pill, clock) is persistent and never fades; the stale pill lives in its free centre.

## State machine (pure functions `desiredMode`, `nextMode`)
Inputs: `phase`, `counters.connections`, `idleFor`, `rate60` (connections with `t` in the last 60 s, walked backwards from the newest), `now`.
Priority: ended > pre > idle > closing > rush > main.
- idle: enter when connections < 3 or `idleFor` > 180 s; leave only when connections >= 3 and `idleFor` <= 60 s (hysteresis 60/180).
- rush: enter at `rate60` >= 20, leave below 10. Calibrated on the sim: steady peaks at 9/min, huge at 19/min, rush at 44/min, end-of-event burst 34/min.
- Dwell: no flip within 30 s of the previous flip. Phase-driven flips (`closing`, `finale`) bypass the dwell because they are one-way and cannot flap. In the replay the clock is sim time (`state.now`); in production use `Date.now()` / `generatedAt`.
- Cross-fade 600 ms opacity (layers are stacked; the new layer is populated before it fades in; the outgoing layer is frozen, not re-rendered). Closing is not a layer change: only the bar colour animates (600 ms).

## Why it works at 10 m
Numbers 84 px (counters) to 240 px (pulse); every text >= 28 px; rows 116 px tall in the top 5 with 80 px avatars; flat brand fills; the ring is decorative-but-honest (28 nodes, chords = real connections) and is never the only carrier of a number.

## Failure modes
- Zero / one attendee, pre-event: idle layer (QR 600 px). Trickle: main; steady: main; rush: rush layer.
- Huge (3000): ring shows the top 28 by points; chords to people off the ring become short stubs to the centre and the centre reads "+2,972"; counters use thousands separators; feed and ring use only the newest 600 connections.
- Ties: dense rank shown (two "4" rows in the top 5); long names truncated with ellipsis (`min-width: 0`, `unicode-bidi: plaintext` for RTL); missing photo = initials; anonymous = "?" and "Anonymous".
- Stale (`?stale=95`): the pill shows in the bar centre; the pulse tile and the feed dim to 45 % (`.livey`); the QR, ring, top 5 and clock stay full strength because they are still true.
- Feed never shows note text, only "Ana saved a note · topic".
- Known cosmetic gaps: topic labels draw over the bar fill (ink on pastel, still legible); with fewer than 4 events the feed shows fewer chips.

## Motion
Counter bump 450 ms; avatar/node pop 420 ms; new chord draws itself 700 ms (stroke-dashoffset); top-5 and topic rows glide with `translateY` 500 ms cubic-bezier(.3,.8,.3,1); topic bar width 500 ms; ring nodes glide 600 ms when a slot changes; feed chips slide 500 ms. `?reduced=1`: body.reduced removes every transition and animation, so layer swaps are instant cuts.

## Performance
- Layers are built once; only the visible layer updates. Components diff before writing (counter text, keyed rows, ring signature = connection count + node ids/ranks), so a quiet tick touches almost nothing.
- Ring is SVG with at most 28 nodes and 180 paths. Tick 500 ms; `rateIn` is O(window) not O(connections). `stateAt` in the shared runtime is O(events) per change, which is fine for the prototype; the real board receives folded data.

## React port (map to current files)
| Prototype | React | Today |
| --- | --- | --- |
| `desiredMode` / `nextMode` + `useRef` dwell | `lib/live/director.ts` (pure, tested) and `useLiveMode(snapshot, now)` | new |
| bar + layer stack + cross-fade | `LiveDirector.tsx` (replaces the body of `LiveBoard.tsx`), `LiveTopBar.tsx` | header of `LiveBoard.tsx` |
| `Counters` | `Counters` (exists in `LiveBoard.tsx`; add pulse) | exists |
| `Ring` | reuse `Loom.tsx` / `loom-scene.ts` for large screens; SVG ring only as a lightweight fallback | `Loom.tsx` |
| `Top5` | `LeaderboardPanel` in `LivePanels.tsx` (`boardRows`) | exists |
| `TopicRace`, `Feed`, `RushPanel`, `Podium`, `Idle` | new `components/live/*` | new |
| `QrBlock` | `JoinQr` in `LiveBoard.tsx` (needs size prop, >= 200 px) | exists |
| stale pill | `stale` from `useLiveSnapshot` | exists |

## Inputs the API does not provide today (`LiveSnapshot`: event{code,name,isRunning}, people[{id,name,photoUrl,points}], connections[{id,a,b,kind,at}], counters, generatedAt)
- Event start and end times (phase pre/live/closing/ended, countdown, `remaining`). `isRunning` alone cannot give "starts in" or "last 10 min": add `event.startsAt`, `event.endsAt`.
- Check-in time per person (`people[].checkedInAt`) for the avatar stack, ring slot order and tie-break; `registered` count for "of N".
- Topics (`topics[{name, score, connections, summaries}]`, the x3 summary weight) for the topic race, top topic and the quiet-minute prompt.
- Notes count (`counters.summaries`) and per-person `summaries`; connection `topics[]` (feed text, hot topics); note events for the feed (without text).
- Badges (`badge` events or `people[].badges`), `anonymous` flag (today only implied by the name), per-person `connections` (leaderboard rows have it, `people[]` does not), points in `connections[]` or `kind` already there (`kind` is present, good).
- Feed: a recent-events list (`events[{type, at, a, b, topics, badge}]`) or derive it from `connections[].at` client-side (works for connections only).
- Server clock offset (`generatedAt` exists; use it to compute `idleFor` and `rate60` so a skewed projector clock cannot flip modes).
- `joinUrl`/QR already come as page props. `isRunning` is not enough to separate `pre` from `ended`.
