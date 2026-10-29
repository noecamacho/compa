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

Related: [points-rules](points-rules.md), [privacy-consent](privacy-consent.md), [ai-jobs](ai-jobs.md).
