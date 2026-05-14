#!/usr/bin/env bash
set -euo pipefail

# EveryShift public holiday sync helper.
#
# Usage:
#   export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
#   export SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
#   export PUBLIC_DATA_SERVICE_KEY="YOUR_DATA_GO_KR_SERVICE_KEY"
#   ./scripts/ops/holiday-setup.sh
#
# Optional range override:
#   PUBLIC_HOLIDAY_SYNC_START_YEAR=2026 PUBLIC_HOLIDAY_SYNC_END_YEAR=2030 ./scripts/ops/holiday-setup.sh
#
# Recommended cadence:
#   - Run after applying migrations to a new environment.
#   - Run periodically, for example monthly or before generating schedules for a new year.
#   - Re-run after data.go.kr announces substitute/temporary public holiday updates.
#
# After running, verify counts in Supabase SQL editor:
#   SELECT
#     EXTRACT(YEAR FROM holiday_date) AS year,
#     COUNT(*) AS holiday_count
#   FROM public.public_holidays
#   WHERE holiday_date BETWEEN DATE '2026-01-01' AND DATE '2030-12-31'
#   GROUP BY 1
#   ORDER BY 1;
#
# Security:
#   - Do not commit real keys.
#   - Do not expose SUPABASE_SERVICE_ROLE_KEY in browser/VITE_* env vars.
#   - Rotate keys if they are pasted into chat, logs, screenshots, or shared docs.

required_vars=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "PUBLIC_DATA_SERVICE_KEY"
)

missing_vars=()
for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    missing_vars+=("${var_name}")
  fi
done

if (( ${#missing_vars[@]} > 0 )); then
  printf 'Missing required environment variables:\n' >&2
  printf '  - %s\n' "${missing_vars[@]}" >&2
  printf '\nSet them in your shell and rerun this script. Values are intentionally not printed.\n' >&2
  exit 1
fi

start_year="${PUBLIC_HOLIDAY_SYNC_START_YEAR:-2026}"
end_year="${PUBLIC_HOLIDAY_SYNC_END_YEAR:-2030}"

printf 'Syncing Korean public holidays for %s-%s...\n' "${start_year}" "${end_year}"

PUBLIC_HOLIDAY_SYNC_START_YEAR="${start_year}" \
PUBLIC_HOLIDAY_SYNC_END_YEAR="${end_year}" \
pnpm sync:public-holidays

printf '\nSync command finished. Review the summary above and run the verification SQL in this file header.\n'
