# Phone data-viz: parameters available today

What the attendee's phone can show, by source field, read from `lib/api/schemas.ts`, `lib/server/live.ts`, `lib/server/scores.ts`, `lib/badges/rules.ts` and the screens under `app/(app)/` on `main` @ `f6f65f3` (2026-10-29). "Derived" means the prototypes compute it from the replayed event stream (`proto/engine.js`); the API does not return it today.

Related: [findings](findings.md), [sim README](../sim/README.md), [wiki/live-dashboard](../../../wiki/live-dashboard.md), [wiki/points-rules](../../../wiki/points-rules.md).

## 1. Sources and how often they refresh

| Endpoint | Schema | Who sees it | Refresh on the phone today |
| --- | --- | --- | --- |
| `GET /api/me` | `Me` | the signed-in user | per page render (server components) |
| `GET /api/e/{code}/live` | `LiveSnapshot` | anyone with the code, cached `s-maxage=1` | Home: once per render (no polling); `/e/{code}/live`: polled every 3 s by `useLiveSnapshot` while visible |
| `GET /api/e/{code}/live/people/{userId}` | `LivePersonCard` | public | on tap (big screen) |
| `GET /api/e/{code}/leaderboard?scope=event\|lifetime&limit≤100` | `Leaderboard` | public rows; `me` only when signed in (then not cached) | per render of `/ranking` |
| `GET /api/e/{code}` | `EventDoor` | public | per render |
| `GET /api/badges` (`?of=handle`) | `BadgeList` | self or others | per render of `/me/badges` |
| `GET /api/connections` | `ConnectionList` | self | per render of `/connections`, Home |
| `GET /api/notifications` | `Notifications` | self | per render (bell) |

## 2. Event-level fields

| Field | Source | Notes for phone viz |
| --- | --- | --- |
| `event.name`, `event.code`, `event.isRunning` | `LiveSnapshot.event` | `isRunning` is boolean only |
| `phase` (`upcoming` / `running` / `ended`) | `EventDoor.phase` | the only phase signal; no "last 30 min" flag (derive from `endsAt`) |
| `startsAt`, `endsAt` | `Event` / `EventDoor` | needed for countdown, "last call", recap timing |
| `counters.checkedIn` | `LiveSnapshot.counters`, `EventDoor.counters` | |
| `counters.connections`, `newCount`, `reconnections` | `LiveSnapshot.counters` | accepted only; pending requests are not counted |
| `people[]` = `{id, name, photoUrl, points}` | `LiveSnapshot.people` | **every** checked-in attendee, in leaderboard order; no `connections`, no `rank`, no anonymous flag |
| `connections[]` = `{id, a, b, kind, at}` | `LiveSnapshot.connections` | **every** accepted edge of the event, ordered by `respondedAt`; enough to derive pulse, ego graph and second-degree edges client-side |
| `generatedAt` | `LiveSnapshot` | the only staleness signal |
| summaries count | none | Derived. Plan counter "summaries" is not in `LiveSnapshot.counters` |
| active people (last N min) | none | Derived from `connections[].at` |
| topic race (`[topic, score]`) | none in the snapshot | Derived. Plan rule: shared interests ×1 per connection, approved summary topics ×3 (`wiki/live-dashboard.md`); connection topics are not in `LiveConnection` |
| recent feed (`Ana ⇄ Luis` + topics) | none | Derived from `connections[]` (no topics) |

## 3. My standing

