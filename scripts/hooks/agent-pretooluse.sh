#!/bin/sh
# PreToolUse hook for Claude Code and Codex. Before a shell command runs it
# blocks (exit 2, reason on stderr) a `git push` that targets main and a
# `git commit` whose message would fail scripts/check-commit-message.sh.
# Reads the hook JSON on stdin ({"tool_input":{"command":"..."}}); exit 0 allows.
# Anything this parser cannot read is allowed through; the git hooks are the backstop.
set -u

HERE=$(cd "$(dirname "$0")" && pwd)
CHECKER="$HERE/../check-commit-message.sh"
# `git`, optionally with global options such as `-C dir` or `-c k=v`, at the start of a command.
GIT_PREFIX_RE='(^|[;&|(]|&&|\|\|)[[:space:]]*git([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*[[:space:]]+'
GIT_COMMIT_RE="${GIT_PREFIX_RE}commit([[:space:]]|\$)"
GIT_PUSH_RE="${GIT_PREFIX_RE}push([[:space:]]|\$)"
MAIN_REF_RE='(^|[[:space:]:/])main([[:space:]]|$)'
MESSAGE_FLAG_RE='(^|[[:space:]])(-[a-zA-Z]*m|--message)[= ]'

block() {
  printf 'blocked: %s\n' "$1" >&2
  exit 2
}

read_command() {
  command -v jq >/dev/null 2>&1 || { printf 'agent-pretooluse: jq not found, command not checked\n' >&2; return 1; }
  jq -r '.tool_input.command // empty'
}

# The arguments of the last `git push` in the command, up to the next command separator.
push_arguments() {
  printf '%s' "$1" | tr '\n' ' ' | sed -E 's/.*[[:space:](]git([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*[[:space:]]+push//; s/[;&|].*//'
}

is_push_to_main() {
  printf '%s' "$1" | grep -Eq "$GIT_PUSH_RE" || return 1
  printf '%s' "$1" | grep -q 'ALLOW_MAIN_PUSH=1' && return 1
  push_arguments " $1" | grep -Eq "$MAIN_REF_RE"
}

is_git_commit() {
  printf '%s' "$1" | grep -Eq "$GIT_COMMIT_RE"
}

message_flag_count() {
  printf '%s\n' "$1" | grep -Eo "$MESSAGE_FLAG_RE" | wc -l | tr -d ' '
}

message_from_file_flag() {
  file=$(printf '%s' "$1" | sed -En 's/.*(-F|--file)[= ]+"?([^" ]+)"?.*/\2/p' | head -n1)
  [ -n "$file" ] && [ -r "$file" ] && cat "$file"
}

# shortcut: a single quoted -m value or an EOF heredoc is parsed; several -m flags are left to commit-msg
message_from_inline_flag() {
  [ "$(message_flag_count "$1")" -eq 1 ] || return 1
  printf '%s\n' "$1" \
    | sed -E '1 s/^.*[[:space:]](-[a-zA-Z]*m|--message)[= ]+//' \
    | sed -E "1 s/^\"([^\"]*)\".*\$/\\1/; 1 s/^'([^']*)'.*\$/\\1/" \
    | sed -E "1 s/^\"?\\\$\\(cat <<'?EOF'?//" \
    | sed -E '/^EOF$/,$d'
}

extract_message() {
  message_from_file_flag "$1" && return 0
  message_from_inline_flag "$1"
}

check_commit_message() {
  tmp=$(mktemp)
  printf '%s\n' "$1" > "$tmp"
  reason=$("$CHECKER" "$tmp" 2>&1 >/dev/null)
  status=$?
  rm -f "$tmp"
  [ "$status" -eq 0 ] || block "$reason"
}

cmd=$(read_command) || exit 0
[ -n "$cmd" ] || exit 0
is_push_to_main "$cmd" && block "direct pushes to main are not allowed; push a branch and open a pull request (docs/git-workflow.md)"
is_git_commit "$cmd" || exit 0
message=$(extract_message "$cmd") || exit 0
[ -n "$message" ] || exit 0
check_commit_message "$message"
exit 0
