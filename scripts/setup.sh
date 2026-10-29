#!/bin/sh
# Configures git hooks and reports or installs the agent tool stack. Idempotent.
# Usage:
#   scripts/setup.sh             check mode: configure hooks, report missing tools, install nothing
#   scripts/setup.sh --install   install every missing tool, plugin and skill with visible output
#   scripts/setup.sh --session   for SessionStart hooks: same as --install unless COMPA_NO_AUTO_INSTALL=1,
#                                then print the reminders every agent needs; always exits 0
# Documented in docs/agent-tooling.md.
set -u

ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel) || exit 1
cd "$ROOT" || exit 1
MODE=${1:-check}
MISSING=0
CLAUDE_HOME=${CLAUDE_CONFIG_DIR:-$HOME/.claude}
CODEX_HOME=${CODEX_HOME:-$HOME/.codex}

note() {
  printf '%-5s %s\n' "$1" "$2"
}

installing() {
  [ "$MODE" = "--install" ] && return 0
  [ "$MODE" = "--session" ] && [ "${COMPA_NO_AUTO_INSTALL:-0}" != "1" ]
}

# require <label> <probe> <hint>: prerequisites are reported, never installed.
require() {
  sh -c "$2" >/dev/null 2>&1 && { note ok "$1"; return 0; }
  MISSING=1
  note MISS "$1  ->  $3"
}

# ensure <label> <probe> <install-command>: installs only in --install or --session mode.
ensure() {
  sh -c "$2" >/dev/null 2>&1 && { note ok "$1"; return 0; }
  installing || { MISSING=1; note MISS "$1  ->  $3"; return 0; }
  note "..." "installing $1: $3"
  sh -c "$3" || { MISSING=1; note FAIL "$1 (install failed, run by hand: $3)"; return 0; }
  note ok "$1 (installed)"
}

configure_git_hooks() {
  git config core.hooksPath .githooks
  chmod +x .githooks/commit-msg .githooks/pre-commit .githooks/pre-push scripts/setup.sh scripts/check-commit-message.sh scripts/hooks/agent-pretooluse.sh tests/hooks/run.sh
  note ok "git hooks (core.hooksPath=.githooks)"
}

check_prerequisites() {
  require "git" "command -v git" "install git"
  require "jq" "command -v jq" "brew install jq (the agent PreToolUse hook needs it)"
  require "node and npm" "command -v node && command -v npm" "install Node.js 22+ from https://nodejs.org"
}

check_cli_tools() {
  ensure "uv" "command -v uv" "curl -LsSf https://astral.sh/uv/install.sh | sh"
  ensure "serena" "command -v serena" "uv tool install -p 3.13 serena-agent"
  ensure "repomix" "command -v repomix" "npm install -g repomix"
  ensure "caveman skill" "test -f \"$HOME/.claude/skills/caveman/SKILL.md\" || test -f \"$HOME/.agents/skills/caveman/SKILL.md\"" "npx -y skills add JuliusBrussee/caveman -g -y"
}

check_claude_code() {
  command -v claude >/dev/null 2>&1 || { note skip "claude CLI not found; Claude Code MCP and plugin steps skipped"; return 0; }
  ensure "claude: serena MCP" "claude mcp get serena" "claude mcp add --scope user serena -- serena start-mcp-server --context claude-code --project-from-cwd"
  ensure "claude: ponytail plugin" "grep -q 'ponytail@ponytail' \"$CLAUDE_HOME/plugins/installed_plugins.json\"" "claude plugin marketplace add DietrichGebert/ponytail && claude plugin install ponytail@ponytail"
}

check_codex() {
  command -v codex >/dev/null 2>&1 || { note skip "codex CLI not found; Codex MCP and plugin steps skipped"; return 0; }
  ensure "codex: serena MCP" "codex mcp get serena" "codex mcp add serena -- serena start-mcp-server --project-from-cwd --context=codex"
  ensure "codex: ponytail plugin" "grep -q 'plugins.\"ponytail@ponytail\"' \"$CODEX_HOME/config.toml\"" "codex plugin marketplace add DietrichGebert/ponytail && codex plugin add ponytail@ponytail"
}

print_session_reminders() {
  summary="all tools present"
  [ "$MISSING" -eq 0 ] || summary="some tools are missing or failed to install (see above)"
  printf '\nCOMPA session setup: %s.\n' "$summary"
  printf 'Read wiki/index.md first and follow AGENTS.md. Use the caveman skill for chat and status, the ponytail skill for every code change, Serena for symbol-level reads and edits, and repomix for whole-repo context. Every PR uses .github/PULL_REQUEST_TEMPLATE.md.\n'
}

configure_git_hooks
check_prerequisites
check_cli_tools
check_claude_code
check_codex
[ "$MODE" = "--session" ] && { print_session_reminders; exit 0; }
exit "$MISSING"
