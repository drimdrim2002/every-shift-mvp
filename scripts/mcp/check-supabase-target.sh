#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/scripts/mcp.env.local"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

: "${SUPABASE_PROJECT_REF:?Missing SUPABASE_PROJECT_REF}"

EXPECTED_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"
CONFIGURED_URL="${SUPABASE_URL:-$EXPECTED_URL}"

echo "SUPABASE_PROJECT_REF=$SUPABASE_PROJECT_REF"
echo "EXPECTED_SUPABASE_URL=$EXPECTED_URL"
echo "CONFIGURED_SUPABASE_URL=$CONFIGURED_URL"

if [[ "$CONFIGURED_URL" != "$EXPECTED_URL" ]]; then
  echo "ERROR: SUPABASE_URL does not match SUPABASE_PROJECT_REF" >&2
  exit 1
fi
