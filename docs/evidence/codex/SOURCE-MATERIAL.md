# Source material and scope

The five edits were authored in Codex using Brag 0.5.0's **full** workflow and Hyperframes 0.8.216. They are marketing compositions with mock data, not recordings of new real interactions.

| Material | Source | Treatment |
| --- | --- | --- |
| Attendee home, personal QR, request, saved connections, ranking | `docs/research/ux-audit-parts/attendee/shots/{home,connect,request,connections,ranking}/390-es.jpg` | Existing fictional Founders Fest audit fixtures; cropped bottom debug badge, placed inside animated phone stages |
| Organizer event console | `docs/research/ux-audit-parts/public-admin/shots/admin-event/1440x900-es.jpg` | Existing mock; cropped to event statistics, attendee list and QR, excluding organizer identity |
| Organizer event list | `docs/research/ux-audit-parts/public-admin/shots/admin-events/1440x900-es.jpg` | Existing mock screenshot |
| Live production test event | `https://compa.lol/e/7mkjm9pfb9/live?mock=1` | Read-only screenshot of the existing Codex Conf 2026 test event; 15 people and 5 connections at capture. The page's server fetch does not propagate the query flag, so these are existing test-event records, not a claim of API-mocked SSR |
| Busy ring visualization | `docs/research/dataviz-bigscreen/shots/loom-ring/steady.jpg` | Existing simulator research prototype; explicitly labeled **PROTOTIPO VISUAL · MOCK DATA** in video 04. Its 150 people / 199 connections are simulated figures, not production measurements |
| Public landing | `https://compa.lol` | Read-only screenshot retained as reference |
| Event QR poster | Existing Codex Conf 2026 door `https://compa.lol/e/7mkjm9pfb9` | QR generated locally with the app's qrcode dependency; test event clearly labeled |
| Brand palette | `app/globals.css`, `DESIGN.md` | Cream, ink and mint/sky/gum/sun colors retained |
| Points rules | `lib/points.ts` | Current new-connection rule is +50 to each on acceptance. Historical request mock copy shows +20; these edits avoid making a numeric points claim |

No real JSConf event is featured. No production data was created or modified. No sign-in completed. A read-only visit to protected `/home` unexpectedly followed its automatic LinkedIn redirect; it was abandoned immediately, and authenticated footage uses existing mock artifacts instead.

## Codex session evidence

`codex-launch-process.txt` and `codex-session-capture.txt` were captured by firstmate from the live worker process/session, then copied here with local home/worktree paths removed. The process shows `--model gpt-6.1-sol`, high reasoning and `--dangerously-bypass-approvals-and-sandbox`. These are text captures, not a fabricated screenshot. Header image capture failed; firstmate explicitly authorized this substitute.

## Review limits

The dispatch prohibited local dev servers and application test suites because the PC was loaded. Hyperframes browser checks and decoded video frames verify these media artifacts; they do not establish complete end-to-end application correctness. No new feature implementation is included in this change.
