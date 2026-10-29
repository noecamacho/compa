# Big-screen data visualization: findings

Date: 2026-10-29 · Ticket: `COMPA-<TBD>` · Scope: `/e/<code>/live` at 1920×1080, read from 10 m · Research and prototypes only.

Inputs: [parameters](parameters.md), `proto/` (12 concepts), `notes/`, `shots/<concept>/<scenario>.jpg`, scenarios from `docs/research/sim/`.

**How to run:**
- Start the server: `cd docs/research && python3 -m http.server 4100`.
- Open `http://localhost:4100/dataviz-bigscreen/proto/<concept>.html?scenario=<name>&speed=10&t=0`. Other query flags: `stale=<sec>`, `reduced=1`, `lang=es|en`, `shot=1`.
- Shots: `PW_DIR=<playwright dir> bun shoot.mjs [concepts] [scenarios] [extra]`.
- Parity: `bun parity.check.mjs docs/research`.

## 1. Ranked recommendation
| # | Concept | Verdict | Why |
|---|---|---|---|
| 1 | director | **Ship** as the `/live` shell | Mode by phase and activity (idle, main, rush, closing, finale) with hysteresis and a 30 s minimum dwell. Reuses `LeaderboardPanel`, `Counters`, `JoinQr` and `Loom`. Pure state machine (`?selftest=1`, 11 asserts). |
| 2 | idle-qr | **Ship** in director | Zero activity, pre-event and quiet minutes are common; a 600 px QR plus "who joined" converts the room. Today the board shows an empty loom. |
| 3 | podium, top 5 plus a chasing strip | **Ship** | The plan's centerpiece (p. 6). Rows of 116 px read at 10 m. Shared ranks ("=4") fix ties, and the chasing strip gives everyone else a goal. |
| 4 | topic-race (×1 / ×3 split) | **Ship once there is an API source** | Bars with the value at the end are the most legible form at distance. There is no topic data today. |
| 5 | finale | **Ship short:** recap, top topic, podium reveal, QR | The end of the event is the best moment, and today the screen just stops. |
| 6 | loom-ring | **Keep** `Loom`; add a newest-pair banner and top-N names | Without names it reads "lots of lines". |
| 7 | pulse | Stretch: the rate number in rush mode | A flat line during trickle is demotivating. |
| 8 | story-feed | Stretch: a 3-chip aggregated ticker | It must aggregate during a rush ("+14 in the last minute"). |
| 9 | event-clock | Stretch: closing header only | "1:00 left" is ambiguous; use "1 min left" or "1 h 20 min left". |
| 10 | constellation | Research only | Labels collide, the layout never settles, and 3,000 people become a hairball. |
| 11 | heatmap | Admin view | Needs reading time, and sparse data leaves mostly empty cells. |
| 12 | treemap | Drop | Worse than the topic race; the "+N more" cell cannot be to scale. |

## 2. Per scenario (director)
- **Zero / pre-event:** idle mode, 600 px QR, "Be the first", "Starts in" once `startsAt` exists.
- **One attendee:** "1 person is in". No 0-point podium. The finale skips empty awards.
- **Trickle:** main mode, newest-pair banner and +50 pops. After 180 s without events, "Quiet minute? Find someone into <top topic>". Idle is entered after 180 s and left after 60 s of activity.
- **Steady:** counters, ring, top 5, topic race, 3-chip feed, 200 px QR.
- **Rush:** rush mode at 20 or more connections a minute, back to main below 10. Giant rate number, last-5-minute aggregate, top 5. Reorders animate in 400–500 ms. The feed aggregates.
- **Huge (3,000):** the ring shows the top 28 plus "+2,972"; numbers use thousands separators.
- **Last 10 min:** the top bar turns coral and shows "Ends in 8:42" at 68 px. No layout change.
- **After event:** finale with top-3 podium, totals, top topic, and a QR to "your connections". Late notes still update the totals.
- **Ties:** dense "=4" with a one-line caption (server order kept); shared awards. Gap: the director's own top 5 and rush column show "4" twice without "=".
- **Long, RTL, CJK and emoji names:** ellipsis, `unicode-bidi: isolate`, first names in tight slots. Gap: the rush-mode top 5 truncates to "Leo Gonz…" and needs a wider column.
- **Missing photos:** initials on a stable color; a broken image removes itself. Today `LeaderboardPanel` passes only `name` to `Avatar`, so photos never show on the board.
- **Anonymous:** "Anonymous" with a grey "?". This conflicts between `wiki/live-dashboard.md` (opt-out, p. 13) and `DESIGN.md` (M13, no anonymous mode); see DV-10.
- **Skew, reconnect, network loss:**
  - A pill "Reconnecting… last update 1:35" sits top center, a slot kept free in every concept.
  - Live-only tiles dim to 45 %; the QR, podium and clock stay full strength.
  - Idle time, rate and countdown come from server time (`generatedAt` offset).
  - Out-of-order and duplicate events are deduped by pair, note and badge.
  - Today `stale` is set only when a poll fails. A stuck `generatedAt` never shows as stale; use snapshot age over 10 s.

