#!/bin/bash
# Task Quality Check Script for EveryShift MVP
# Validates tasks.json against taskTemplate standards defined in tasks.metadata.json
#
# Usage: ./scripts/task-quality-check.sh
# Output: Summary of 4 core metrics (requiredFields, estimatedMinutes, namePattern, relatedFiles.type)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Paths
TASKS_JSON=".shrimp-data/tasks.json"
TASKS_METADATA_JSON=".shrimp-data/tasks.metadata.json"
REMAINING_TASKS_DOC="docs/migration/REMAINING_TASKS_MERGED.md"
REMAINING_GENERATOR="scripts/shrimp/generate-remaining-tasks-merged.mjs"

echo "======================================"
echo "Task Quality Check for EveryShift MVP"
echo "======================================"
echo ""

# Check if files exist
if [[ ! -f "$TASKS_JSON" ]]; then
    echo -e "${RED}Error: $TASKS_JSON not found${NC}"
    exit 1
fi

if [[ ! -f "$TASKS_METADATA_JSON" ]]; then
    echo -e "${RED}Error: $TASKS_METADATA_JSON not found${NC}"
    exit 1
fi

# Get total task count
TOTAL_TASKS=$(jq '.tasks | length' "$TASKS_JSON")
echo "Total tasks: $TOTAL_TASKS"
echo ""

# ============================================
# Metric 1: requiredFields validation
# ============================================
echo "1️⃣  Required Fields Validation"
echo "   Checking: name, description, implementationGuide, verificationCriteria, phase, estimatedMinutes, dependencies, relatedFiles"

# Check each required field
MISSING_NAME=$(jq '[.tasks[] | select(.name == null or .name == "") | .id] | length' "$TASKS_JSON")
MISSING_DESC=$(jq '[.tasks[] | select(.description == null or .description == "") | .id] | length' "$TASKS_JSON")
MISSING_IMPL=$(jq '[.tasks[] | select(.implementationGuide == null or .implementationGuide == "") | .id] | length' "$TASKS_JSON")
MISSING_VERIF=$(jq '[.tasks[] | select(.verificationCriteria == null or .verificationCriteria == "") | .id] | length' "$TASKS_JSON")
MISSING_PHASE=$(jq '[.tasks[] | select(.phase == null or .phase == "") | .id] | length' "$TASKS_JSON")
MISSING_EST=$(jq '[.tasks[] | select(.estimatedMinutes == null or .estimatedMinutes == "") | .id] | length' "$TASKS_JSON")
MISSING_DEPS=$(jq '[.tasks[] | select(.dependencies == null) | .id] | length' "$TASKS_JSON")
MISSING_RELATED=$(jq '[.tasks[] | select(.relatedFiles == null) | .id] | length' "$TASKS_JSON")

MISSING_FIELDS_COUNT=$((MISSING_NAME + MISSING_DESC + MISSING_IMPL + MISSING_VERIF + MISSING_PHASE + MISSING_EST + MISSING_DEPS + MISSING_RELATED))

if [[ "$MISSING_NAME" -gt 0 ]]; then echo -e "   ${RED}✗ name: $MISSING_NAME missing${NC}"; fi
if [[ "$MISSING_DESC" -gt 0 ]]; then echo -e "   ${RED}✗ description: $MISSING_DESC missing${NC}"; fi
if [[ "$MISSING_IMPL" -gt 0 ]]; then echo -e "   ${RED}✗ implementationGuide: $MISSING_IMPL missing${NC}"; fi
if [[ "$MISSING_VERIF" -gt 0 ]]; then echo -e "   ${RED}✗ verificationCriteria: $MISSING_VERIF missing${NC}"; fi
if [[ "$MISSING_PHASE" -gt 0 ]]; then echo -e "   ${RED}✗ phase: $MISSING_PHASE missing${NC}"; fi
if [[ "$MISSING_EST" -gt 0 ]]; then echo -e "   ${RED}✗ estimatedMinutes: $MISSING_EST missing${NC}"; fi
if [[ "$MISSING_DEPS" -gt 0 ]]; then echo -e "   ${RED}✗ dependencies: $MISSING_DEPS missing${NC}"; fi
if [[ "$MISSING_RELATED" -gt 0 ]]; then echo -e "   ${RED}✗ relatedFiles: $MISSING_RELATED missing${NC}"; fi

if [[ "$MISSING_FIELDS_COUNT" -eq 0 ]]; then
    echo -e "   ${GREEN}✓ All required fields present${NC}"
else
    echo -e "   ${RED}✗ Total missing: $MISSING_FIELDS_COUNT${NC}"
fi
echo ""

# ============================================
# Metric 2: estimatedMinutes validation
# ============================================
echo "2️⃣  Estimated Minutes Validation"
echo "   Allowed values: [60, 90, 120, 180]"

# Check for missing values (already counted above)
# Check for invalid values (not in allowed list)
INVALID_MINUTES=$(jq '[.tasks[] | select(.estimatedMinutes != null and .estimatedMinutes != "" and (.estimatedMinutes | tostring) != "60" and (.estimatedMinutes | tostring) != "90" and (.estimatedMinutes | tostring) != "120" and (.estimatedMinutes | tostring) != "180") | .id] | length' "$TASKS_JSON")

