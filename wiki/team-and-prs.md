# Team split, PR order and work rules

Four people, four branches, each with their own coding-agent thread in a worktree; PR #0 unblocks everyone and is merged first (p. 13).

## Team (p. 13)

| Person | Area | Branch | Screens / routes |
| --- | --- | --- | --- |
| A (lead) | Base, profile, session, QR | `feat/profile-qr` | `/join`, `/me`, `/c/[handle]`, `/api/attendees`, `/api/session/recover` |
| B | Connections and points | `feat/connections` | `/connection/[id]`, `/connections`, `/api/connections`, @tag |
| C | AI and summaries | `feat/summaries` | `/connection/[id]/summary`, `/api/transcribe`, `/api/interactions/*`, recording |
| D | Dashboard and data | `feat/live` | `/live`, `/api/live`, seeds, deploy |

## PRs in merge order (p. 13–14)

| PR | Owner | Content | Depends on |
| --- | --- | --- | --- |
| #0 Scaffold | A | Next.js + TS + Tailwind, Supabase client, SQL migration, topics vocabulary, `AGENTS.md`, Vercel deploy | — |
| #1 Profile and QR | A | Form, link normalization, handle/code, cookie, QR, `/c/[handle]` | #0 |
| #2 Connections | B | Idempotent connection, card with "Follow on…", list, points and cap | #0 (uses mocks until #1) |
| #3 Summaries | C | Dictation/text → draft → approve → share, summary points | #0, #2 |
| #4 Live | D | Podium, topic race, counters, Realtime, seeds of about 150 attendees | #0 |
| #5 @tag | B | Autocomplete and connection by handle | #2 |
| #6 Recording | C | Other person's consent + recording + transcription | #3 |
| #7 Extras | D | Rounds, badges, tribes, analyst with Codex | #4 |

## Work rules (p. 14)

- Only A touches the SQL migration and `lib/types.ts`; the others request changes by chat.
- Small PRs; each PR includes a 10-second video or GIF of the flow and ticks the acceptance criteria.
- Cross review in under 10 minutes: B reviews A, C reviews B, D reviews C, A reviews D. Run the agent's review command before asking for review.
- `main` is always deployable; if something breaks the demo, revert first and fix later.

## PR template in the plan (p. 15)

Sections: What it does (one line), How to test (steps), Acceptance criteria (checkboxes), Video / GIF (link), How we used the coding agent (thread, worktree, skill or review used). This repository's template at [.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md) keeps these ideas and adds the wiki and standards gates; see [log](log.md).

Related: [timeline](timeline.md), [agent-contract](agent-contract.md), [docs/git-workflow.md](../docs/git-workflow.md).