| Field | Source | Notes |
| --- | --- | --- |
| `scores.event.rank`, `scores.event.points` | `Me.scores` (`standingOf`) | `rank` is `null` while `points === 0` |
| `scores.lifetime.rank`, `.points` | `Me.scores` | "Todo el año" tab |
| `me.rank`, `me.points` | `Leaderboard.me` | rank is the unique row index (no shared ranks on ties) |
| `me.above` (`LeaderboardRow`) | `Leaderboard.me` | the person directly above |
| `me.gap` | `Leaderboard.me` | `above.points - mine.points + 1` in code; the schema text says "points needed to pass", 0 when first. On an exact tie it is 1 |
| `me.tip` | `Leaderboard.me` | Spanish only (`rankingTips` in `lib/copy/es.ts`) |
| row below me | none | Derived (needs the full board or `limit` around me); "who is chasing you" |
| shared rank / percentile | none | Derived (`crank`, top X %) |
| rank history over the night | none | Derived from replay; the server keeps no rank snapshots |
| points in the last 10 min (momentum) | none | Derived from `connections[].at` + kind (+50/+20); topic (+5) and note (+15) bonus timing is not in the snapshot |
| `stats.newConnections`, `reconnections`, `events` | `Me.stats` (`statsFor`) | all-time, not per event |

## 4. Leaderboard rows

| Field | Source | Notes |
| --- | --- | --- |
| `rank`, `userId`, `name`, `photoUrl`, `points`, `connections` | `LeaderboardRow` | order: points desc, connections desc, earliest check-in |
| `limit` | query, 1–100, default 20 | there is no "window around me" parameter |

## 5. Badges

| Field | Source | Notes |
| --- | --- | --- |
| `Me.badges[]` (`BadgeId`) | `Me` | earned, most recent first |
| `badges[].id`, `earnedAt`, `earnedNote`, `progress {current,total,label}` | `BadgeList` | progress is `null` for secrets and rule-less badges |
| `earned`, `total` | `BadgeList` | |
| rule facts (`connectionsTonight`, `scannedBy`, `firstConnectionMinute`, `minutesBeforeEnd`, `distinctTopics`, `notesApproved`, …) | `BadgeFacts` in `lib/badges/rules.ts` | server only; the phone sees `progress` |
| per-event "earned tonight" | none | Derived from `earnedAt` vs event window |

Badges with a computable rule: `apreton`, `madrugador` (≤ 60 min), `cierre` (≤ 30 min before end), `iman` (10 scans), `maraton` (15 tonight), `tresdetres`, `duo`, `conector100`, `trotamundos` (4 cities), `curioso` (10 topics), `memoria` (20 notes), `quinientos`, `cuatro`, `og`, `ff2026`. `puente` is fixed at 0/3. Secrets: `rey`, `speaker`, `noctambulo`, `cazatalentos`.

## 6. My connections

| Field | Source | Notes |
| --- | --- | --- |
| `people[].person` (`Card`: `name`, `photoUrl`, `headline`, `company`, `city`, `interests`) | `ConnectionList` | |
| `people[].meetings[]` (`direction`, `points`, event) | `PersonHistory` | time of each meeting |
| `people[].type` (`new` / `reconnection` / `friend`), `topics`, `totalPoints`, `lastMetAt` | `PersonHistory` | colour and size channels for an ego graph |
| `totals.points`, `.connections`, `.people` | `ConnectionList` | |
| `incoming[]` | `ConnectionList` | pending requests to me |
| second-degree edges (my connections connected to each other) | none for the user; derivable from `LiveSnapshot.connections` | the public snapshot already exposes the whole event graph |
| `Relationship.mutual[]`, `reconnections`, `eventsTogether` | `UserProfile` | per other person |

## 7. Notifications usable as "moments"

`request`, `accepted`, `invitee_connected`, `badge_earned` (`Notification` union) with `createdAt` and `unseen`. A rank change has no notification kind.

## 8. Replay parameters used by the prototypes

`?scenario=<name>&speed=<x>&t=<sec>&me=<attendeeId|@top|@mid|@last|@tied|@anon|@zero>&lang=es|en&stale=<sec>&chrome=0&photos=1`. `t` defaults to an interesting moment per scenario; `speed=0` freezes the frame; `stale` replays the state `stale` seconds behind and shows the offline banner. Scenario files: `../sim/scenarios/*.json` (schema in the sim README); without them `engine.js` generates an inline fixture with the same schema.
