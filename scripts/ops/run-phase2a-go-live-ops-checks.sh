#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

UNIT_TESTS=(
  tests/unit/phase2-ops-contracts.spec.ts
  tests/unit/phase2-ops-auth.spec.ts
  tests/unit/phase2-ops-cors.spec.ts
  tests/unit/phase2-ops-repository.spec.ts
  tests/unit/phase2-ops-api.spec.ts
  tests/unit/phase2-ops-checklist.spec.ts
  tests/unit/off-request-policy-table.spec.ts
  tests/unit/step2-site-info.spec.ts
  tests/unit/step3-employee-info.spec.ts
  tests/unit/step4-initial-data.spec.ts
  tests/unit/step5-result.spec.ts
  tests/unit/dashboard.spec.ts
  tests/unit/excel.spec.ts
  tests/unit/phase2-schedule-repository.spec.ts
  tests/unit/phase2-schedule-write-repository.spec.ts
)

E2E_TESTS=(
  tests/e2e/pilot-checklist.spec.ts
  tests/e2e/schedule-workflow.spec.ts
  tests/e2e/step5-review-hub.spec.ts
)

print_section() {
  printf '\n== %s ==\n' "$1"
}

run_cmd() {
  printf '+'
  for arg in "$@"; do
    printf ' %q' "$arg"
  done
  printf '\n'
  "$@"
}

env_is_set() {
  local name="$1"
  [[ -n "${!name:-}" ]]
}

all_env_set() {
  local name
  for name in "$@"; do
    if ! env_is_set "$name"; then
      return 1
    fi
  done
  return 0
}

print_section "Phase2A-2 unit and repository verification"
run_cmd pnpm exec vitest run "${UNIT_TESTS[@]}"

if all_env_set TEST_USER_EMAIL TEST_USER_PASSWORD; then
  if env_is_set TEST_FINALIZED_MONTH; then
    E2E_TESTS+=(tests/e2e/step5-finalized-readonly.spec.ts)
  fi

  print_section "Phase2A-2 browser smoke verification"
  run_cmd pnpm exec playwright test "${E2E_TESTS[@]}"
else
  print_section "Phase2A-2 browser smoke verification"
  printf 'Skipped: set TEST_USER_EMAIL and TEST_USER_PASSWORD to run Playwright smoke tests.\n'
fi

if all_env_set \
  SUPABASE_URL \
  PHASE2_OPS_OPERATOR_ACCESS_TOKEN \
  PHASE2_OPS_BOOTSTRAP_ORGANIZATION_ID \
  PHASE2_OPS_BOOTSTRAP_TARGET_EMAIL \
  PHASE2_OPS_BOOTSTRAP_DISPLAY_NAME; then
  print_section "Phase2A-2 live bootstrap smoke"
  run_cmd node scripts/ops/bootstrap-phase2-admin.ts \
    "$PHASE2_OPS_BOOTSTRAP_ORGANIZATION_ID" \
    "$PHASE2_OPS_BOOTSTRAP_TARGET_EMAIL" \
    "$PHASE2_OPS_BOOTSTRAP_DISPLAY_NAME" \
    "${PHASE2_OPS_BOOTSTRAP_CREATE_PILOT_SITE:-true}" \
    "${PHASE2_OPS_BOOTSTRAP_SEED_ORGANIZATION_SETTINGS:-true}"
else
  print_section "Phase2A-2 live bootstrap smoke"
  printf 'Skipped: set SUPABASE_URL, PHASE2_OPS_OPERATOR_ACCESS_TOKEN, PHASE2_OPS_BOOTSTRAP_ORGANIZATION_ID, PHASE2_OPS_BOOTSTRAP_TARGET_EMAIL, and PHASE2_OPS_BOOTSTRAP_DISPLAY_NAME to run live bootstrap smoke.\n'
fi

print_section "Phase2A-2 go-live ops verification complete"
printf 'All requested checks finished.\n'
