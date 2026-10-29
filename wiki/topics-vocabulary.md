# Topics vocabulary

- A fixed vocabulary of about 40 JavaScript/AI topics (React, Node, TypeScript, Agents, LLMs, DX, Testing, Design, Jobs, Startups, etc.) plus "Other" (p. 7). The full list is not in the plan; see [open-questions](open-questions.md).
- Lives in `lib/topics.ts`, a contract file not to be changed without telling the lead (p. 17). PR #0 ships it (p. 13).
- Used by: profile interests chips ([join](screens/join.md), p. 4), `attendees.topics` and `interactions.topics` ([data-model](data-model.md), p. 9), the summary JSON schema `topics` enum ([ai-jobs](ai-jobs.md), p. 12), and the `/live` bar race ([live-dashboard](live-dashboard.md), p. 6–7).
- Topic scoring on `/live`: shared interests of each connection ×1, topics of approved summaries ×3 (p. 7, p. 18).
