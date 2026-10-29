# Live data parameters for the big screen

Date: 2026-10-29 · Ticket: `COMPA-<TBD>` · Read from `main` @ `f6f65f3` (worktree `docs/COMPA-TBD-live-dataviz-and-ux-research`).

What `/e/<code>/live` can show, where each value comes from, and whether the board receives it today. "Snapshot" means `GET /api/e/{code}/live` (`lib/server/live.ts`, schema `LiveSnapshot` in `lib/api/schemas.ts`), polled every 3 s by `components/live/useLiveSnapshot.ts`. "Realtime" means the public channel `event:<code>:live` (`lib/realtime.ts`), which the board does not subscribe to yet.

Status: **On screen** = in the snapshot and drawn; **In snapshot** = sent, not drawn; **Realtime only** = broadcast, not in the snapshot; **DB only** = stored, would need an API change; **Derivable** = computable on the client from what is already sent.

## 1. Event

| Parameter | Source field | Status | Notes |
| --- | --- | --- | --- |
| Name | `snapshot.event.name` ← `events.name` | On screen | Header `h1`, truncates |
| Access code | `snapshot.event.code` ← `events.access_code` | In snapshot | Also the Realtime topic key; rotation returns 404 and the board refreshes |
| Running now | `snapshot.event.isRunning` ← `isRunning()` (`lib/connection-status.ts`): `status = live` and `startsAt <= now < endsAt` | On screen | Only a boolean: drives the LIVE pill |
| Start / end time | `events.starts_at`, `events.ends_at` | **DB only** | Needed for countdown, "starts in", closing phase, time axis. Biggest gap |
| Lifecycle | `events.status` (`draft`, `live`, `ended`, `archived`, `lib/roles.ts`) | DB only | `ended` before `endsAt` is possible (admin ends early, `hasEnded()`) |
| Timezone | `events.timezone` (default `America/Mexico_City`) | DB only | For wall-clock labels on a time axis |
| Agenda | `events.schedule` (`ScheduleEntry[]`) | DB only | Could mark talks/breaks on the event arc ("quiet minute because of the keynote") |
| Venue, city | `events.venue_name`, `events.city` | DB only | Finale closer |
| Test event | `events.is_test`; `realPeopleOnly(event)` hides test users at real events (M20) | Applied server-side | Edges to hidden people are dropped too |
| Server time | `snapshot.generatedAt` | In snapshot | Use for clock-skew correction and the stale indicator (age = client now − generatedAt) |

## 2. People (checked-in attendees)

| Parameter | Source field | Status | Notes |
| --- | --- | --- | --- |
| Id | `people[].id` ← `users.id` | In snapshot | Seat key in the loom |
| Name | `people[].name` ← `users.name` | On screen | Can be long; leaderboard truncates |
| Photo | `people[].photoUrl` ← `users.photo_url` (nullable) | In snapshot | Not drawn on the board (Avatar is given only `name`), so everyone shows initials/monito today |
| Event points | `people[].points` ← `event_scores.points` | On screen | Leaderboard and peg size |
| Rank | array order: points desc, connections desc, earliest `checked_in_at` | Derivable | `boardRows()` uses index + 1; no shared rank for ties |
| Connections count | derived from `connections[]` in `boardRows()`; also `event_scores.connections` | Derivable | |
| Check-in time | `event_attendees.checked_in_at` | DB only | Needed for "who just arrived", arrival curve, "early bird" |
| Screen consent | `event_attendees.screen_consent_at` (not null) | Applied | Everyone checked in has consented (M13): no anonymous mode per DESIGN.md; wiki/live-dashboard.md (p. 13) still says opt-out shows "Anonymous" → contradiction, see findings |
| Headline, company, city, interests | `Card` via `GET /api/e/{code}/live/people/{userId}` | On tap only | Filtered by `users.visibility` (`lib/visibility.ts`) |
| Monito avatar | `users.avatar`, `users.avatar_mode`, `users.golden_cap_at` | DB only (card has `avatar`) | Golden cap (3 invitees connected) is a fun visual not on the board |
| Role | `users.role`, `event_organizers.role` | DB only | Could tag speakers/organizers (secret badge `speaker`) |
| Test user | `users.is_test` | Applied server-side | |

## 3. Connections

