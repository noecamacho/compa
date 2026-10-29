# Jira ticket draft — COMPA bootstrap Epic

Ready to paste. Jira creation is pending because this environment has no Jira access; the project key is unknown, so every reference uses the placeholder `COMPA-<TBD>`. Replace it when the project exists. Source citations (`p. N`) refer to `raw/pasillo-plan-de-construccion.pdf`; detailed pages are in `wiki/`.

---

**Project:** COMPA-<TBD>
**Issue type:** Epic
**Title:** COMPA MVP: profile, QR connection, AI summary and live dashboard
**Labels:** mvp, hackathon, p0
**Priority:** Highest

## Description

COMPA is a networking companion for conferences. An attendee fills in a profile once, connects with someone by scanning their QR code or typing their @tag, and both receive an approved summary of what they talked about. A projected `/live` dashboard shows a Kahoot-style podium, the most-discussed topics and counters in real time (p. 1). Design rule: from opening the app to a completed connection in 2 taps, with no account, no install and no login (p. 1).

The goal of this Epic is the complete, demonstrable end-to-end flow: profile → connection → summary → points → live dashboard (p. 1), delivered as one Next.js app on Vercel with Supabase (Postgres + Realtime) and server-side OpenAI calls (p. 7–8).

Reference: `wiki/index.md` (full plan), `ARCHITECTURE.md`, `DESIGN.md`, `wiki/open-questions.md` (18 items to resolve during the build).

## Scope

In (P0, never cut): profile form with optional links; handle + recovery code; personal QR scanned with the native camera; the other person's card with "Follow on…"; written or dictated summary, approved and sent to both; `/live` with leaderboard, live topics and counters; about 150 seed attendees (p. 2–3).
In (P1): connection by @tag with autocomplete; recording with the other person's consent (p. 3).
In (P2): rounds, badges, tribe versus tribe; "ask your event" (p. 3).
Out: OAuth login, native app or PWA install, post-event recap, emails, exports, matchmaking (p. 3).
Cut order if time runs out: P2, then recording, then @tag (p. 3).

## Acceptance criteria (Epic)

- [ ] A new attendee creates a profile and connects in under 60 seconds (p. 2).
- [ ] `/live` updates in under 2 seconds after each connection or approved summary (p. 2).
- [ ] The full flow works in production from an iPhone (Safari) and an Android phone (Chrome): profile → QR → connection → summary → points → `/live` (p. 20).
- [ ] Deployed on Vercel with a short domain; seeds loaded, simulator working, hide toggle in place (p. 20).
- [ ] No login or OAuth exists; the session is recoverable with handle + code (p. 5, p. 17).
- [ ] Business rules (points, idempotency, hourly cap, author check) run only on the server; every write is zod-validated (p. 11, p. 17).
- [ ] `/live` never shows summary text; recording requires the other person's consent; summaries require the author's approval (p. 12–13).
- [ ] `bun run lint && bun run typecheck && bun run build` pass on `main` (p. 17); every PR used the repository template.

## Task breakdown by build phase

Phases follow the plan's timeline (p. 16); each task is a child issue (Task) of this Epic.

### Phase 0 — Kickoff: scaffold (gate 1: PR #0 on `main`)