## 3. Accessibility
- **Size:** text at least 28 px, names at least 40 px, numbers at least 64 px. The current board's labels are about 17 px at 1920 (`clamp(13px,0.9vw,22px)`), too small at 10 m.
- **Contrast:** ink on paper or pastels is above 12:1. Never put white on mint, sun or sky. Muted `#6F6A7E` is about 5:1 and weak on a projector, so use ink for anything that must be read. Ink borders keep shapes visible when a projector washes out the pastel fills.
- **Colorblind:** mint versus gum is weak for deuteranopes [Inference]. Every color carries a label or count. Sky for reconnection, as `DESIGN.md` suggests, is safer.
- **Reduced motion:** final positions, instant cuts, no confetti; static "+N" chips and rank arrows. No flashing above 3 Hz.

## 4. Performance budget (projector laptop)
- **Frame time:** under 8 ms, and zero work while idle. Measured:
  - event-clock: 0.45 ms
  - loom-ring at 3,000 pegs and 1,326 chords: 3.3 ms
  - constellation: 2.7 ms, but it never idles
- **DOM:** under 300 animated nodes; the director ring has at most 28 nodes and 180 paths.
- **Payload:** today the full snapshot every 3 s is about 1 MB at 3,000 people [Inference]. Target under 50 KB through deltas or Realtime.
- **`Loom`:** cap at the newest 600 threads, pause rAF when nothing is fresh, and use an SVG ring fallback instead of the no-WebGL text.
- **Not measured:** a 4-hour memory soak, including Three.js geometry growth in `loom-scene.ts`.

## 5. Backlog tickets (format of `docs/flows/backlog.md`; all depend on T-000)

**DV-1 · Extend the live snapshot with time window, check-ins, topics and notes**

| Type | Priority | Lane | Depends on | Effort |
|---|---|---|---|---|
| backend | **P1** | live+seeds | T-000 | M |

- **Files:** `lib/api/schemas.ts`, `lib/server/live.ts`, `lib/api/examples.ts`, `lib/api/mock.ts`.
- **Acceptance:**
  - `event.startsAt`, `event.endsAt`, `event.status`.
  - `people[].checkedInAt` and `counters.summaries`.
  - `topics[]`, top 8: `{name, score, connections, summaries}`, scored ×1 per connection topic and ×3 per approved-note topic.
  - Additive change; never any summary text.
- **E2E:** `e2e/live-snapshot.spec.ts`: zero, steady and ended mocks parse; empty topics give `[]`; an ended event gives `status: ended`.

**DV-2 · Director: mode state machine for /live**

| Type | Priority | Lane | Depends on | Effort |
|---|---|---|---|---|
| ui | **P1** | live+seeds | DV-1 | M |

- **Files:** new `lib/live/director.ts` with tests ported from `?selftest=1`; `LiveBoard.tsx` becomes a layer stack with a 600 ms cross-fade.
- **Acceptance:**
  - Priority: ended > pre > idle > closing > rush > main.
  - Idle when connections < 3 or no activity for over 180 s; leave idle at 3 or more connections and activity within 60 s.
  - Rush at 20 or more a minute; leave below 10.
  - 30 s dwell, except phase-driven changes.
  - Time comes from the server.
- **E2E:** `e2e/live-director.spec.ts` at 1920 and 1440, `es` and `en`. Zero gives idle, steady gives main, rush gives rush, the last 10 minutes give the coral bar, ended gives the finale, and reduced motion gives cuts.

**DV-3 · Idle / attract mode with a giant QR**

| Type | Priority | Lane | Depends on | Effort |
|---|---|---|---|---|
| ui | **P1** | live+seeds | DV-2 | S |

- **Files:** new `IdleLayer.tsx`; `JoinQr` gets a `size` prop.
- **Acceptance:**
  - QR of at least 520 px; joined counter; at most 19 avatars plus "+N".
  - "Be the first" at zero; rotating tips.
  - "Starts in" before the start; the quiet-minute prompt after 180 s.
- **E2E:** `e2e/live-idle.spec.ts`: zero, one attendee, pre-event and quiet minute, at 390, 834, 1440 and 1920.

**DV-4 · Big-screen podium (top 5, chasing strip, shared ranks)**

| Type | Priority | Lane | Depends on | Effort |
|---|---|---|---|---|
| ui | **P1** | live+seeds | T-000 | M |

