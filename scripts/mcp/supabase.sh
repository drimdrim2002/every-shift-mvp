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

MCP_BIN="${SUPABASE_MCP_BIN:-}"

if [[ -z "$MCP_BIN" ]] && command -v mcp-server-supabase >/dev/null 2>&1; then
  MCP_BIN="$(command -v mcp-server-supabase)"
fi

if [[ -z "$MCP_BIN" && -n "${HOME:-}" ]]; then
  for candidate in "${HOME}"/.npm/_npx/*/node_modules/.bin/mcp-server-supabase; do
    if [[ -x "$candidate" ]]; then
      MCP_BIN="$candidate"
      break
    fi
  done
fi

if [[ -n "$MCP_BIN" ]]; then
  exec "$MCP_BIN" \
    --read-only \
    --project-ref="$SUPABASE_PROJECT_REF"
fi

exec npx -y @supabase/mcp-server-supabase@latest \
  --read-only \
  --project-ref="$SUPABASE_PROJECT_REF"
