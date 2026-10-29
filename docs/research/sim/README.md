# /live event simulator

Deterministic (seeded) timelines for replaying the `/live` dashboard in visualization prototypes. Research only; nothing here is product code.

## Files

| File | Purpose |
| --- | --- |
| `generate.ts` | Builds every scenario and writes `scenarios/<name>.json` (compact JSON) and `derive.js` |
| `derive.ts` | Pure helpers: `leaderboardAt`, `topicsAt`, `countersAt`, `feedAt` (plus `eventsUntil`, `displayName`) |
| `derive.js` | Generated copy of `derive.ts` without types, a classic script exposing `window.CompaSim` |
| `derive.check.ts` | Self-check: determinism, committed files up to date, `tie-heavy` order, skew/dedupe, `derive.js` parity |
| `scenarios/*.json` | The timelines |

Regenerate and check:

```sh
bun docs/research/sim/generate.ts
bun test ./docs/research/sim/derive.check.ts
```

The `./` prefix is needed because the file does not match the repo's `*.test.ts` glob, which keeps it out of CI.

## Schema

```ts
{
  name: string; description: string;
  durationSec: number;            // replay window is [0, durationSec]
  eventStartsAtSec: number;       // may be negative: the event started before the window
  eventEndsAtSec: number;         // may be negative (after-event) or beyond durationSec
  attendees: { id: string; name: string; headline: string; photo: string | null; interests: string[]; anonymous: boolean }[];
  events: {
    t: number;                    // seconds from scenario start; t < 0 = history, part of the initial snapshot
    type: "checkin" | "connection_requested" | "connection_accepted" | "summary_approved" | "badge";
    a: string;                    // checkin: the person; connection: the scanner (requester); summary: the author; badge: the earner
    b?: string;                   // connection: the scanned person; summary: the other person in the connection
    topics?: string[];            // connection: topics marked / shared interests; summary: approved topics (never text)
    points?: number;              // connection_accepted: points EACH person gets (50 new, 20 reconnection); summary: 15
    badge?: string;               // badge id from lib/badges/catalog.ts
  }[];
}
```

Clarifications (not deviations; the fixed shape is unchanged):

- A `connection_accepted` with non-empty `topics` also pays the scanner `a` +5 (topics marked while registering). `derive.ts` applies it; prototypes that compute scores themselves must too.
- `summary_approved` pays only the author `a`.
- `badge` events carry no points. Emitted: `apreton` (first connection), `madrugador` (first connection within 60 min of the start), `maraton` (15 connections), `iman` (scanned 10 times), `cierre` (a connection in the last 30 min).
- Events are sorted by `t` in every scenario except `clock-skew-and-reconnect`, which is in delivery order. The helpers never trust array order.
- Anonymous attendees keep their real `name` in the file; the helpers show them as `Anonymous` with no photo (wiki/live-dashboard.md, Privacy). A prototype must never render `attendee.name` directly.
- `photo` is a `https://i.pravatar.cc` URL (needs network) or `null`.

## Rules used

| Rule | Source |
| --- | --- |
| +50 new / +20 reconnection to both, +5 scanner for marked topics, +15 note author | `wiki/points-rules.md` |
| Leaderboard order: points, connections, earliest check-in (then id); only checked-in people | `wiki/points-rules.md`, `lib/server/live.ts` |
| One connection per pair, one note per connection, one badge per person (dedupe) | `wiki/points-rules.md` (Idempotency) |
| Topic race: connection topics x1, approved summary topics x3 | `wiki/live-dashboard.md`, `wiki/topics-vocabulary.md` |
| Topic vocabulary | `lib/topics.ts` (imported) |
| Badge ids and rules | `wiki/rounds-and-badges.md`, `lib/badges/catalog.ts` (imported), `lib/badges/rules.ts` |
| Counters `checkedIn`, `connections`, `newCount`, `reconnections` | `LiveSnapshot` in `lib/server/live.ts` |

`countersAt` adds `summaries`, `pendingRequests`, `activePeople` (people in an accepted connection in the last 600 s; the plan names "active people" without defining it) and `eventState` (`before` / `running` / `ended`).

## Scenarios

| Scenario | Size | Edge case it exercises |
| --- | --- | --- |
| `zero-activity` | 1 attendee, 0 events | Event open, nobody checked in: every widget's empty state |
| `one-attendee` | 1 attendee, 1 event | Podium of one, no connections, no topics, no feed |
| `trickle` | 60 people, 1 connection / 20 s, 30 min | Slow motion; animations must not feel dead or jumpy |
| `steady` | 150 people, 300 connections, ~84 summaries, 2 h | The plan's seed shape; the normal demo |
| `rush` | 300 people, 40 connections/min from t=600 to 780 | Burst: reorder storms on the podium, feed overflow, bar race churn |
| `huge` | 3000 people, ~10.5k events, 3 h, 1.2 MB | Stress: layout with thousands of rows, replay and derive performance |
| `end-of-event` | 150 people; history at t<0, finale 30/min t=420-600, ends t=600 | Initial snapshot, finale climax, transition to "ended", late summaries after the end |
| `after-event` | 150 people; all events t<0, ended at t=-60 | Frozen final leaderboard; nothing moves |
| `tie-heavy` | 40 people, hand-built | Exact ties at 150 and 100 points; 100/5 connections beats 100/2; check-in order breaks ties; four people at 0 |
| `long-names-and-missing-photos` | 80 people | Very long, RTL, CJK, emoji, accented, padded names; long headlines; ~40% no photo; ~15% Anonymous |
| `clock-skew-and-reconnect` | 100 people, 30 min | Delivery order != time order, skewed `t` (accept before request), duplicate deliveries, 25 events sharing one `t`, disconnect gap t=900-1200 caught up at once |

## Loading in a standalone HTML prototype

```html
<script src="../sim/derive.js"></script>
<script>
  fetch("../sim/scenarios/steady.json").then((r) => r.json()).then((s) => {
    const rows = CompaSim.leaderboardAt(s, 1800);
  });
</script>
```

`fetch` of a local file fails over `file://`; serve the folder (`bunx serve docs/research`). `derive.js` itself loads from `file://`. Each helper rescans events up to `t` (results are not memoized except the sorted, deduped event list), which is fast enough for `huge` at a few calls per second.

Related: [live-dashboard](../../../wiki/live-dashboard.md), [points-rules](../../../wiki/points-rules.md).
