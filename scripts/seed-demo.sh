#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
[[ "${CONFIRM_DESTRUCTIVE_DEMO_SEED:-}" == yes && "${NODE_ENV:-development}" != production ]] || { echo 'Legacy demo seed drops tables; requires CONFIRM_DESTRUCTIVE_DEMO_SEED=yes and non-production NODE_ENV.' >&2; exit 2; }
(cd "$project_dir/backend" && node seeds/seed.js)
