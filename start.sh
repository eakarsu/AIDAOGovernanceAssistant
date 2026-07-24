#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$project_dir/.env" ]] || { echo 'Missing .env; copy .env.example and configure it.' >&2; exit 1; }
[[ -d "$project_dir/backend/node_modules" && -d "$project_dir/frontend/node_modules" ]] || { echo 'Dependencies missing; run scripts/bootstrap.sh.' >&2; exit 1; }
set -a; source "$project_dir/.env"; set +a
: "${DATABASE_URL:?DATABASE_URL is required}"; : "${JWT_SECRET:?JWT_SECRET is required}"
[[ ${#JWT_SECRET} -ge 32 ]] || { echo 'JWT_SECRET must contain at least 32 characters.' >&2; exit 1; }

backend_port="${BACKEND_PORT:-3001}"
frontend_port="${FRONTEND_PORT:-3000}"
if lsof -nP -iTCP:"$backend_port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Backend port $backend_port is already in use." >&2
  exit 1
fi
if lsof -nP -iTCP:"$frontend_port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Frontend port $frontend_port is already in use." >&2
  exit 1
fi

if [[ "${MIGRATE_ON_START:-false}" == "true" ]]; then
  [[ "${ALLOW_SCHEMA_MIGRATION:-}" == "1" || "${ALLOW_SCHEMA_MIGRATION:-}" == "true" ]] || {
    echo "MIGRATE_ON_START requires ALLOW_SCHEMA_MIGRATION=1." >&2
    exit 1
  }
  bash "$project_dir/scripts/migrate.sh"
  node "$project_dir/backend/create-admin.js"
fi

(cd "$project_dir/backend" && npm start) & backend_pid=$!
(cd "$project_dir/frontend" && BROWSER=none PORT="$frontend_port" BACKEND_PORT="$backend_port" ./node_modules/.bin/react-scripts start) & frontend_pid=$!
cleanup(){ kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$backend_pid" "$frontend_pid"
