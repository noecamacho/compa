# Phone data-viz: findings and recommendations

Date: 2026-10-29 · Ticket: `COMPA-<TBD>` · Baseline: `main` @ `f6f65f3` · Scope: what the attendee sees on a phone or tablet (Home live card, Ranking, badges, my network, trending, recap, "now" mode).

**Inputs:**
- [parameters](parameters.md): the field inventory.
- 8 prototypes in [`proto/`](proto/).
- 376 screenshots in [`shots/`](shots/): 10 scenarios × 4 viewports (360, 390, 430, 834) plus 7 persona shots per concept. The personas are me at rank 1, last, tied, anonymous, zero connections, offline, and English.
- Scenarios from [`../sim/`](../sim/README.md).

**Run it:**
1. Start `python3 -m http.server 4200` from `docs/research`.
2. Open `http://localhost:4200/dataviz-phone/proto/<concept>.html?scenario=steady&speed=5`.
3. To re-shoot, run `PW=<abs path to playwright/index.mjs> node shoot.mjs [concepts] [scenarios]`.

**Labels:** [Verified] means read in code or seen in a screenshot; [Inference] is reasoned from code; [Speculation] is untested.

## 1. Ranked recommendations

1. **Make "my spot" the hero, not the podium.** For most attendees, the top 3 are strangers.
   - Lead with my rank, the gap to the person above, who is chasing me, and the next action ("≈ 1 new connection").
   - Keep the podium at about 190 px. Today `RankingView.tsx` uses a 372 px podium, so on a 360×740 phone my own card is below the fold.
   - [rank-ladder](proto/rank-ladder.html). [Verified]
2. **Show ties honestly, and use point bands at scale.**
   - The server gives every row a unique rank, ordered by points, then connections, then check-in time (`lib/server/live.ts`).
   - In `huge`, the median attendee shows as #1201 while 438 others have exactly 50 pts. In `tie-heavy`, 19 people share 150 pts.
   - Show a shared rank or a percentile ("Top 29 %"). From 5 ties up, replace the neighbour ladder with point bands: each score with its head count.
   - [Verified: `shots/rank-ladder/huge-390.jpg`, `me-tied-390.jpg`]
3. **Turn zero points into a promise with a number.** Rank is `null` until the first point. Instead of "make your first connection", say "One connection puts you at #46", computed from the board. [Verified: `me-zero-390.png`]
4. **Add a light per-viewer live endpoint.**
   - Home fetches the full `LiveSnapshot` (every attendee and every edge) to draw one counter and 3 pairs.
   - For a synthetic payload of 3,000 people and 1,900 edges, I measured about 860 KB raw and 250 KB gzip per fetch.
   - At the big screen's 3 s polling rate, a phone would pull about 5 MB per minute. Home does not poll today, so it is also stale; that part is [Inference].
   - A `me-live` payload stays under about 2 KB: counters, 5-minute pulse buckets, last 3 pairs, and my standing with `below`, shared rank, percentile and points in the last 10 min.
5. **Give every surface a phase.**
   - `EventDoor.phase` exists, but Home and Ranking ignore it.
   - The prototypes show a countdown before the event, "last call" in the final 30 min (which matches the `cierre` badge), a frozen "Final" once it ends, and a recap CTA instead of "Connect now". [Verified in shots]
6. **Make the recap card the after-event hero.**
   - A 9:16 card with: final shared rank "of N", points, new vs reconnections, top 3 topics, badges earned tonight, first connection time, and a dot constellation.
   - Counts and topics only, no partner names or initials. The privacy rule is in `wiki/live-dashboard.md`.
   - This is the event's after-life on Instagram stories and LinkedIn. [recap-card](proto/recap-card.html)
7. **Show one "next milestone".** Combine the rank gap and the closest badge into one line ("1 connection → break the tie at #58"). Under it, show the 3 closest badge rings with a concrete action, using `BadgeStatus.progress`. Badges whose window has closed drop out: Madrugador after the first hour; Cierre only in the last 30 min. [badge-progress](proto/badge-progress.html)
8. **"My network" as a graph only where it pays.**
   - The ego graph puts me in the centre, places partners clockwise by time, uses the inner ring for new and the outer ring for reconnections, sizes nodes by shared topics, and draws faint second-degree edges.
   - Above 18 nodes, fold the oldest into "+N". The list below the graph is the accessible, tappable alternative.
   - Second-degree edges can already be derived from the public `LiveSnapshot.connections`. [my-network](proto/my-network.html)
