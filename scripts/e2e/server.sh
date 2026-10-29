#!/bin/sh
# Starts the app for the Playwright suite (playwright.config.ts webServer): the e2e database first, then
# `next dev` on port 3902 against it, with the test sign-in enabled (lib/server/test-auth.ts) instead of Supabase.
# Process env wins over .env.local, so API_MODE=mock there does not leak into the suite.
set -eu

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
PORT="${E2E_PORT:-3902}"
export PATH="$HOME/.bun/bin:$PATH"

DATABASE_URL=$("$ROOT/scripts/e2e/db.sh")
export DATABASE_URL
export API_MODE=""
export COMPA_TEST_AUTH=1
export NEXT_PUBLIC_SITE_URL="http://localhost:${PORT}"
export NEXT_PUBLIC_SUPABASE_URL=""
export NEXT_PUBLIC_SUPABASE_ANON_KEY=""
export SUPABASE_SERVICE_ROLE_KEY=""
export OPENAI_API_KEY=""
export OPENAI_TEXT_MODEL="${OPENAI_TEXT_MODEL:-gpt-5.4-mini}"

cd "$ROOT"
exec node_modules/.bin/next dev -p "$PORT"
