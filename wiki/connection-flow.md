# Connection flow

Connecting takes two taps; recording is optional, and if nobody records, the summary is written or dictated at the end. Both paths pass through your approval before reaching both people (p. 3).

## Diagram, transcribed (p. 4, "8 steps, 1 decision")

Caption in the source: "Connecting takes two taps and the summary reaches both".

1. Profile once
2. Scan QR or @tag (note under the step: "no profile: short form")
3. Mutual connection, +10
4. Decision: "Record now?"
   - No → Write or dictate at the end
   - Yes → The other person accepts and it records
5. The AI drafts and you approve
6. Both receive the summary, +25
7. It goes up on `/live` (highlighted end state)

If the person scanning has no profile, they fill in the short form and are connected on save (p. 4).

## Screen mapping

| Step | Screen |
| --- | --- |
| Profile once | [/join](screens/join.md) |
| Scan QR or @tag | [/me](screens/me.md) (shows the QR), [/c/[handle]](screens/scan.md) |
| Mutual connection | [/connection/[id]](screens/connection.md) |
| Record / write / dictate, AI drafts, approve | [/connection/[id]/summary](screens/summary.md) |
| Up on /live | [live-dashboard](live-dashboard.md) |

## As built: scanning someone outside an event (2026-10-29)

Owner decision, 2026-10-29: "adding a QR code of another person even though they are not within an event … there is no score but rather it is just a separate connection that is not attached to an event".

- **Whose context wins:** the scanned person's. If they are checked in to a running event, the scanner joins it (consent notice) and the connection belongs to that event, as before. If they are at none, the request is made outside any event (`event: null`), whether or not the scanner is at one. This replaces the old `409 not_at_event`.
- **Same flow:** pending → accept or silent decline, the `request.received` / `request.accepted` notifications and push, the done screen, the voice note. Accepting reveals the profile as at an event (visibility counts any accepted connection).
- **Labelled:** the register screen shows "Conexión fuera de evento: sin puntos" / "Connection outside an event: no points" and a "Confirmar sin puntos" button before sending; the request, done screen, home incoming card and the connections list carry the same label. Notifications read "… fuera de evento" / "… outside an event".
- **Fixed at creation:** checking in to an event after the request was sent does not move it into that event; accepting it still pays nothing. An event-less pending request never expires (no event window).
- **Test users** may connect outside an event only with other test users (`canConnectOutsideEvent`, `lib/roles.ts`), since no event's `is_test` flag applies.
- A repeat or reverse scan returns the existing request with `200`. The per-event request cap (`CAPS.requestsPerEvent`, 300) applies to event-less requests as one lifetime bucket that never resets (shortcut: fine at today's scale; give it a time window if anyone nears it), on top of the per-minute scan limit.
- The register form sends `screenConsent` only after showing the event-screen notice; if the scanned person checks in between page load and Confirm, the API answers `consent_required` instead of silently checking the scanner in.
- Profile stats (`statsFor`: new connections, reconnections) count event-less connections too: they are real connections. Rankings, scores and badges do not.

Code: `createConnection` and `acceptInTransaction` in `lib/server/connections.ts`; e2e `e2e/connect/outside-event.spec.ts`.

Related: [points-rules](points-rules.md), [privacy-consent](privacy-consent.md), [ai-jobs](ai-jobs.md).
