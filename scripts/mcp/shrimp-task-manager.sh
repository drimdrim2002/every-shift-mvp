#!/usr/bin/env bash
set -euo pipefail

# scripts/mcp/shrimp-task-manager.sh -> repo root is two levels up
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/scripts/mcp.env.local"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

ENTRY="${MCP_SHRIMP_TASK_MANAGER_ENTRY:-/home/brown/mcp-shrimp-task-manager/dist/index.js}"
export DATA_DIR="${DATA_DIR:-$ROOT_DIR/.shrimp-data}"

exec node "$ENTRY"