- **Files:** `LivePanels.tsx` (`boardRows` gains dense rank and `tied`), new `Podium.tsx`.
- **Acceptance:**
  - Pass `photoUrl` to `Avatar`.
  - Names at least 40 px and points at least 64 px.
  - "=N" with a caption for ties; next three people with their gap.
  - 400 ms reorder and a "+N" pop.
  - At zero points, an invite with the QR instead of empty slots.
- **E2E:** `e2e/live-podium.spec.ts`: tie-heavy shows "=4", zero shows the invite, long names ellipsize, missing photos show initials.

**DV-5 · Topic race (connections ×1, notes ×3)**

| Type | Priority | Lane | Depends on | Effort |
|---|---|---|---|---|
| ui | P2 | live+seeds | DV-1 | S |

- **Files:** new `TopicRace.tsx`.
- **Acceptance:** value at the bar end; ×1 / ×3 split with a legend; a "rising" tag from the last 5 minutes; ghost rows when there are fewer than 8 topics; 500 ms reorder; stable order on equal scores.
- **E2E:** `e2e/live-topics.spec.ts`: an empty state explanation; 8 bars on steady; no reorder flicker on equal scores.

**DV-6 · Stale indicator based on snapshot age and server time**

| Type | Priority | Lane | Depends on | Effort |
|---|---|---|---|---|
| ui | **P1** | live+seeds | T-000 | S |

- **Files:** `useLiveSnapshot.ts`, `LiveBoard.tsx`.
- **Acceptance:**
  - Keep a server offset from `generatedAt`; stale when the last snapshot is over 10 s old.
  - Pill top center; live-only tiles dim.
  - Catch-up after a reconnect is aggregated; a 404 still refreshes.
- **E2E:** `e2e/live-stale.spec.ts`:
  - `x-compa-mock-error` shows the pill within 10 s and clears it on recovery.
  - A stuck `generatedAt` shows stale.
  - A skewed client clock does not change the countdown.

**DV-7 · Finale: end-of-event recap and podium reveal**

| Type | Priority | Lane | Depends on | Effort |
|---|---|---|---|---|
| ui | P2 | live+seeds | DV-1, DV-2 | M |

- **Files:** new `Finale.tsx`.
- **Acceptance:**
  - Scenes of about 6 s: totals, top topic, podium 3→2→1 with confetti, then thanks and the QR.
  - Skip scenes with no data; share tied awards; no 0-point podium.
  - Reduced motion uses cuts.
- **E2E:** `e2e/live-finale.spec.ts`: ended steady, ended with one attendee, and the tie fixture.

**DV-8 · Loom: newest-pair banner, top-N names, thread cap**

| Type | Priority | Lane | Depends on | Effort |
|---|---|---|---|---|
| ui | P2 | live+seeds | T-000 | M |

- **Files:** `loom-scene.ts`, `Loom.tsx`, `LiveBoard.tsx`.
- **Acceptance:**
  - An "Ana ⇄ Luis" banner for 5 s per new connection, at most one every 2.5 s.
  - Top-10 names around the ring; draw at most the newest 600 threads.
  - Pause rAF when idle; SVG fallback when WebGL is missing.
- **E2E:** `e2e/live-loom.spec.ts`: a new-connection mock shows the banner, huge shows "+N", no WebGL shows the SVG fallback.

**DV-9 · Realtime deltas for /live instead of full snapshot polling**

| Type | Priority | Lane | Depends on | Effort |
|---|---|---|---|---|
| backend | P2 | live+seeds | DV-1 | M |

- **Files:** `useLiveSnapshot.ts`, `lib/realtime.ts`.
- **Acceptance:** subscribe to `event:<code>:live`; apply deltas idempotently by id; reconcile with a poll every 15 s; payload under 50 KB at 3,000 people.
- **E2E:** `e2e/live-realtime.spec.ts`: an update shows within 1 s, a duplicate is not double-counted, and the board falls back to polling without Realtime.

**DV-10 · Decide anonymous display and reconnection color**

| Type | Priority | Lane | Depends on | Effort |
|---|---|---|---|---|
| docs | **P1** | captain | — | S |

- **Why:** the wiki says opt-out shows "Anonymous" (p. 13) while `DESIGN.md` M13 says there is no anonymous mode. Reconnection is gum in the loom but `DESIGN.md` suggests sky.
- **Acceptance:** the decision is recorded in `wiki/open-questions.md` and `DESIGN.md`.
- **E2E:** N/A, decision only.

## 6. Not verified
- No projector or 10 m viewing test.
- Performance measured only on a Mac in headless Chromium; no 4-hour soak.
- Rush thresholds tuned on simulated data only.
- Placeholder QR; the join URL `compa.app/e/demo` is fake.
