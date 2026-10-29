# Changelog

All notable changes to COMPA are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Commit types map to versions as described in `docs/git-workflow.md`.

## [Unreleased]

### Changed

- Package manager and runtime is Bun instead of pnpm (team decision); Next.js, TypeScript, Supabase and Vercel unchanged. Commands are `bun run dev|lint|typecheck|build|seed`.
- Transcription and AI summaries are in Spanish (team decision); code and docs stay English.

### Added

- `docs/specs/2026-10-29-api.md`: approved API spec with routes, request and response shapes, the visibility filter, connection behavior and Realtime channels.
- `docs/specs/2026-10-29-data-model.md`: approved data model for multi-event COMPA with LinkedIn-only sign-in, event check-in, confirmed connections (20 new, 10 reconnection) and per-field profile visibility.
- `docs/plans/2026-10-28-mvp-api-plan.md`: MVP API plan covering LinkedIn sign-up, profile import and field visibility, database entities, route behavior, connection tracking and the `/live` data contract.
- Browser audio recorder in `lib/audio/recorder.ts` (2-minute auto-stop, typed errors, transcript upload) and the AI summaries API contract in `docs/contracts/ai-summaries-api.md`.
- AI core in `lib/ai/`: audio transcription and Spanish summary drafts with Structured Outputs and a verbatim fallback; placeholder topics vocabulary in `lib/topics.ts`.
- LLM wiki (`raw/`, `wiki/`) ingesting the 21-page COMPA build plan and the 14-slide Build Day deck with 34 cross-linked, cited pages, an index, an append-only log, a glossary and an open-questions page.
- `AGENTS.md` as the single agent and contributor instruction file, including the hackathon fast path for the 2026-10-29 10:00 submission deadline; `CLAUDE.md` imports it.
- `ARCHITECTURE.md` and `DESIGN.md` derived from the plan, with decided versus open items.
- `docs/engineering-standards.md`: SOLID, KISS, DRY, no nesting, clean code with TypeScript examples.
- `docs/git-workflow.md`: Conventional Commits, Semantic Versioning, branch naming, hooks and attribution rules.
- `docs/agent-tooling.md`: caveman, ponytail, Serena and repomix usage and verified install methods.
- `docs/jira/compa-bootstrap-ticket.md`: the COMPA Epic draft with per-phase tasks and acceptance criteria.
- `.github/PULL_REQUEST_TEMPLATE.md` that every PR must use.
- Git hooks in `.githooks/` (`commit-msg`, `pre-commit`, `pre-push`), `scripts/setup.sh`, the shared checker `scripts/check-commit-message.sh`, agent hook configs in `.claude/settings.json` and `.codex/hooks.json` (commit rules and no pushes to `main`), and tests in `tests/hooks/`.
- `repomix.config.json`, `.serena/project.yml` and `.gitignore`.
- MIT `LICENSE`, required for the hackathon submission.