**COMPA-<TBD> Task: Scaffold the application and contracts** (plan PR #0, owner A, p. 13)
- [ ] Next.js (App Router) + strict TypeScript + Tailwind + Bun; Supabase client; Vercel deploy from `main` (p. 8, p. 17).
- [ ] Migration `supabase/migrations/0001_init.sql` with `attendees`, `connections`, `interactions`, `points`, the ordered-pair unique index and the `points` uniqueness constraint (p. 9–10).
- [ ] `lib/types.ts`, `lib/topics.ts` (about 40 topics plus "Other", resolves open question #4) and `lib/points.ts` server-only skeleton (p. 17).
- [ ] Environment variables documented, including `OPENAI_STT_MODEL` and `OPENAI_TEXT_MODEL` (p. 12).
- Acceptance: deploy URL responds; migration applies cleanly; `bun run lint && bun run typecheck && bun run build` pass; the four team branches can start (p. 16).

### Phase 1 — P0 in parallel (gate 2: P0 flow end to end in production)

**COMPA-<TBD> Task: Profile, session and QR** (plan PR #1, owner A, p. 4–5, p. 13)
- [ ] `/join` form: only name required; links accept `@user` or URL and normalize to URL; interests chips; tribe; "Dictate my profile"; privacy notice with acceptance checkbox; leaderboard opt-out.
- [ ] `POST /api/attendees` generates a unique handle and 3-character code and sets the cookie; `POST /api/session/recover`.
- [ ] `/me` with the QR for `https://<domain>/c/<handle>`, handle and code, own counters.
- [ ] `/c/[handle]`: with session creates the connection; without session shows the inviter's card and the short form, connecting on save.
- Acceptance (p. 5): save with only the name; `@ana`, `ana`, `https://x.com/ana` normalize identically (unit tests); duplicate handle gets a numeric suffix; handle + code recover the session in another browser; native camera opens the correct URL; `/me` loads in under 1 s on 4G; scanning the same QR twice does not duplicate; scanning your own QR shows a message.

**COMPA-<TBD> Task: Connections, cards and points** (plan PR #2, owner B, p. 5–7, p. 13)
- [ ] `POST /api/connections { targetHandle, method }` idempotent by the pair index; computes `shared_topics`; awards +10 connection, +15 bridge, +5 first of the day through `lib/points.ts`; cap of 12 scoring connections per person per hour; idempotent by `ref_id`.
- [ ] `/connection/[id]` with "Connected with … · +10 points", the card and "Follow on…" buttons; actions Record (P1) and Summarize later.
- [ ] `/connections` list, pending summaries first; `GET /api/connections`.
- Acceptance (p. 5–7): both see the card in under 2 s; each social button opens the right URL in a new tab; tests for idempotency and the cap; the same pair never scores twice.

**COMPA-<TBD> Task: AI summaries** (plan PR #3, owner C, p. 6, p. 11–12, p. 14)
- [ ] `POST /api/transcribe` (MediaRecorder audio, webm/m4a, max 2 min → text).
- [ ] `POST /api/interactions/draft` with Structured Outputs using the plan's schema (`summary`, `topics` from the vocabulary, `next_steps`, `substantive`) and the plan's system prompt.
- [ ] `POST /api/interactions/:id/approve`: author must belong to the connection; blocks `substantive=false`; +25 to each party; shares with both.
- [ ] `/connection/[id]/summary`: dictate or write, editable draft, one-tap approve; fallbacks (no transcription → text field; no AI → store the text verbatim).
- Acceptance (p. 6, p. 12): empty or non-substantive summaries cannot be approved; both see the approved summary; only the author can edit; model names come from environment variables.

**COMPA-<TBD> Task: Live dashboard and seed data** (plan PR #4, owner D, p. 6–7, p. 14, p. 18)
- [ ] `/live` for 1920×1080: animated top-5 podium (framer-motion), bar race of 8 topics (shared topics ×1, approved-summary topics ×3), counters, join QR, event feed without summary text; strong colors, huge type, 300–500 ms transitions.
- [ ] `GET /api/live` snapshot plus Supabase Realtime on `connections`, `interactions`, `points`.
- [ ] `bun run seed`: about 150 `is_seed` attendees with realistic JS-conference profiles, about 300 connections, about 80 summaries; optional simulator adding a connection every 3–5 s; toggle to hide seeds.
- Acceptance (p. 2, p. 6, p. 13): update in under 2 s; readable from 10 m; never shows summary text; anonymous opt-out respected; seeds can be hidden before the public demo.

### Phase 2 — Integration

**COMPA-<TBD> Task: Integrate P0 and test on two phones** (p. 16)
- [ ] Merge PRs #1 to #4 in order; resolve conflicts on the contract files only through the lead.
- Acceptance (p. 16, p. 20): the full P0 flow works in production from an iPhone (Safari) and an Android phone (Chrome).

### Phase 3 — P1 and polish (gate 3: feature freeze 45 minutes before closing)

**COMPA-<TBD> Task: Connection by @tag** (plan PR #5, owner B, p. 10, p. 14, p. 18)
- [ ] `GET /api/attendees/search?q=` and an autocomplete input on `/me`; connection by handle through `POST /api/connections` with `method='tag'`.
- Acceptance: selecting a handle creates the same idempotent connection as a QR scan.

**COMPA-<TBD> Task: Recording with consent** (plan PR #6, owner C, p. 12, p. 14)
- [ ] Tapping "Record" sends a notice to the other person's screen; recording starts only after their one-tap acceptance; `consent_ok` and `recorded` set; audio deleted after transcription.
- Acceptance: no acceptance → no recording; transcription feeds the draft; audio is not retained.

**COMPA-<TBD> Task: `/live` animation polish** (p. 6, p. 16)
- Acceptance: podium and bars reorder with 300–500 ms transitions without layout jumps.

### Phase 4 — Demo ready

**COMPA-<TBD> Task: Demo readiness** (p. 19–21)
- [ ] 60–90 s backup video; README with problem, demo GIF, stack, how to run and the agent workflow section; 3-minute pitch rehearsed twice; submission form sent; seeds and simulator on, `/live` full screen, backup video open before going on stage.
- [ ] Submission form filled with project name, team members, problem and solution, repository link, demo video, live demo page and evidence of Codex use; submitted before Thursday 2026-10-29 at 10:00 (`wiki/hackathon-requirements.md`).
- Acceptance: every item in `wiki/delivery-checklist.md` ticked, including the items added by the event deck.

### Later (P2, cut first)

**COMPA-<TBD> Task: Rounds, badges, tribes and "ask your event"** (plan PR #7, owner D, p. 7, p. 14)
- Rounds of 15–20 min that reset the scoreboard; badges Bridge, Talker, Streak; tribe versus tribe; organizer analyst. Acceptance to be written when scheduled.

## Decisions required before or during Phase 1

Resolve from `wiki/open-questions.md`: closing time (#1), domain (#2), model names (#3), topics vocabulary (#4), tribe enforcement (#5), end-user language (#6), opt-out and consent storage (#7), who receives +10 (#8), capped connections (#9), summaries per connection (#10), audio holding (#11), recovery screen (#12), photo upload (#16), seed toggle (#17).
