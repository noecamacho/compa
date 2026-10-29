#!/bin/sh
# Validates a git commit message file against docs/git-workflow.md.
# Usage: scripts/check-commit-message.sh <message-file>
# Exit 0 when valid, 1 with a reason on stderr when not.
set -u

TYPES='feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'
SUBJECT_RE="^(${TYPES})(\([a-z0-9._/-]+\))?!?: [^ ].*$"
GIT_GENERATED_RE='^(Merge |Revert "|fixup! |squash! )'
MAX_SUBJECT=72
AI_NAMES='claude|anthropic|chatgpt|openai|codex|copilot|gemini|cursor|devin|aider|windsurf|cline|kiro|ai assistant'
TRAILER_RE="^(co-authored-by|signed-off-by|authored-by|assisted-by|generated-by):.*(${AI_NAMES})"
ATTRIBUTION_RE="^[^a-z]*(generated|written|created|made|authored|assisted|produced) (with|by|using)( (the )?(help|assistance) (of|from))? (${AI_NAMES})"
AI_GENERATED_RE='^[^a-z]*ai[- ]generated'
SPANISH_WORDS='agrega|agregar|añade|arregla|arreglar|corrige|corregir|elimina|eliminar|actualiza|actualizar|cambia|cambiar|mejora|mejorar|nuevo|nueva|archivo|función|pantalla'

fail() {
  printf 'commit message rejected: %s\n' "$1" >&2
  printf 'see docs/git-workflow.md\n' >&2
  exit 1
}

# Everything after the scissors line is the verbose diff, never part of the message.
message_body() {
  sed '/^# -* >8 -*$/,$d' "$1" | grep -v '^#'
}

first_line() {
  message_body "$1" | grep -m1 -v '^[[:space:]]*$'
}

is_git_generated() {
  printf '%s\n' "$1" | grep -Eq "$GIT_GENERATED_RE"
}

check_subject_format() {
  printf '%s\n' "$1" | grep -Eq "$SUBJECT_RE" || fail "subject must be 'type(scope): imperative subject' with type in {${TYPES}}: '$1'"
  printf '%s\n' "$1" | grep -Eq '\.$' && fail "subject must not end with a period: '$1'"
  return 0
}

check_subject_length() {
  length=$(printf '%s' "$1" | wc -m | tr -d ' ')
  [ "$length" -le "$MAX_SUBJECT" ] || fail "subject is ${length} characters, maximum is ${MAX_SUBJECT}"
}

check_subject_language() {
  printf '%s\n' "$1" | grep -q -e 'ñ' -e 'Ñ' -e '¿' -e '¡' && fail "subject must be in English: '$1'"
  printf '%s\n' "$1" | tr 'A-Z' 'a-z' | grep -Ewq "$SPANISH_WORDS" && fail "subject looks Spanish, write it in English: '$1'"
  return 0
}

check_ai_attribution() {
  lowered=$(message_body "$1" | tr 'A-Z' 'a-z')
  printf '%s\n' "$lowered" | grep -Eq "$TRAILER_RE" && fail "AI co-author or attribution trailer is not allowed"
  printf '%s\n' "$lowered" | grep -Eq "$ATTRIBUTION_RE" && fail "AI attribution line ('Generated with ...') is not allowed"
  printf '%s\n' "$lowered" | grep -Eq "$AI_GENERATED_RE" && fail "AI attribution line ('AI-generated') is not allowed"
  printf '%s\n' "$lowered" | grep -q '🤖' && fail "robot emoji attribution is not allowed"
  return 0
}

check_subject() {
  is_git_generated "$1" && return 0
  check_subject_format "$1"
  check_subject_length "$1"
  check_subject_language "$1"
}

[ $# -eq 1 ] || { printf 'usage: %s <message-file>\n' "$0" >&2; exit 2; }
[ -r "$1" ] || fail "cannot read message file '$1'"
subject=$(first_line "$1")
[ -n "$subject" ] || fail "message is empty"
check_subject "$subject"
check_ai_attribution "$1"