9. **Trending, "now" mode and the night timeline are P2.**
   - They need data the API lacks: points in the last 10 min, topic scores, a feed, points history.
   - They are fun while the big screen runs but do not move the core loop.
   - Trending never names people who are falling. [trending](proto/trending.html), [now-mode](proto/now-mode.html), [night-timeline](proto/night-timeline.html)

## 2. Concepts

| Concept | Surface | Shows | Data it needs that the API lacks |
| --- | --- | --- | --- |
| rank-ladder | `/ranking` | Small podium; "your spot" card with gap, chaser and next action; 2 above and 2 below; point bands when 5+ ties; rank sparkline for my night | `below`, shared rank / percentile, rank history |
| home-live-card | `/home` | Counters (connections, here, active in 10 min); 5-minute pulse bars with the peak marked; last 3 pairs with topic; "+N pts in 10 min"; rank chip; per-phase states | pulse buckets, topics per connection, `lastSeenAt` for "since you opened" |
| now-mode | pocket mirror of `/live` | Sticky "you" pill; 4 counters; top-8 topic bars; feed capped at 6 rows with "+66 connections in the last 5 min" | topic scores, feed, summary count |
| night-timeline | `/me` or the recap | Step chart of my points, markers for my connections and badges, the attendee median with a p25–p75 band | points series per person, percentiles over time (heavy to compute on the client) |
| badge-progress | `/me/badges`, Home | Next milestone; 3 closest rings with actions; shelf of earned badges with time and partner; final state | "with whom / when" per badge, a reachable-tonight flag |
| my-network | `/connections` (graph toggle) | Ego graph, topic legend, stats, list | my edges with `kind`, time and shared topics (in `ConnectionList`), second-degree edges |
| trending | P2 tab | Top 8 by points in the last 10 min with sparkline and rank climb; rising topics; my own movement; "quiet right now" state; "biggest climbers of the night" once ended | points in a recent window, topic momentum |
| recap-card | after the event | 9:16 share card; "preview" ribbon while running; kind zero-connection version | event name in the payload, topics per person |

## 3. Behaviour per scenario

| Scenario | What the phone should do |
| --- | --- |
| `zero-activity` (1 person, not checked in) | Show a "check in to start" or "nobody has connected yet" state with one CTA; never an empty podium of zeros |
| `one-attendee` | "You're the first one here: when someone arrives, scan them and you both get +50"; hide ranks |
| `trickle` | Lead with "one connection puts you at #N"; the pulse uses absolute counts so it does not look dead |
| `steady` | The design target |
| `rush` (40/min) | Do not animate every reorder; summarise ("+66 in 5 min"); keep my row stable and animate only my own change |
| `huge` (3,000 people) | Percentiles and point bands; capped lists; the light payload |
| `end-of-event` | "Last call · 4 min left", then switch to Final without a reload |
| `after-event` | Everything frozen; "Final: #61 of 150"; the CTA becomes "See my recap" |
| `tie-heavy` | Shared rank, plus the tie-break rule in words ("+1 connection breaks the tie") |
| `long-names-and-missing-photos` | Ellipsis and `min-width: 0`; `dir="auto"`; initials fallback; Anonymous as a grey "?" avatar |

**Personas:**
- **Rank 1:** "You're first · 25 pts ahead" and who is chasing; no ladder.
- **Last:** show only the people just above and the action; never "last of 150".
- **Tied:** shared rank.
- **Anonymous:** I still see my own name with "anonymous on screen"; others see "Anónimo". There is no anonymous flag in `Card`, `LivePerson` or `LeaderboardRow`, so the plan's opt-out (p. 13) cannot be enforced yet. [Inference: grep]
- **Zero connections:** "one connection puts you at #N".
- **Offline or stale:** a dark banner "Offline · data from 3 min ago" based on `generatedAt`; live dots stop. Today's Home has no staleness signal.
- **Event ended:** Final pill, no Connect CTA.

## 4. Touch targets and one-hand reach

