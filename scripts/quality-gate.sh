#!/usr/bin/env bash
# scripts/quality-gate.sh
#
# Canonical quality gate entrypoint for this repository.
# Required gates: lint, unit test, build, docs baseline, and debug statement check.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

GATE_PASSED=0
GATE_FAILED=0

run_gate() {
  local gate_name="$1"
  local command="$2"

  echo "Gate: $gate_name"
  if eval "$command"; then
    echo "  ✅ PASSED"
    GATE_PASSED=$((GATE_PASSED + 1))
  else
    echo "  ❌ FAILED"
    GATE_FAILED=$((GATE_FAILED + 1))
  fi
}

echo "QUALITY GATE ENFORCEMENT"
echo "========================"
echo "Canonical gate entrypoint: scripts/quality-gate.sh"
echo "E2E trigger policy: docs/migration/MIGRATION_GOVERNANCE.md (Section 8.2)"

run_gate "Lint (pnpm lint:check)" "pnpm lint:check"
run_gate "Unit Tests (pnpm test:unit)" "pnpm test:unit"
run_gate "Build (pnpm build)" "pnpm build"

echo "Gate: Documentation Baseline"
REQUIRED_DOCS=(
  "docs/migration/MIGRATION_GOVERNANCE.md"
  "docs/migration/REFINED_PRD_SERVICE_TRANSITION_V2.md"
)

MISSING_DOCS=0
for required_doc in "${REQUIRED_DOCS[@]}"; do
  if [[ ! -f "$required_doc" ]]; then
    echo "  ❌ Missing required document: $required_doc"
    MISSING_DOCS=$((MISSING_DOCS + 1))
  fi
done

if [[ $MISSING_DOCS -eq 0 ]]; then
  echo "  ✅ PASSED"
  GATE_PASSED=$((GATE_PASSED + 1))
else
  GATE_FAILED=$((GATE_FAILED + 1))
fi

echo "Gate: No Debug Statements"
DEBUG_COUNT=$( (rg -n "console\\.(log|table)\\(" src --glob "*.ts" --glob "*.vue" || true) | wc -l | tr -d '[:space:]' )
if [[ $DEBUG_COUNT -eq 0 ]]; then
  echo "  ✅ PASSED"
  GATE_PASSED=$((GATE_PASSED + 1))
else
  echo "  ❌ FAILED ($DEBUG_COUNT debug statements found in src/)"
  GATE_FAILED=$((GATE_FAILED + 1))
fi

echo "========================"
echo "QUALITY GATE RESULTS"
echo "Passed: $GATE_PASSED"
echo "Failed: $GATE_FAILED"

if [[ $GATE_FAILED -eq 0 ]]; then
  echo "ALL QUALITY GATES PASSED"
  exit 0
fi

echo "QUALITY GATES FAILED"
echo "Fix failed gates before merge/release."
echo "Triage procedure: docs/migration/MIGRATION_GOVERNANCE.md (Section 8.3)"
exit 1
