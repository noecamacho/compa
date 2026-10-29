# Delivery checklist (p. 20–21)

The project is ready when the full flow works in production from two different phones.

- Full flow tested on iPhone (Safari) and Android (Chrome): profile → QR → connection → summary → points → `/live`
- Deployed on Vercel with a short domain and the QR printed or on screen
- Seeds loaded and simulator working; toggle to hide them
- README: problem, demo GIF, stack, how to run it and a "How we used the coding agent" section (threads, worktrees, `AGENTS.md`, review command, prompts)
- 60–90 s backup video recorded
- Public repository with a license
- 3-minute pitch rehearsed twice with a stopwatch
- Hackathon submission form sent

## Added by the event deck ([hackathon-requirements](hackathon-requirements.md), s. 9, s. 14)

- Project name and team member names in the submission
- Problem and proposed solution statement
- Live demo page link (the Vercel deploy)
- Evidence of Codex use: screenshot without sensitive data or short video segment, with where, how and how it was reviewed
- README states what was built during the Build Day and what is missing
- Licenses, privacy and absence of secrets checked; reuse declared
- Submitted before Thursday 2026-10-29 at 10:00; improvements allowed until Friday 2026-10-30 at 13:00
- Event day: `main` frozen from one hour before doors, rollback target and `/api/health` checked ([event-day-runbook](event-day-runbook.md))

## Added for conference scale ([conference-scale](conference-scale.md))

- The open conference-scale fixes are shipped or consciously accepted (polling backoff, pool settings, `/home` fan-out, rollback); Supabase compute upsized for the day; Auth rate limits raised; production JWT signing key is asymmetric (ES256), which local session checks depend on
- `main` frozen during the event; the access code is not rotated while screens are up

## Event-day checks ([conference-load](../docs/research/conference-load.md))

- Scan a personal QR from inside the app on an iPhone (Safari) and in Firefox, not only Chrome on Android
- If the access code was rotated anyway, reopen the live link from the admin event page
- Unplug the projector's network for 30 s: the pill shows the age of the data and the board recovers on its own
- Production `DATABASE_URL` uses the transaction pooler (port 6543; the app warns on 5432); watch Database → connections and function durations at doors-open

The "public repository with a license" item conflicts with the current private repository; see [open-questions](open-questions.md). Related: [timeline](timeline.md), [demo-script](demo-script.md).
