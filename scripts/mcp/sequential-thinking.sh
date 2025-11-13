#!/usr/bin/env bash
set -euo pipefail

# scripts/mcp/sequential-thinking.sh -> repo root is two levels up
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/scripts/mcp.env.local"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

ENTRY="${MCP_SEQUENTIAL_THINKING_ENTRY:-/home/brown/mcp-servers/node_modules/@modelcontextprotocol/server-sequential-thinking/dist/index.js}"

exec node "$ENTRY"
