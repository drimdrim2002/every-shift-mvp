#!/bin/bash
# scripts/shrimp/validate-graph.sh
# Validates DAG integrity (missing targets, cycles, orphan roots) for tasks.json
#
# Usage: ./scripts/shrimp/validate-graph.sh <tasks.json>

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TASKS_JSON="${1:-.shrimp-data/tasks.json}"

if [[ ! -f "$TASKS_JSON" ]]; then
    echo -e "${RED}Error: $TASKS_JSON not found${NC}"
    exit 1
fi

echo "======================================"
echo "Dependency Graph Validation"
echo "Target: $TASKS_JSON"
echo "======================================"

EXIT_CODE=0

# 1. Missing Target Check
echo -n "1️⃣  Missing targets: "
MISSING_TARGETS=$(jq -r '
  (.tasks | map(.id)) as $ids | 
  .tasks[] | .id as $pid | .dependencies[]? | .taskId as $tid | 
  select([$ids[] == $tid] | any | not) | 
  "   - \($pid) -> \($tid)"
' "$TASKS_JSON")

if [[ -z "$MISSING_TARGETS" ]]; then
    echo -e "${GREEN}0 found${NC}"
else
    echo -e "${RED}Found issues${NC}"
    echo "$MISSING_TARGETS"
    EXIT_CODE=1
fi

# 2. Cycle Check
echo -n "2️⃣  Cycle check: "
# tsort outputs cycles to stderr. We capture it.
CYCLE_OUTPUT=$(jq -r '.tasks[] | .id as $id | .dependencies[]? | "\(.taskId) \($id)"' "$TASKS_JSON" | tsort 2>&1 > /dev/null || true)

if [[ -z "$CYCLE_OUTPUT" ]]; then
    echo -e "${GREEN}No cycles found${NC}"
else
    echo -e "${RED}Cycle detected!${NC}"
    echo "$CYCLE_OUTPUT" | grep -v "input contains a loop" || echo "$CYCLE_OUTPUT"
    EXIT_CODE=1
fi

# 3. Orphan Root Check
# Orphan root: tasks with no dependencies AND no one depending on them
echo -n "3️⃣  Orphan root check: "
ORPHAN_ROOTS=$(jq -r '
  (.tasks | map(.id)) as $ids |
  ([.tasks[].dependencies[]?.taskId] | unique) as $targets |
  .tasks[] | 
  select((.dependencies | length == 0) and ([$targets[] == .id] | any | not)) |
  "   - \(.id) (\(.name))"
' "$TASKS_JSON")

if [[ -z "$ORPHAN_ROOTS" ]]; then
    echo -e "${GREEN}0 found${NC}"
else
    echo -e "${YELLOW}Found orphan roots (isolated tasks)${NC}"
    echo "$ORPHAN_ROOTS"
    # Orphan roots are not always errors, but often indicate missing connections.
    # We will treat them as warnings (not incrementing EXIT_CODE unless strict).
fi

echo "======================================"
if [[ $EXIT_CODE -eq 0 ]]; then
    echo -e "${GREEN}✅ Graph integrity PASSED${NC}"
else
    echo -e "${RED}❌ Graph integrity FAILED${NC}"
fi

exit $EXIT_CODE