if [[ "$INVALID_MINUTES" -eq 0 && "$MISSING_EST" -eq 0 ]]; then
    echo -e "   ${GREEN}✓ All estimatedMinutes valid${NC}"
else
    echo -e "   ${RED}✗ Invalid: $INVALID_MINUTES, Missing: $MISSING_EST${NC}"
fi
echo ""

# ============================================
# Metric 3: namePattern validation
# ============================================
echo "3️⃣  Name Pattern Validation"
echo "   Pattern: ^P\\d+-\\d+\\.\\d+(?:\\.\\d+)?\\s+.+$"

NAME_PATTERN_VIOLATIONS=$(jq '[.tasks[] | select(.name | test("^P[0-9]+-[0-9]+\\.[0-9]+(\\.[0-9]+)?\\s+.+") | not) | .id] | length' "$TASKS_JSON")

if [[ "$NAME_PATTERN_VIOLATIONS" -eq 0 ]]; then
    echo -e "   ${GREEN}✓ All task names match pattern${NC}"
else
    echo -e "   ${RED}✗ Pattern violations: $NAME_PATTERN_VIOLATIONS${NC}"
    echo ""
    echo "   Violating tasks:"
    jq -r '.tasks[] | select(.name | test("^P[0-9]+-[0-9]+\\.[0-9]+(\\.[0-9]+)?\\s+.+") | not) | "   - \(.id): \(.name)"' "$TASKS_JSON"
fi
echo ""

# ============================================
# Metric 4: relatedFiles.type validation
# ============================================
echo "4️⃣  RelatedFiles Type Validation"
echo "   Allowed types: [TO_MODIFY, REFERENCE, CREATE, DEPENDENCY, OTHER]"

# Count invalid types directly using jq
INVALID_TYPE_COUNT=$(jq '[.tasks[] | .relatedFiles[]? | select(.type != null and .type != "TO_MODIFY" and .type != "REFERENCE" and .type != "CREATE" and .type != "DEPENDENCY" and .type != "OTHER")] | length' "$TASKS_JSON")

if [[ "$INVALID_TYPE_COUNT" -eq 0 ]]; then
    echo -e "   ${GREEN}✓ All relatedFiles.types valid${NC}"
else
    echo -e "   ${RED}✗ Total invalid types: $INVALID_TYPE_COUNT${NC}"
    echo ""
    echo "   Invalid entries:"
    jq -r '.tasks[] | select(.relatedFiles != null) | .relatedFiles[]? | select(.type != null and .type != "TO_MODIFY" and .type != "REFERENCE" and .type != "CREATE" and .type != "DEPENDENCY" and .type != "OTHER") | "   - \(.type) in relatedFiles"' "$TASKS_JSON" | head -10
fi
echo ""

# ============================================
# Metric 5: Graph Integrity validation
# ============================================
echo "5️⃣  Graph Integrity Validation"
echo "   Checking: Missing targets, Cycles, Orphan roots"

if [[ -f "./scripts/shrimp/validate-graph.sh" ]]; then
    ./scripts/shrimp/validate-graph.sh "$TASKS_JSON" || GRAPH_FAILED=1
fi
GRAPH_FAILED=${GRAPH_FAILED:-0}
echo ""

# ============================================
# Metric 6: Remaining tasks doc sync validation
# ============================================
echo "6️⃣  Remaining Tasks Doc Sync Validation"
echo "   Checking: tasks.json -> REMAINING_TASKS_MERGED.md sync"

DOC_SYNC_FAILED=0

if [[ -f "$REMAINING_GENERATOR" ]]; then
    if node "$REMAINING_GENERATOR" --mode check > /dev/null 2>&1; then
        echo -e "   ${GREEN}✓ REMAINING_TASKS_MERGED.md is in sync${NC}"
    else
        echo -e "   ${YELLOW}! Drift detected. Auto-regenerating document...${NC}"
        node "$REMAINING_GENERATOR" --mode write > /dev/null
        echo -e "   ${RED}✗ Documentation drift detected and regenerated. Review and rerun checks.${NC}"
        DOC_SYNC_FAILED=1
    fi
else
    echo -e "   ${RED}✗ Generator not found: $REMAINING_GENERATOR${NC}"
    DOC_SYNC_FAILED=1
fi
echo ""

# ============================================
# Summary
# ============================================
echo "======================================"
echo "Summary"
echo "======================================"
echo "Total tasks: $TOTAL_TASKS"
echo "1. Required fields: $MISSING_FIELDS_COUNT issues"
echo "2. Estimated minutes: $((INVALID_MINUTES + MISSING_EST)) issues"
echo "3. Name pattern: $NAME_PATTERN_VIOLATIONS violations"
echo "4. RelatedFiles types: $INVALID_TYPE_COUNT issues"
echo "5. Graph integrity: $((GRAPH_FAILED)) issues"
echo "6. Remaining tasks doc sync: $DOC_SYNC_FAILED issues"
echo ""

TOTAL_ISSUES=$((MISSING_FIELDS_COUNT + INVALID_MINUTES + MISSING_EST + NAME_PATTERN_VIOLATIONS + INVALID_TYPE_COUNT + GRAPH_FAILED + DOC_SYNC_FAILED))

if [[ "$TOTAL_ISSUES" -eq 0 ]]; then
    echo -e "${GREEN}✅ All checks passed! (0 issues)${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $TOTAL_ISSUES issue(s)${NC}"
    exit 1
fi