- Rows are at least 48 px (my row is 58), buttons 54 px, dock items at least 44 px, and ego-graph nodes have a 44 px hit area.
- The thumb zone is the bottom 40 % of a 390×844 screen. Keep the single action just above the dock, and put reading content (podium, charts) at the top.
- Above about 12 nodes, graph nodes are too dense to tap reliably; use the list.

## 5. Reduced motion

- Every shot was taken with `reducedMotion: "reduce"`, and every concept stays complete.
- Today's Home LIVE card relies on `animate-pair` and starts its pairs at `opacity-0`. With motion off, the pairs may never appear. [Inference from `LiveCard.tsx`; needs an e2e check]
- The rule: draw the data statically first; motion only marks a change.

## 6. i18n (es / en)

- Spanish runs about 15–25 % longer, so headlines wrap to 2 lines at 360 px. Design for 2 lines.
- `Leaderboard.me.tip` comes from `rankingTips` in `lib/copy/es.ts`, so English users get Spanish. [Verified] Return a code plus numbers and let the client word it.
- Format numbers with `toLocaleString` (`es-MX` / `en-US`).
- Names that are CJK, RTL or emoji get whatever their first code point is as an initial. Use the monito avatar.

## 7. Performance on low-end phones

- **Payload:** see recommendation 4.
- **Polling:** 10–15 s, only while visible. `useLiveSnapshot` already checks visibility. The big screen keeps 3 s.
- **React:** key rows by `userId` and animate only transforms. The prototypes re-render the whole screen as a string every tick; do not copy that.
- **Client-side history:** the median band and rank history replay about 12–17 states on the client, which is slow in `huge`. Compute that series on the server or drop it.
- **Ego graph:** cap it at about 18 nodes plus a "+N" bubble.

## 8. Shareable recap card

- Render it on the server with `next/og` at 1080×1920.
- Share through `navigator.share({ files })`, with "Save image" as the fallback.
- Open it from `phase = ended`, with a preview ribbon while the event runs.
- Zero-connection version: "You came. Next time scan one person: +50". [Speculation: export not tested]

## 9. Open questions

- Should the server return a shared (competition) rank, or should only the UI show it?
- `gap` is `above.points - mine.points + 1` in code but "points needed to pass" in the schema. On a tie, a 1-point gain is impossible, because points move in steps of 5, 15, 20 and 50.
- Is "last call" an organizer moment, or just derived from `endsAt`?

## 10. Not verified

Not tested in WebKit, on real devices, or against the running app. Numbers come from replayed sim scenarios.

## 11. Backlog tickets

<a id="dp-1"></a>
### DP-1 · Light per-viewer live endpoint for phones

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | **P1** | live+seeds | T-000 | M |

- **What:** add `GET /api/e/{code}/live/me`, returning:
  - `counters` and `phase`.
  - 5-minute `pulse[]` buckets.
  - The last 3 pairs as `{a, b, at, kind}`, with names.
  - `me` with `rank`, `sharedRank`, `percentile`, `points`, `above`, `below`, `gap`, `recentPoints`, `tiedWith`, plus `generatedAt`.
- **Constraints:** under 4 KB at 3,000 attendees; not publicly cached.
- **E2E:** `e2e/live/me-live.spec.ts`. Scenarios: in mock mode, steady renders counters; 0 points gives `rank: null`; a tie gives a shared rank; an ended event gives `phase: ended`; 404 after a code rotation; `x-compa-mock-error` shows the error state. Locales es and en.

<a id="dp-2"></a>
### DP-2 · Home live card v2: pulse, phases, staleness

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | **P1** | live+seeds | DP-1 | M |

- **What:**
  - Pulse bars, three counters, last 3 pairs as a static list (motion optional), and a rank chip.
  - Per-phase states: upcoming countdown, last call in the final 30 min, Final with a recap link.
  - Visible-only polling every 15 s, and an offline banner from `generatedAt`.
- **Reference:** `proto/home-live-card.html`.
- **E2E:** `e2e/home/live-card.spec.ts`. Scenarios: running, upcoming, last call (`page.clock`), ended, zero connections, offline (route abort shows the banner), reduced motion shows the pairs. Viewports 390, 834, 1440; locales es and en.

