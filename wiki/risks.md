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

Related: [mvp-scope](mvp-scope.md) (cut order), [timeline](timeline.md), [open-questions](open-questions.md).
