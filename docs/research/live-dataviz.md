# Live data visualization research

Date: 2026-10-29 · Ticket: `COMPA-<TBD>` · Baseline: `main` @ `f6f65f3` · Research and prototypes only; no product code changed.

Question: how to get the most from the real-time data on the big screen (`/e/<code>/live`) and on phones, including zero activity, rushes, the end of the event and the edge cases.

## Parts

| Part | What | Tickets |
| --- | --- | --- |
| [sim/](sim/README.md) | Seeded event simulator, 11 scenarios (zero, one attendee, trickle, steady, rush, 3,000 people, end of event, after event, ties, long names, clock skew) and replay helpers | — |
| [dataviz-bigscreen/findings.md](dataviz-bigscreen/findings.md) | 12 big-screen concepts, 155 shots at 1920×1080, ranked | DV-1 – DV-10 |
| [dataviz-phone/findings.md](dataviz-phone/findings.md) | 8 phone concepts, 376 shots at 360/390/430/834 | DP-1 – DP-9 |

Run any prototype: `cd docs/research && python3 -m http.server 4100`, then open `dataviz-bigscreen/proto/<concept>.html?scenario=steady&speed=10`.

## Headlines

1. **Ship a "director" shell for `/live`.** One board that switches mode with phase and activity (idle, main, rush, closing, finale), with hysteresis. It never shows an empty screen: zero activity becomes a 600 px QR.
2. **The snapshot is too thin.** `LiveSnapshot` has no start/end time, check-in time, topics or note count, so countdown, closing phase and topic race cannot be built (DV-1). Its full payload is about 1 MB at 3,000 people (DV-9, DP-1).
3. **Phones should lead with "my spot", not the podium.** Shared ranks and point bands at scale; a light per-viewer endpoint (DP-1).
4. **The end of the event is the best moment and today it just stops.** Finale on the big screen (DV-7) and a shareable 9:16 recap on phones (DP-5).
5. **Staleness is not detected** unless a poll fails (DV-6). Anonymous opt-out is in the plan but absent from every payload, and the wiki and DESIGN.md disagree (DV-10, DP-8).

## Not verified

No projector or real-phone test; performance measured in headless Chromium on a Mac; thresholds tuned on simulated data; QR codes in prototypes are placeholders.

Related: [wiki/live-dashboard.md](../../wiki/live-dashboard.md), [UX audit](ux-audit.md), [backlog](../flows/backlog.md).
