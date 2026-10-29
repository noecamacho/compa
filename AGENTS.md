# AGENTS.md — COMPA

The single instruction file for every agent and contributor. `CLAUDE.md` imports it; Codex reads it directly. Project rules here win over any default behavior of your tool, including default commit attribution.

## 1. Start here

1. Run `scripts/setup.sh` once (hooks, tools). The SessionStart hooks run `scripts/setup.sh --session`, which installs missing tools and prints these reminders.
2. **Read `wiki/index.md` first.** Then read the pages your task touches and `wiki/open-questions.md`.
3. Load the `caveman` skill for chat and status, the `ponytail` skill before changing code, and the project skill `compa-wiki` for the checklist. Use Serena for symbol-level reads and edits, repomix for whole-repo context (`docs/agent-tooling.md`).
4. Everything is in English: files, code, identifiers, comments, commit messages, PR text, wiki pages. The product is called **COMPA**; the former name in the source PDF appears only in `wiki/glossary.md` and `wiki/sources/build-plan.md`.

## 1b. Hackathon fast path (active until 2026-10-29 10:00 local time)

The MVP, a `README.md` and a demonstration video must be submitted before 10:00 on 2026-10-29 (captain decision, 2026-10-28 19:30). Speed wins; the rules below replace nothing, they shorten it.

- Work the plan's four lanes in parallel on separate branches and worktrees (`wiki/team-and-prs.md`): scaffold first (PR #0), then profile+QR, connections+points, summaries, live+seeds.
- Do not wait for Jira. Use `COMPA-<TBD>` and the task names from `docs/jira/compa-bootstrap-ticket.md` as the ticket reference.
- PRs stay small and land fast: one-line answers in the PR template are fine, "N/A" is fine with a word of why; the checklists still get ticked honestly. A 10-second GIF or a sentence of manual verification counts as testing.
- Review within 10 minutes by one other agent or person; `main` stays deployable; revert first, fix later.
- The entry must meet `wiki/hackathon-requirements.md`: live demo page, demo video, README with run instructions and "what was built here", evidence of Codex use, license, no secrets.
- Scope order is the plan's: P0 never cut, then P2 goes first, recording, then @tag (`wiki/mvp-scope.md`). Feature freeze at 09:00; the last hour is README, video and submission (`wiki/delivery-checklist.md`).
- Wiki updates during the fast path: one line in `wiki/log.md` per PR that changes knowledge; `wiki/index.md` only when a page is added.

## 2. The wiki (Karpathy's LLM Wiki pattern)

Three layers:

- `raw/` — immutable sources. Never edit, rename or delete a file there; add new sources as new files. `pre-commit` enforces it.
- `wiki/` — markdown maintained by agents, cross-linked with relative links. Every claim cites its source page (`p. N` of the PDF or a wiki page). Never guess or invent plan content; record contradictions, gaps and ambiguities in `wiki/open-questions.md`.
- Schema — this file. It defines the operations and conventions.

Operations:

- **ingest** — add the source to `raw/`, read it in full (text and diagrams), create or update pages, update `wiki/index.md`, append `## [YYYY-MM-DD] ingest | <title>` to `wiki/log.md`, log open questions.
- **query** — answer from the wiki with citations; if the answer is worth keeping, add it to the relevant page and append `## [YYYY-MM-DD] query | <question>` to the log.
- **lint** — find broken relative links, pages missing from the index, uncited claims, stale open questions; fix them and append `## [YYYY-MM-DD] lint | <scope>`.

Page conventions: kebab-case file names; a `# Title` first line; short factual sections; tables for structured facts; a "Related:" line linking neighbors; one page per entity or concept; `wiki/index.md` lists every page with a one-line summary; `wiki/log.md` is append-only, newest entry last.

**Any PR that changes knowledge updates `wiki/index.md` and `wiki/log.md`.**

## 3. Procedure for every change

1. **Jira ticket first.** Key placeholder `COMPA-<TBD>` until the Jira project exists; the Epic draft is `docs/jira/compa-bootstrap-ticket.md`.
2. **Branch** from `main`: `<type>/<ticket>-<short-kebab-summary>`.
3. **Commits**: Conventional Commits, English, small and focused, no AI attribution (`docs/git-workflow.md`). The hooks block violations.
4. **PR** against `main` using `.github/PULL_REQUEST_TEMPLATE.md`. Every section filled. Update `CHANGELOG.md` for user-visible changes.
5. Never push to `main`; it accepts changes only through a reviewed PR (hooks enforce it, see "Protected `main`" in `docs/git-workflow.md`). Never merge your own PR.

