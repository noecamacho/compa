# Glossary

English term first; the original Spanish term from the source is quoted where it helps map the PDF to the wiki.

| Term | Meaning | Source term |
| --- | --- | --- |
| COMPA | The product: a networking companion for conferences. The only name used in this repository. | — |
| Pasillo | The source PDF calls this product "Pasillo" (Spanish for "hallway"); it is the former name of COMPA and is not used anywhere else. | "Pasillo" |
| Attendee | A person at the conference with a profile; one row in `attendees`. | "asistente" |
| Organizer | The person running the event; only sees aggregates on `/live`. | "organizador" |
| Handle | Unique identifier generated on save, e.g. `@ana`; used in the QR URL and @tag. | "handle" |
| Recovery code | 3-character code, e.g. `7K2`, that with the handle recovers the session in another browser. | "código de recuperación" |
| @tag | Connecting by typing someone's handle with autocomplete (P1). | "@tag" |
| Connection | A mutual link between two attendees created by QR or @tag; one row in `connections`. | "conexión" |
| Interaction / summary | The note about a conversation, drafted by the AI, approved by its author and shared with both; one row in `interactions`. | "interacción", "resumen" |
| Substantive | AI-set flag that the note describes a real conversation; required to approve and to score. | "sustantivo" |
| Tribe | Optional attendee group: Frontend, Backend, AI, Design, Other. | "tribu" (values "IA", "Diseño", "Otro") |
| Bridge | A connection between attendees of different tribes (+15 extra); also a P2 badge. | "puente" |
| Talker | P2 badge for 5+ summaries. | "Conversador" |
| Streak | P2 badge for 3 connections in 10 minutes. | "Racha" |
| Round | P2: 15–20 minute period after which the scoreboard resets. | "ronda" |
| Live dashboard | `/live`, the projected Kahoot-style screen with podium, topic race, counters and feed. | "dashboard /live" |
| Podium | Animated top-5 leaderboard on `/live`. | "podio" |
| Topics vocabulary | Fixed list of about 40 JS/AI topics plus "Other" used for interests and summaries. | "vocabulario fijo de temas" |
| Seed data | About 150 simulated attendees (plus connections and summaries) flagged `is_seed`, so `/live` is never empty. | "datos simulados", "seeds" |
| Simulator | Optional process that adds a connection every 3–5 s during the demo. | "simulador" |
| Gate | A checkpoint in the timeline that must be passed before the next phase starts. | "compuerta" |
| Feature freeze | Gate 3, 45 minutes before closing: no new features after it. | "freeze" |
| P0 / P1 / P2 | Priority tiers: P0 is never cut; P1 is cut after P2; P2 is cut first. | "P0 / P1 / P2" |
| Follow on… | Buttons on a card that open the other person's social links in a new tab. | "Seguir en…" |
| Structured Outputs | OpenAI feature that returns JSON validated against a schema. | — |
| Build Day | The Codex Build Day Guadalajara event on 2026-10-28, 16:00–19:00, whose rules COMPA must meet; see [hackathon-requirements](hackathon-requirements.md). | "Build Day" |
| Evidence of Codex use | A screenshot or short video of a concrete task done with Codex, required for eligibility. | "evidencia del uso de Codex" |
| Submission | The entry registered in the event form: name, team, problem and solution, repository, video, live demo, evidence. | "entrega" |
| Contract file | A file only the lead edits: migration, `lib/types.ts`, `lib/topics.ts`, `lib/points.ts`. | "contratos" |
