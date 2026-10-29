#!/bin/sh
# Postgres for the Playwright suite (e2e/): a Docker container on port 3901 (Compa's port block, 3900-4099),
# the `auth.users` stub Supabase would own, the drizzle migrations and the interests seed. Idempotent.
# Usage: scripts/e2e/db.sh            prepare the database and print DATABASE_URL
#        scripts/e2e/db.sh stop       stop the container (data is kept)
set -eu

CONTAINER=compa-e2e-pg
PORT=3901
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
export DATABASE_URL="postgresql://compa:compa@127.0.0.1:${PORT}/compa_e2e"
export PATH="$HOME/.bun/bin:$PATH"

if [ "${1:-}" = "stop" ]; then
  docker stop "$CONTAINER" >/dev/null 2>&1 || true
  exit 0
fi

start_container() {
  if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then return 0; fi
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    docker start "$CONTAINER" >/dev/null
    return 0
  fi
  docker run -d --name "$CONTAINER" \
    -e POSTGRES_PASSWORD=compa -e POSTGRES_USER=compa -e POSTGRES_DB=compa_e2e \
    -p "127.0.0.1:${PORT}:5432" postgres:16-alpine >/dev/null
}

wait_ready() {
  tries=0
  until docker exec "$CONTAINER" pg_isready -U compa -d compa_e2e >/dev/null 2>&1; do
    tries=$((tries + 1))
    [ "$tries" -lt 60 ] || { echo "e2e db: postgres did not come up" >&2; exit 1; }
    sleep 1
  done
}

# Supabase owns auth.users in production; the suite needs only the id column the foreign key points at.
auth_stub() {
  docker exec -i "$CONTAINER" psql -q -U compa -d compa_e2e -v ON_ERROR_STOP=1 <<'SQL'
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);
SQL
}

start_container
wait_ready
auth_stub
(cd "$ROOT" && bun run --silent db:migrate >/dev/null && bun run --silent db:seed >/dev/null)
echo "$DATABASE_URL"
