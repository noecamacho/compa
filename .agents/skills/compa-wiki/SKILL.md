---
name: compa-wiki
description: COMPA working procedure for any agent - read the wiki index first, run the wiki operations (ingest, query, lint), then follow Jira ticket -> branch -> Conventional Commits -> PR template. Use at the start of every COMPA task and whenever knowledge in raw/ or wiki/ changes.
---

# COMPA wiki and workflow skill

The full rules are in `AGENTS.md` at the repository root; this skill is the short operational checklist.

## Before any work

1. Run `scripts/setup.sh` (hooks and tools). The SessionStart hooks already run it with `--session`.
2. Read `wiki/index.md`, then the pages your task touches. Read `wiki/open-questions.md` before deciding anything the plan leaves open.
3. Load the `caveman` skill for chat and status and the `ponytail` skill for code changes. Use Serena tools for symbol-level reads and edits, `repomix` for a whole-repo view.

## Wiki operations

- **ingest**: add the source to `raw/` (never edit an existing one), read it in full, create or update `wiki/` pages with page citations, update `wiki/index.md`, append `## [YYYY-MM-DD] ingest | <title>` to `wiki/log.md`, record contradictions in `wiki/open-questions.md`.
- **query**: answer from `wiki/` pages and cite them; if the answer is worth keeping, add it to the relevant page and log `query | <question>`.
- **lint**: check broken relative links, pages missing from `wiki/index.md`, claims without a page citation, stale open questions; fix and log `lint | <scope>`.

## Delivery procedure

1. Jira ticket (key `COMPA-<TBD>` until the project exists).
2. Branch `<type>/<ticket>-<short-summary>` from `main`.
3. Small Conventional Commits in English, no AI attribution (`docs/git-workflow.md`).
4. Standards: `docs/engineering-standards.md` (SOLID, KISS, DRY, nesting depth <= 2, clean code, types at every boundary).
5. PR with `.github/PULL_REQUEST_TEMPLATE.md`, every section filled; update `wiki/index.md`, `wiki/log.md` and `CHANGELOG.md` when they apply.
