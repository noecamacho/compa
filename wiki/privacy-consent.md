# Privacy and consent

The rule is simple: nothing is recorded unless the other person accepts, nothing is shared without approval, and the organizer only sees aggregates (p. 12).

## Rules (p. 12–13)

- **Recording:** when you tap "Record", the other person gets a notice on their screen and must accept with one tap. Without acceptance nothing is recorded. The audio is deleted after transcription.
- **Summary:** the author reviews and approves it before it reaches both. Only the author can edit it.
- **Profile:** only what the user filled in is shared. No social network is required.
- **`/live`:** shows leaderboard names and points, and aggregated topics. It never shows the text of a summary.
- **Leaderboard opt-out:** a checkbox in the profile to appear as "Anonymous".
- **Seed data:** marked with `is_seed` and can be switched off with a toggle before the public demo.
- **Notice on `/join`:** one line explaining what is stored and why, with an acceptance checkbox.

## Related data fields

`interactions.recorded`, `interactions.consent_ok`, `attendees.is_seed` ([data-model](data-model.md), p. 9). No field backs the opt-out or the consent checkbox; see [open-questions](open-questions.md).

Related: [ai-jobs](ai-jobs.md) (the prompt omits sensitive data), [live-dashboard](live-dashboard.md).