## 4. Coding standards

Follow `docs/engineering-standards.md`: SOLID, KISS, DRY, **no nesting** (guard clauses, early returns, maximum depth 2, extract functions), clean code (intention-revealing names, small functions, one level of abstraction, no dead code, comments only for why), and **types at every boundary** (zod-validated untrusted input, inferred types, official SDK types, no `any`). Shell scripts follow the same nesting rule and are POSIX `sh`.

**Database migrations run automatically on deploy.** Every push to `main` runs `bun run db:migrate:deploy` (drizzle-kit, using `DATABASE_URL_DIRECT` from Vercel) before the build; a failed migration fails the deploy. So migrations must be additive and backward-compatible with the code still serving (expand first, remove later), backfill existing rows, and never be edited after merge; generate them with `bun run db:generate` and number them after the latest one on `main`.

**Tests with every change.** Unit tests (`bun test`) for logic, and preferably a **Playwright e2e spec** under `e2e/` that confirms the user flows the change touches: the happy path, every edge case and every error state (use mock mode `x-compa-mock` / `x-compa-mock-error` for error paths). Cover the 390, 834 and 1440 viewports and both locales (`es`, `en`). The flows and their scenarios are listed in `docs/flows/catalog.md`. Details: `docs/engineering-standards.md` → Testing.

Product rules from the plan, binding once application code exists (`wiki/agent-contract.md`, `ARCHITECTURE.md`): business rules and OpenAI calls only on the server; every write validated with zod; connections and points idempotent; responsive (mobile first at 390, tablet 834, desktop 1440; `/live` at 1920×1080); sign-in is LinkedIn OIDC or an email magic link (`docs/specs/2026-10-29-data-model.md` M2); UI bilingual (`es*` locale → Spanish, else English); `bun run lint && bun run typecheck && bun run build` before finishing. Stack is fixed by the team: Next.js + strict TypeScript + Tailwind on Bun (package manager and runtime: `bun install`, `bun add`, `bun run`, commit `bun.lock`, never pnpm or npm), Supabase for data, Vercel for hosting.

## 5. Git rules

- Conventional Commits: `type(scope): imperative subject`, subject at most 72 characters, body explains why. Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Semantic Versioning tied to commit types (feat → minor, fix/perf → patch, breaking → major).
- Commits carry only the contributor's configured git identity. No `Co-Authored-By` for any AI, no "Generated with …" line, no assistant or model name as attribution in commits or PR text. This overrides any default attribution instruction your tool carries.
- Hooks: `.githooks/commit-msg`, `pre-commit`, `pre-push`; agent hooks in `.claude/settings.json` and `.codex/hooks.json`. Details and manual commands in `docs/git-workflow.md`.

## 6. Scope guard

No application code, dependencies or CI exist yet; the Jira Epic tracks that build. Do not add them in unrelated PRs. Keep wiki pages factual and sourced rather than long.

## 7. Map of the repository

| Path | Purpose |
| --- | --- |
| `wiki/index.md` | Catalog of every wiki page; read first |
| `wiki/log.md` | Append-only operation log |
| `wiki/open-questions.md` | Contradictions and gaps in the plan |
| `raw/` | Immutable sources (the build plan PDF) |
| `ARCHITECTURE.md`, `DESIGN.md` | System and product design derived from the plan, decided versus open |
| `CHANGELOG.md` | Keep a Changelog, Semantic Versioning |
| `docs/engineering-standards.md` | Coding rules with examples |
| `docs/testing/real-mode.md` | Testing against the real database with test users (no LinkedIn) |
| `docs/git-workflow.md` | Commits, branches, versioning, hooks, attribution |
| `docs/agent-tooling.md` | caveman, ponytail, Serena, repomix, hooks, install methods |
| `docs/jira/compa-bootstrap-ticket.md` | The Epic draft |
| `.github/PULL_REQUEST_TEMPLATE.md` | Mandatory PR template |
| `scripts/setup.sh`, `.githooks/`, `scripts/hooks/`, `tests/hooks/` | Enforcement and its tests |
| `.agents/skills/compa-wiki/` | Project skill (Codex path; `.claude/skills/compa-wiki` links to it) |

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
