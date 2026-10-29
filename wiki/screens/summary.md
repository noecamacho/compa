# Screen 5 — Summary `/connection/[id]/summary` (p. 6)

## Content

- Input by text or dictation (or the recording, if one was made).
- The AI returns a summary, topics and next steps; the user edits and approves with one tap.
- On approval, the summary appears in both people's connection.

## Acceptance criteria (p. 6)

- An empty summary, or one without real content, cannot be approved (the AI marks it `substantive=false`, see [ai-jobs](../ai-jobs.md)).
- Both see the approved summary; only the author can edit it.

Fallbacks: if transcription fails, show the text field; if the AI summary fails, store the user's text verbatim as the summary (p. 12). API: `POST /api/transcribe`, `POST /api/interactions/draft`, `POST /api/interactions/:id/approve` ([api](../api.md)). Owner: person C, PR #3 ([team-and-prs](../team-and-prs.md)).
