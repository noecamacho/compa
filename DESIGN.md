# COMPA — product and UX design

Design intent derived from the build plan (`raw/pasillo-plan-de-construccion.pdf`); page numbers cite that PDF. Undecided items are listed as open, not invented. Sourced detail: [wiki/screens](wiki/screens/README.md), [wiki/live-dashboard](wiki/live-dashboard.md), [wiki/privacy-consent](wiki/privacy-consent.md).

## Principles

1. **Two taps to a connection.** From opening the app to a completed connection in 2 taps, with no account, no install and no login (p. 1, p. 3).
2. **The audience is the user.** People in the room scan the QR on the screen, connect with each other and watch the podium and topics move with their own actions (p. 1).
3. **Nothing without consent.** Nothing is recorded unless the other person accepts, nothing is shared without the author's approval, and the organizer only sees aggregates (p. 12).
4. **Never empty, never stuck.** Seed data keeps `/live` alive; every AI step has a manual fallback (p. 3, p. 12).
5. **Server decides, UI shows.** Points and permissions are never computed in the UI (p. 11).

## Surfaces

### Phone (mobile first, test at 375 px, p. 17)

- `/join` profile form: name is the only required field; social links accept `@user` or URL; "Dictate my profile" pre-fills the form by voice; one-line privacy notice with acceptance checkbox; leaderboard opt-out checkbox (p. 4–5, p. 13).
- `/me` home: a large QR with handle and code beneath it, an @ search box (P1), own counters (p. 5).
- `/c/[handle]`: with a session connects immediately; without one shows the inviter's card above the short form and connects on save (p. 5).
- `/connection/[id]`: "Connected with Ana · +10 points", the other person's card with "Follow on…" buttons that open in a new tab, two actions: Record (P1) or Summarize later (p. 5).
- `/connection/[id]/summary`: text or dictation input, an editable AI draft (summary, topics, next steps), one-tap approve; empty or non-substantive drafts cannot be approved (p. 6).
- `/connections`: list with photo, name, company, links and summary status; pending summaries first (p. 6).

### Stage screen `/live` (1920×1080, readable from 10 m, p. 6, p. 17)

- Left: animated top-5 podium (photo, name, points) that reorders with animation.
- Right: bar race of the 8 most-discussed topics.
- Top: large counters (connections, summaries, active people) and the join QR.
- Bottom: feed of recent events ("Ana ⇄ Luis talked about AI") with no summary text.

## Responsive breakpoints (captain decision, 2026-10-29)

Every view works at **390** (phone, primary), **834** (tablet) and **1440+** (desktop): fluid layout, readable content centered on wide screens, no horizontal scroll, touch targets of at least 44 px. `/e/<code>/live` is designed for **1920×1080** and also works on a 1280 laptop and in phone portrait (counters plus a compact network). The V2 visual system in `design/compa-v2/README.md` is the visual source of truth; the event entry flow (landing, `/e/<code>`, `/e/<code>/join`, `/e/<code>/live`) is specified in API spec A10.

## Visual and interaction direction

- Strong colors, huge typography, 300–500 ms transitions on `/live` (p. 6); framer-motion for reordering podium and bars (p. 8).
- Kahoot-style energy: the podium and topics are the show (p. 1, p. 6).
- Performance targets: `/me` loads in under 1 s on 4G; both parties see each other's card in under 2 s; `/live` updates in under 2 s (p. 2, p. 5).
- Feedback moments: "+10 points" on connection, "+25" visible on the podium when a summary is approved during the demo (p. 5, p. 19).
- Consent as a first-class interaction: a one-tap accept notice on the other person's screen before any recording (p. 12).

## Decided versus open

Decided: the principles, the seven screens and their acceptance criteria, the `/live` layout, mobile-first sizing, the consent rules, the no-login model.

Open (see [wiki/open-questions.md](wiki/open-questions.md)):

- End-user language: the plan says UI and generated summaries are in Spanish (p. 12, p. 16); this repository's English-only rule covers code and documentation, and the team decided on 2026-10-29 that transcription and generated summaries are Spanish (#6).
- Visual identity: no palette, typography or logo is defined; "strong colors, huge typography" is the only direction (p. 6).
- Recovery screen for handle + code is implied but not designed (#12).
- Where the seed hide toggle and the leaderboard opt-out live in the UI (#7, #17).
- Error and empty states beyond the listed fallbacks.
