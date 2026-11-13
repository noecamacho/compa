# Demo routes contract (D2 → D3, D4)

Ticket: COMPA-<TBD>, D2. Demo mode answers every API route from the clock-driven room of [demo-scenario.md](demo-scenario.md) plus one cookie per visitor. No session, database, Supabase or OpenAI is read. It is the "path A" demo of the approved brief: open the app without an account, act, and see the phone, the big screen and the organizer console move together.

## Turning it on

| Setting | Effect |
| --- | --- |
| `API_MODE=demo` | Every route goes through `demoHandler` (`lib/api/define-route.ts`, one branch) as a public route. `hasSession()` is true for everyone (`lib/server/session.ts`), so every screen opens without signing in. |
| `isDemoMode()` from `lib/demo/respond.ts` | The same check for pages and server components, e.g. to show a "sample data" notice or skip the camera. It reads `process.env.API_MODE`, so a client component gets it as a prop from its page. |

A route without a demo answer serves its documented example, as in mock mode (`listInterests`, push subscriptions, `authEmail`). Sign-in routes redirect to `next` (default `/home`), never to LinkedIn.

## The room and the visitor

| Fact | Value |
| --- | --- |
| Event | `DEMO_EVENT_CODE` = `compademo2026`, `DEMO_EVENT_SLUG` = `compa-demo`, always running. Other codes and slugs answer 404. |
| Big screen | `/e/compademo2026/live`. Snapshot polls stay fresh: `generatedAt` is the request time. |
| Organizer console | `/admin`, `/admin/events/compa-demo`. The visitor is the super admin and the only organizer. Every write answers `403 forbidden` ("The demo is read-only."). |
| Visitor | `DEMO_VISITOR_ID`, handle `ari-solano`, name "Ari Solano" until they change it, checked in to the demo event. |
| Visitor state | Cookie `DEMO_VISITOR_COOKIE` = `compa-demo`: base64url JSON validated by `VisitorState` (zod) on every read. HttpOnly, SameSite=Lax, Secure on https, 7 days. A missing or invalid cookie is a fresh visitor. The server stores nothing. |
| Answers | `Cache-Control: private, no-store`: each depends on the visitor's cookie. |
| Monitos | Leaderboard rows and the first 8 people of the snapshot (`LIVE_LOOK_ROWS`) carry `avatar` and `avatarMode`, as in real mode. F1 made them fields of the live schemas, so no parse strips them. |

## What the visitor's actions do

| Action | Route | Result |
| --- | --- | --- |
| Scan or search a person | `POST /api/connections` with a cast `toHandle` | Pending; the person accepts `DEMO_ACCEPT_MS` (4 s) later. Then +50 new / +20 reconnection, +5 with topics, to both ends; the link appears on the big screen of that browser. A repeat answers 200 with the same connection. |
| Answer a request | `POST /api/connections/{id}/accept` or `/decline` | Cast people `DEMO_REQUESTERS` (indexes 12 and 41) ask the visitor to connect; each stays pending until answered once. |
| Voice note | `POST /api/transcribe` | A prepared transcript in the request's language; the audio is ignored. |
| Summary | `POST /api/interactions/draft`, then `/api/interactions/{id}/approve` | The draft keeps the visitor's text, takes topics from the person's interests and a prepared next step; approving adds +15 once. |
| Profile | `PATCH /api/me` | Name, headline, company, city and monito are kept in the cookie. |
| Start over | `POST /api/auth/signout` | Clears the cookie: the next request is a fresh visitor. |

Connection ids are `demoConnectionId(castIndex)` and note ids `demoInteractionId(castIndex)`: the visitor meets each person once. The cookie keeps the newest 24 connections; past 3.8 KB it drops the oldest notes, then the oldest connections.

## For D3 (`/demo` page)

- Phone and big screen side by side: `/home` and `/e/${DEMO_EVENT_CODE}/live` in two frames of the same origin share the cookie, so the board shows the visitor's link.
- "Start over": `POST /api/auth/signout` (or delete `DEMO_VISITOR_COOKIE` in a server action), then reload both frames.
- Guide steps can link to `/connect/<handle>` of a cast person, `/requests/${demoConnectionId(DEMO_REQUESTERS[0])}`, `/ranking`, `/admin/events/${DEMO_EVENT_SLUG}`.

## For D4 (simulated scan and voice note)

- Scan target: in a server component, `nextScanTarget(readVisitor(cookieHeader), demoCast())` returns the first cast person the visitor has not met (or null), whose `handle` opens `/connect/<handle>`. Pass it to `ScanPanel` as a prop when `isDemoMode()`.
- Voice note: skip the microphone and post any small file to `/api/transcribe`, or fill the transcript text directly; draft and approve work as above.
- Built: `demoScanTarget()` (`lib/demo/capture.ts`) gives `/connect` the handle; `ScanPanel` sweeps 1.8 s, then shows that person's row (or "you met everyone" when null). `silentDeps` (`lib/audio/recorder.ts`) records without a microphone for `VoiceNoteButton` and `NoteEditor`, whose pages pass `demo={isDemoMode()}`. Tests: `e2e/demo/capture.spec.ts`, `lib/audio/recorder.test.ts`.

## Known limits

- `markNotificationsSeen` during the notifications page's server render cannot set a cookie, so the bell clears only when the browser posts the route itself.
- Badges earned share the time of the visitor's latest accepted connection.
- Visibility changes (`PATCH /api/me/visibility`) answer the merged settings but are not kept.

Tests: `lib/demo/visitor.test.ts`, `lib/demo/respond.test.ts` (every route answers in demo mode in its documented shape, plus the scan, request, note, cookie and console flows) and `e2e/demo/flow.spec.ts` (`@demo`, run with a server started with `API_MODE=demo`; other modes skip it).

Related: [demo scenario](demo-scenario.md), [live dashboard](../../wiki/live-dashboard.md), [points rules](../../wiki/points-rules.md).
