#!/bin/sh
# PreToolUse hook for Claude Code and Codex: blocks a `git commit` whose
# message would fail scripts/check-commit-message.sh before the command runs.
# Reads the hook JSON on stdin ({"tool_input":{"command":"..."}}); exits 2 with
# the reason on stderr to block, 0 to allow. Both agents honor that contract.
# Anything this parser cannot read is allowed through; .githooks/commit-msg is the backstop.
set -u

HERE=$(cd "$(dirname "$0")" && pwd)
CHECKER="$HERE/../check-commit-message.sh"
# `git`, optionally with global options such as `-C dir` or `-c k=v`, at the start of a command.
GIT_COMMIT_RE='(^|[;&|(]|&&|\|\|)[[:space:]]*git([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*[[:space:]]+commit([[:space:]]|$)'
MESSAGE_FLAG_RE='(^|[[:space:]])(-[a-zA-Z]*m|--message)[= ]'

read_command() {
  command -v jq >/dev/null 2>&1 || { printf 'agent-pretooluse: jq not found, commit message not checked\n' >&2; return 1; }
  jq -r '.tool_input.command // empty'
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

cmd=$(read_command) || exit 0
[ -n "$cmd" ] || exit 0
is_git_commit "$cmd" || exit 0
message=$(extract_message "$cmd") || exit 0
[ -n "$message" ] || exit 0

tmp=$(mktemp)
printf '%s\n' "$message" > "$tmp"
reason=$("$CHECKER" "$tmp" 2>&1 >/dev/null)
status=$?
rm -f "$tmp"
[ "$status" -eq 0 ] && exit 0
printf 'blocked: %s\n' "$reason" >&2
exit 2
