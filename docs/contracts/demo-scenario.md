# Demo scenario contract (D1 → D2)

Ticket: COMPA-<TBD>, D1. This contract implements the clock-based seeded room requested in the demo brief, independently of the production API. It follows the live-board fixture conventions in [live-scenarios.ts](../../lib/testing/live-scenarios.ts): stable UUIDs, accepted pairs in timestamp order, current point constants and scores derived from the graph. Neither fixture is changed or imported at runtime.

## Entry points and types

```ts
import { demoCast, type DemoPerson } from "@/lib/demo/cast";
import {
  demoScenario, DEMO_CYCLE_MS, DEMO_CONNECTION_MS,
  DEMO_EVENT_CODE, DEMO_EVENT_SLUG,
  type DemoEvent, type DemoLivePerson, type DemoLiveSnapshot, type DemoScenario,
} from "@/lib/demo/scenario";

const room: DemoScenario = demoScenario(Date.now());
```

| Export | Contract |
| --- | --- |
| `demoCast(): DemoPerson[]` | 150 synthetic people in stable check-in order. Each has a unique UUID, full name, handle and monito; complete headline, company, city, three known interests and empty links. No real account URLs or photos. Every call returns fresh nested data. `DemoPerson` also exports the zod schema extending API `Card`. |
| `demoScenario(nowMs: number): DemoScenario` | Pure function of nonnegative integer Unix milliseconds. Invalid or unrepresentable clocks throw `RangeError`. No environment reads, timers, randomness, cookies, database or network. |
| `DemoScenario` | `{ cycle: number; elapsedMs: number; event: DemoEvent; cast: DemoPerson[]; live: DemoLiveSnapshot }`. No visitor state. Every response owns its data. |
| `DemoEvent` | API `Event` plus `{ id: string; code: string; timezone: string }`. Stable id, slug `compa-demo`, code `compademo2026`, name `COMPA Community Night`, zone `America/Mexico_City`. |
| `DemoLiveSnapshot` | Compatible with API `LiveSnapshotT`. Its people additionally carry required `avatar` and `avatarMode` from `DemoPerson`. No private profile fields are copied onto the public board. |
| `DemoLivePerson` | Existing live-person fields plus the required monito fields. Scores use `CONNECTION_POINTS`; ties preserve cast/check-in order. |

## Clock and replay

- One globally synchronized cycle lasts 120,000 ms. `cycle = floor(nowMs / DEMO_CYCLE_MS)` and `elapsedMs = nowMs % DEMO_CYCLE_MS`. New visitors do not restart the room.
- A cycle starts with 240 accepted connections spread over the preceding 12 minutes. One additional connection appears at each 3,000 ms boundary, up to 279 connections. Every fourth pair is a reconnection. Each unordered pair occurs only once per cycle; no self-links or missing people.
- At the next cycle, counts and scores intentionally return to the starting graph. People keep their IDs, handles and looks. Connection IDs include the cycle, so the board recognizes activity again after replay. Do not persist background connection IDs as visitor history across cycles.
- The event window moves with the cycle, from 30 minutes before its start to 90 minutes after. The event remains running. All connection timestamps are within the window and no later than `nowMs`.
- `live.generatedAt` is the exact requested time, including between connections. Polls remain fresh when scores are unchanged. Connections are oldest first; people are ordered by points, then connection count, then check-in order. Counters cover the whole graph, which stays below the live snapshot's 1,000-link cap.
- Background points include only accepted connections: +50 new / +20 reconnection to both ends, using the shared constants. Topics, notes and referrals are visitor actions owned by D2.

## D2 responsibilities

Read the clock once per request and pass it to `demoScenario`. Use `room.event`, `room.cast` and `room.live` to build consistent responses for event, people, connections, ranking and organizer routes. `a`/`b` in each accepted link are cast IDs; `at` is its acceptance time. Search by the actual handle or name rather than returning a fixed profile.

D2 owns demo-mode selection, authentication bypass for the isolated demo, validation of cookie/request state, visitor identity and writes, response schemas, and projecting visitor actions onto the shared room. D1 installs no route, changes no session behavior and enables no demo mode. The live API schema currently omits monito fields; coordinate with F1 before routing `room.live` through schema parsing that strips unknown fields.

Tests cover all 40 activity frames, the instant before and at a connection, cycle rollover, schema compatibility, graph and score consistency, mutation isolation, and the existing board's feed, ranking and connection-event detector. Browser flows remain unchanged until D2 connects these modules to routes.

Related: [live dashboard](../../wiki/live-dashboard.md), [points rules](../../wiki/points-rules.md).
