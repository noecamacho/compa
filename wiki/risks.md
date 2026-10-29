# Risks and plan B (p. 19–20)

The biggest risk is the live demo (network, time and adoption); each risk has a plan B prepared.

| Risk | Signal | Plan B |
| --- | --- | --- |
| Venue Wi-Fi drops | `/live` does not update | Own hotspot + seed simulator; backup video |
| Few people connect during the demo | Counter < 10 at 60 s | Simulator raises the pace; the team connects with each other live |
| iPhone loses the session (Safari vs. another app) | User "disappears" | Recovery screen with handle + code; do not ask to install the app |
| Slow or noisy transcription | > 5 s or empty text | Text field always visible as an alternative |
| AI summary fails | Error on `/draft` | Store the user's text verbatim |
| Spam to climb the podium | Many connections from one person | Hourly cap and points only for mutual connections |
| A bad deploy during the event | 5xx in Vercel logs; `/api/health` 503 | Instant Rollback to a kept production deployment ([event-day-runbook](event-day-runbook.md)); freeze `main` during the event |
| Time runs out | P0 incomplete mid-evening | Cut in the order of the scope section; feature freeze 45 min before closing |
| Closing time uncertain (page says 7 and 9 p.m.) | — | Confirm with the organizers now and adjust the timeline |

Conference-scale infrastructure risks, measured and with fix status: [conference-scale](conference-scale.md).

## Conference-scale client risks (findings 10, 16, 17, 19, 20 of [conference-load](../docs/research/conference-load.md))

| Risk | Signal | Handling in the app |
| --- | --- | --- |
| In-app scan dead on iPhone Safari and Firefox (no `BarcodeDetector`) | Camera opens, nothing is ever read | `ScanPanel` falls back to jsQR (loaded only there); the banner names the cause (permission denied, no camera, camera busy, unsupported) and points to the phone's camera app, which opens `/u/<handle>` |
| Venue Wi-Fi stalls a request | Button stuck on "Aceptando…" | Every client request times out (15 s; drafts 35 s, audio upload 40 s); a GET retries once after a network failure, writes never retry; messages are Spanish copy (`apiErrors`), never the raw browser or server text |
| Audio note upload fails | Recording lost | The recording is kept; "Reintentar envío" re-sends the same file; leaving the screen releases the microphone |
| Decline fails offline | Person sent home, request still pending | The screen stays with the reason; only `not_pending` counts as done |
| Shared invite link claimed by several people | Second claim overwrote the first; concurrent first loads of `/api/invites/me` returned 500 | Claim only links an unclaimed invite; invite creation tolerates the race (`onConflictDoNothing`, re-read, suffixed code) |
| Access code rotated while the projector runs | Projector fell to "not found" | The board keeps the last snapshot with "the event code changed, open the new screen link from Admin"; do not rotate during the event |
| Projector loses the API or a request hangs | Nothing changed on screen | 8 s fetch timeout, one poll in flight, pill with the age of the data, recovers on the next good poll; `app/e/[code]/live/error.tsx` retries a failed render every 10 s |


Related: [mvp-scope](mvp-scope.md) (cut order), [timeline](timeline.md), [open-questions](open-questions.md).
