# Open questions

Contradictions, gaps and ambiguities found while ingesting the build plan. Nothing here is decided; resolving an item means recording the decision in the relevant page, in [log](log.md) and, where it affects product or architecture, in [DESIGN.md](../DESIGN.md) or [ARCHITECTURE.md](../ARCHITECTURE.md).

| # | Question | Where it comes from |
| --- | --- | --- |
| 1 | **Closing time.** The event page says 7 p.m. at the top and 9 p.m. in the details. If 7 p.m., scope shrinks to P0 without @tag or recording, with seed data and a recorded demo. **Resolved 2026-10-28:** the event deck states the Build Day ends at 19:00 and new projects close on Thursday 2026-10-29 at 10:00 (deck s. 1, s. 11); the captain set the internal deadline to that 10:00 for MVP, `README.md` and demo video. The cut order still applies, see [timeline](timeline.md). | p. 16, p. 20; deck s. 1, s. 11 |
| 2 | **Domain.** The QR encodes `https://<domain>/c/<handle>`; the short domain is not chosen. | p. 5, p. 8, p. 20 |
| 3 | **OpenAI model names.** Not fixed; to be confirmed in the console and set in `OPENAI_STT_MODEL` and `OPENAI_TEXT_MODEL`. | p. 12 |
| 4 | **Topics vocabulary.** "About 40 topics" with a partial list; the full list that `lib/topics.ts` and the JSON schema enum need is not in the plan. | p. 7, p. 12 |
| 5 | **Tribe values.** The SQL comment lists Frontend / Backend / AI / Design / Other but there is no check constraint or enum; where the list is enforced is unspecified. | p. 9 |
| 6 | **End-user language.** The plan's agent contract says "UI in Spanish" and the summary schema asks for sentences in Spanish. This repository's rule is English for all code and documentation; whether the product UI and generated summaries stay Spanish for the JSConf audience is a product decision not yet recorded. | p. 12, p. 16 |
| 7 | **Opt-out and consent storage.** The profile has a leaderboard opt-out ("Anonymous") checkbox and `/join` has a consent checkbox, but `attendees` has no column for either. | p. 9, p. 13 |
| 8 | **Who receives +10.** "New mutual connection +10" and the message "Connected with Ana · +10 points" suggest both parties, but the plan never states whether the scanner, the scanned person or both receive it. | p. 5, p. 7, p. 18 |
| 9 | **Capped connections.** Max 12 scoring connections per person per hour: it is unspecified whether a connection beyond the cap is still created and counted on `/live` without points. | p. 7, p. 11 |
| 10 | **Summaries per connection.** "+25 per person" and "only the author can edit" leave open whether both parties can each author a summary for the same connection or there is one summary per connection. | p. 6, p. 7, p. 18 |
| 11 | **Audio storage.** Audio "is deleted after transcription", but where it is held in the meantime (memory, Supabase Storage, temp file) is unspecified. | p. 12 |
| 12 | **Session recovery screen.** The risk table and the API define recovery by handle + code, but none of the seven screens is a recovery screen. | p. 10, p. 20 |
| 13 | **"Active people" counter.** The definition of active is unspecified. | p. 6 |
| 14 | **Public repository and license.** The delivery checklist asks for a public repo with a license; the GitHub repository is currently private (repository setting, not in the plan) and no license is chosen. The event requires a repository link and reuse declared with compatible licenses (deck s. 9, s. 10), so a license and a decision on visibility are needed before submission. **License resolved 2026-10-28:** the captain chose MIT (`LICENSE`); private collaboration continues and visibility is still open. | p. 21; deck s. 9, s. 10 |
| 15 | **"Ask your event" (P2).** Named with the Codex SDK but has no spec. | p. 3, p. 8 |
| 16 | **Photo upload.** `photo_url` exists but no upload or storage mechanism is specified. | p. 4, p. 9 |
| 17 | **Seed toggle.** The seed hide toggle is required but its location (env flag, admin UI, query parameter) is unspecified. | p. 13, p. 18 |
| 19 | **Evidence of Codex use.** Eligibility requires concrete evidence of Codex specifically (screenshot or short video of a task, where and how it was used, how it was reviewed). The team also works with other agents; which Codex tasks will be captured as evidence, and by whom, is undecided. | deck s. 8, s. 10, s. 14 |
| 18 | **Transcription limit vs. recording.** Transcription accepts max 2 minutes of audio, but no limit is stated for how long a consented recording may run. | p. 11, p. 12 |

Related: [risks](risks.md), [data-model](data-model.md), [points-rules](points-rules.md).