<a id="dp-3"></a>
### DP-3 · Ranking: "my spot" first, shared ranks, point bands

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | **P1** | connections+points | DP-1 | M |

- **What:**
  - Shrink the podium to about 190 px.
  - "Your spot" card: gap, chaser and next action.
  - 2 above and 2 below.
  - Shared rank; point bands when 5 or more people are tied.
  - Zero points: "one connection puts you at #N".
  - Ended: "Final #N of M" and a recap CTA.
- **Reference:** `proto/rank-ladder.html`.
- **E2E:** `e2e/ranking/my-spot.spec.ts`. Scenarios: me at rank 1, middle, last, tied, a 5+ tie shows bands, zero points, ended, lifetime tab. Viewports 360, 390, 834; locales es and en.

<a id="dp-4"></a>
### DP-4 · Localize ranking tips and gap semantics

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | **P1** | connections+points | — | S |

- **What:** replace the Spanish `me.tip` with `tipCode` plus numbers, and document whether `gap` means "to tie" or "to pass" in the schema text.
- **E2E:** `e2e/ranking/tips-i18n.spec.ts`. Scenarios: an `en-US` user sees an English tip; tie, first and no-rank cases.

<a id="dp-5"></a>
### DP-5 · Post-event recap card with share image

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | **P1** | summaries | DP-1 | L |

- **What:**
  - A `/recap/{code}` page plus a `next/og` 1080×1920 image.
  - Content: shared rank of N, points, new vs reconnections, top 3 topics, badges tonight, first connection time, a dot constellation with no names.
  - Web Share with files, falling back to Save.
  - A preview ribbon while running; a kind zero-connection version.
- **Reference:** `proto/recap-card.html`.
- **E2E:** `e2e/recap/recap.spec.ts`. Scenarios: ended with connections, zero connections, running (preview ribbon), anonymous user (no names anywhere), the image endpoint returns 200 `image/png`, the share fallback. Viewports 390, 834; locales es and en.

<a id="dp-6"></a>
### DP-6 · "Next milestone" and closest badge rings

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P2 | connections+points | — | M |

- **What:**
  - One merged rank/badge line, plus 3 closest rings from `BadgeStatus.progress` with action copy.
  - Hide windows that have closed (`madrugador` after 60 min); show `cierre` only in the last 30 min.
- **Reference:** `proto/badge-progress.html`.
- **E2E:** `e2e/badges/next-up.spec.ts`. Scenarios: zero badges, some earned, all earned, ended, secret badges show no hint; locales es and en.

<a id="dp-7"></a>
### DP-7 · "My network" ego graph on Connections

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P2 | profile+QR | — | L |

- **What:**
  - A graph/list toggle on `/connections`; SVG ego graph capped at 18 nodes plus "+N".
  - Second-degree edges from the server (my partners' edges among themselves).
  - The list stays the accessible default.
- **Reference:** `proto/my-network.html`.
- **E2E:** `e2e/connections/network-graph.spec.ts`. Scenarios: 0, 1, 20 and 60+ connections; tapping a node opens the person; keyboard and screen reader use the list; reduced motion.

<a id="dp-8"></a>
### DP-8 · Anonymous flag through every public payload

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | **P1** | live+seeds | captain decision | M |

- **What:** an opt-out flag on the attendee. `LiveSnapshot.people`, `LeaderboardRow` and `LivePersonCard` return "Anonymous" with no photo for others; the owner still sees themself. The plan requires this (p. 13); no field exists today.
- **E2E:** `e2e/live/anonymous.spec.ts`. Scenarios: an anonymous user is hidden on `/live`, `/ranking` and Home pairs; visible to themself; toggling it back.

<a id="dp-9"></a>
### DP-9 · "Now" mode and trending (pocket mirror of the big screen)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P2 | live+seeds | DP-1 | M |

- **What:**
  - Topic scores (×1 per connection, ×3 per summary) and a capped feed in DP-1.
  - A phone view with counters, topic bars, the feed with a "+N in 5 min" summary, and a sticky "you" pill.
  - Trending by points in the last 10 min that never names people who are falling.
- **Reference:** `proto/now-mode.html`, `proto/trending.html`.
- **E2E:** `e2e/live/now-mode.spec.ts`. Scenarios: quiet, rush summary, ended ("climbers of the night"), no summary text ever rendered.
