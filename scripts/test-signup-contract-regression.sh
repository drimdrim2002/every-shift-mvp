#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[signup-contract] 1/4 Run signup contract unit tests"
pnpm vitest run tests/unit/signup-api.spec.ts tests/unit/auth-signup.spec.ts

echo "[signup-contract] 2/4 Run lint gate"
pnpm lint:check

echo "[signup-contract] 3/4 Verify DB migration markers"
rg -n "can_manage_invite_codes|max_uses|used_count|invite_codes_update_admin_scope" \
  migrations/008_rls_progressive_rollout.sql migrations/010_signup_role_flow.sql

echo "[signup-contract] 4/4 Verify API/function contract markers"
rg -n "Invite Code Domain Rules|contract_only_scaffold|DUPLICATE_REQUEST|organizationSelectionMode" docs/API_SPEC.md
rg -n "validateOrganizationSelectionMode|hasDuplicateContractToken|DUPLICATE_PENDING_REQUEST" supabase/functions/signup-submit/index.ts

echo "[signup-contract] Done"
