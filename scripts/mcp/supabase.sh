#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root from this script's location
# scripts/mcp/supabase.sh -> repo root is two levels up
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Load project-local MCP env if available
ENV_FILE="$ROOT_DIR/scripts/mcp.env.local"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

: "${SUPABASE_PROJECT_REF:?Missing SUPABASE_PROJECT_REF}"
: "${SUPABASE_ACCESS_TOKEN:?Missing SUPABASE_ACCESS_TOKEN}"

# Allow user to override registry if needed (corporate proxy, etc.)
if [[ -n "${NPM_CONFIG_REGISTRY:-}" ]]; then
  export NPM_CONFIG_REGISTRY
fi

exec npx -y @supabase/mcp-server-supabase@latest \
  --read-only \
  --project-ref="$SUPABASE_PROJECT_REF"
