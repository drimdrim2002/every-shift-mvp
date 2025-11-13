#!/usr/bin/env bash
set -euo pipefail

# scripts/mcp/context7.sh -> repo root is two levels up
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/scripts/mcp.env.local"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

# Allow override via env; fallback to known path on this machine
ENTRY="${MCP_CONTEXT7_ENTRY:-/home/brown/mcp-servers/node_modules/@upstash/context7-mcp/dist/index.js}"

exec node "$ENTRY"
