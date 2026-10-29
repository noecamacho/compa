# Agent tooling

Every agent (Claude Code, Codex, or a human with either) uses the same stack on COMPA. `scripts/setup.sh` configures the git hooks and reports the stack; `scripts/setup.sh --install` installs whatever is missing with visible output; the SessionStart hooks in `.claude/settings.json` and `.codex/hooks.json` run `scripts/setup.sh --session`, which auto-installs missing tools when a session starts in this repository (set `COMPA_NO_AUTO_INSTALL=1` to only report). Install commands below were verified against each project's current documentation on 2026-10-28.

## The stack

| Tool | Use it for | Rule |
| --- | --- | --- |
| caveman (skill) | Terse chat and status lines | Load at the start of every session; code, docs, commits and PR text stay in normal prose |
| ponytail (plugin) | The smallest complete change | Load before writing or changing code |
| Serena (MCP server) | Symbol-level reading and editing: find symbol, references, overview, replace symbol body | Prefer it over reading whole files once application code exists; if not connected, continue with normal tools |
| repomix (CLI) | Whole-repo or cross-cutting context | `repomix` (or `npx -y repomix`) writes `repomix-output.md`; it is ignored by git and rejected by `pre-commit`; delete it when done |
| compa-wiki (project skill) | The COMPA checklist: wiki operations and the Jira → branch → PR procedure | Lives in `.agents/skills/compa-wiki/` (Codex) with `.claude/skills/compa-wiki` as a symlink (Claude Code) |

## Install methods (verified)

| Tool | Command | Source |
| --- | --- | --- |
| uv (Serena prerequisite) | `curl -LsSf https://astral.sh/uv/install.sh \| sh` or `brew install uv` | docs.astral.sh/uv/getting-started/installation |
| Serena | `uv tool install -p 3.13 serena-agent` | github.com/oraios/serena README |
| Serena in Claude Code | `claude mcp add --scope user serena -- serena start-mcp-server --context claude-code --project-from-cwd` | oraios.github.io/serena/02-usage/030_clients.html |
| Serena in Codex | `codex mcp add serena -- serena start-mcp-server --project-from-cwd --context=codex` (the docs show the equivalent `[mcp_servers.serena]` block for `~/.codex/config.toml`) | same page |
| repomix | `npm install -g repomix` (also `brew install repomix`, or one-off `npx repomix@latest`) | repomix.com/guide/installation |
| caveman (all agents) | `npx -y skills add JuliusBrussee/caveman -g -y` (installs into `~/.claude/skills` and `~/.agents/skills`, which Codex scans) | github.com/JuliusBrussee/caveman README; github.com/vercel-labs/skills |
| caveman (Claude plugin form) | `claude plugin marketplace add JuliusBrussee/caveman && claude plugin install caveman@caveman` | caveman README |
| ponytail in Claude Code | `claude plugin marketplace add DietrichGebert/ponytail && claude plugin install ponytail@ponytail` | github.com/DietrichGebert/ponytail |
| ponytail in Codex | `codex plugin marketplace add DietrichGebert/ponytail && codex plugin add ponytail@ponytail`, then trust its hooks under `/hooks` and start a new thread | same README |

Prerequisites that are reported but never installed automatically: git, jq (the PreToolUse hook needs it), Node.js and npm, the `claude` and `codex` CLIs.

## Configuration files in this repository

- `.serena/project.yml`: project name `compa`, `typescript` language server (the plan's stack), `raw/` ignored. `project.local.yml` and `cache/` are local and ignored.
- `repomix.config.json`: markdown output to `repomix-output.md`, respects `.gitignore`, ignores `raw/`, dependencies and build output.
- `.claude/settings.json`: project hooks for Claude Code (below). Personal settings go in `.claude/settings.local.json`, which is ignored and rejected by `pre-commit`.
- `.codex/hooks.json`: the same hooks for Codex. Codex loads project hooks only after the project `.codex/` layer is trusted (Codex prompts for it); hooks are enabled by default in Codex 0.156.
- `.agents/skills/compa-wiki/SKILL.md` and the `.claude/skills/compa-wiki` symlink: the project skill both agents discover.

## Agent hooks

| Event | Script | Claude Code | Codex | Effect |
| --- | --- | --- | --- | --- |
| SessionStart (startup, resume) | `scripts/setup.sh --session` | `.claude/settings.json` | `.codex/hooks.json` | Configures hooks, auto-installs missing tools, prints the reminders (read `wiki/index.md`, load caveman and ponytail, use Serena and repomix, use the PR template) as session context |
| PreToolUse on shell commands | `scripts/hooks/agent-pretooluse.sh` | `.claude/settings.json` | `.codex/hooks.json` | Blocks `git push` commands that target `main`; parses `git commit -m`/`-F` messages from the command, runs `scripts/check-commit-message.sh`, exits 2 with the reason to block the command. Both agents honor exit 2 + stderr. |

Both hook files share the same schema: `hooks.<Event>[].matcher` plus `hooks[].{type:"command", command, timeout}`. Claude Code exposes the repository root as `$CLAUDE_PROJECT_DIR`; the Codex entries resolve it with `git rev-parse --show-toplevel`.

Limits of the PreToolUse parser: it reads a single quoted `-m`/`--message` value (combined flags such as `-am` included), a `-F` file, or a heredoc that uses the `EOF` tag, and it recognizes `git` only at the start of a command (after `;`, `&&`, `||`, `|` or `(`), including `-C` and `-c` global options. Several `-m` flags, an editor commit or anything else it cannot parse are allowed through and caught by `.githooks/commit-msg`, which is the authoritative gate. The hook reads the whole command text, so a command that merely contains `(git commit -m "..."` or `git push origin main` inside a heredoc or quoted script is blocked too; put such text in a file and run the file. Tests: `tests/hooks/run.sh`.

## Sub agents

When an agent spawns sub agents it passes this same stack to them and picks the model tier with the model-router skill where available. A separate sub agent checks the result against the code before the commit.