| Parameter | Source field | Status | Notes |
| --- | --- | --- | --- |
| Accepted connection | `connections[]` {`id`, `a` = `requester_id`, `b` = `addressee_id`, `kind`, `at` = `responded_at ?? created_at`} | On screen | Threads in the loom; ordered by `responded_at` |
| Kind | `connections.kind` (`new`, `reconnection`) ← `requester_knew` / `addressee_knew` | On screen | Mint vs gum. DESIGN.md suggests sky for reconnection; the loom uses gum. Pick one |
| Counters | `counters.connections`, `counters.newCount`, `counters.reconnections` | On screen | |
| Pending requests | `connections.status = pending` | DB only | "12 hellos in flight" would show momentum before acceptance |
| Declined | `connections.status` | Never shown | Silent decline (M8, A6) |
| Points per connection | `connections.points` (+50 new / +20 reconnection) | DB only | Derivable from `kind` |
| Topics marked at scan | `connections.topics` | DB only | +5 bonus to the scanner; the cleanest per-connection topic signal |
| Connection rate | count of `connections[].at` per minute | Derivable | Pulse/tide, rush detection |
| Realtime push | `connection.accepted` {`id`, `a`{id,name,photoUrl}, `b`, `kind`, `at`} | Realtime only | Would cut latency from ≤3 s + 1 s cache to ~instant; enables an exact "fresh thread" moment |

## 4. Summaries (voice notes) and topics

| Parameter | Source field | Status | Notes |
| --- | --- | --- | --- |
| Approved summaries | `interactions.approved_at`, `interactions.author_id`, `connection_id` | DB only | Count is not in `counters` |
| Summary topics | `interactions.topics` (vocabulary `lib/topics.ts`) | DB only / Realtime `summary.approved` {`connectionId`, `topics`} | Weight ×3 in the plan's topic score (p. 7) |
| Summary text, title, next steps | `interactions.summary`, `title`, `next_steps` | **Never shown** | Privacy (p. 13, A6) |
| Attendee interests | `user_interests` → `interests.name` | DB only (per card on tap) | "Shared interests" topic score (+1 per connection) needs both people's interests |
| Topic ranking | derived: shared interests per connection +1, summary topics ×3 | **Not computed anywhere** | The plan's bar race (p. 6) has no data source today |

## 5. Points, badges, invites

| Parameter | Source field | Status | Notes |
| --- | --- | --- | --- |
| Bonus points | `bonus_points` {`reason`: topics, invite_inviter, invite_invitee; `points`; `ref_id`} | Folded into `people[].points` | Reason not exposed: cannot animate "+100 invite" separately |
| Badges earned | `user_badges` {`user_id`, `badge_id`, `earned_at`} (catalog `lib/badges/catalog.ts`: apreton, madrugador, cierre, iman, maraton, tresdetres, puente, duo, …) | DB only | Feed moments ("Valeria earned Maratón") and finale awards need them |
| Invites | `invites` {`inviter_id`, `invitee_id`, `first_connection_at`} | DB only | "Brought 3 friends" award; golden cap |
| Lifetime leaderboard | `GET /api/events/{slug}/leaderboard?scope=lifetime` | Separate endpoint | Not for the event screen |
| Rounds | `points.round` (P2, not built) | — | Round winner at each break (wiki rounds-and-badges) |

## 6. Time windows the board can compute

| Window | Needs | Status |
| --- | --- | --- |
| Elapsed / remaining / phase (pre, live, closing = last 10 min, ended) | `startsAt`, `endsAt`, `status` | Missing in snapshot |
| Last N minutes activity (rate, "rising" topic) | `connections[].at` | Derivable (connections only) |
| Idle time (no event for > 3 min) | latest `at` vs `generatedAt` | Derivable |
| Snapshot age (stale) | `generatedAt`, client clock, failed polls | Partly: the hook sets `stale` only on a failed poll, not on age |
| Arrivals per minute | `checked_in_at` | Missing |

## 7. Volume and limits

- The snapshot returns **every** checked-in person and **every** accepted connection on each 3 s poll. At 2,000 people and 6,000 connections that is roughly 1 MB JSON per poll per screen [Inference: ~110 B per person + ~150 B per connection]. A `since` cursor or Realtime deltas fix it.
- `s-maxage=1` shares the response across screens behind the CDN.
- Seeds: about 150 attendees, 300 connections, 80 summaries, plus a simulator adding a connection every 3–5 s (p. 18, wiki/live-dashboard.md).

## 8. Proposed snapshot additions (minimum to unlock the recommended board)

```ts
event: { code, name, isRunning, startsAt, endsAt, status }          // phase, countdown, time axis
people[]: { id, name, photoUrl, points, checkedInAt }               // arrivals, early bird, ties by check-in
counters: { ..., summaries }                                         // notes counter
topics: [{ name, score, connections, summaries }]                    // top 8, server-computed (p. 7 rule)
moments: [{ at, type: "badge" | "summary" | "milestone", userId?, badgeId?, topics? }]  // last 20, no text
```

The prototypes in `proto/` read the simulator schema (`docs/research/sim/`), which already carries all of the above, so each concept shows what the extra fields buy.

Related: [findings](findings.md), [wiki/live-dashboard](../../../wiki/live-dashboard.md), [wiki/points-rules](../../../wiki/points-rules.md), [DESIGN.md](../../../DESIGN.md).
