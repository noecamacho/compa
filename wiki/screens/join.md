# Screen 1 — Profile `/join` (p. 4–5)

## Content

- Fields: name (required), photo, company, role, interests (chips from a fixed vocabulary, see [topics-vocabulary](../topics-vocabulary.md)), seeking, offering, tribe.
- Social links (all optional): LinkedIn, GitHub, X, Instagram, Facebook, TikTok, website. They accept `@user` or a full URL and are normalized to a URL.
- Option "Dictate my profile": voice → transcription → the form is pre-filled and the user confirms (see [ai-jobs](../ai-jobs.md)).
- On save: a unique handle is generated (`@ana`) and a 3-character code (`7K2`). The session is stored in a cookie.
- Privacy notice: one line explaining what is stored and why, with an acceptance checkbox (p. 13). Leaderboard opt-out checkbox to appear as "Anonymous" (p. 13).

## Acceptance criteria (p. 5)

- Saving works with only the name filled in.
- `@ana`, `ana` and `https://x.com/ana` produce the same normalized URL.
- Duplicate handle → a numeric suffix is added automatically.
- Handle plus code recover the session in another browser.

API: `POST /api/attendees`, `POST /api/session/recover` ([api](../api.md)). Owner: person A, PR #1 ([team-and-prs](../team-and-prs.md)).
