-- ============================================================================
-- P3-1.5 Verification SQL
-- Purpose:
--   Inspect the runtime schema and RLS posture after applying
--   migrations/013_onboarding_progress_runtime_alignment.sql.
-- Usage:
--   Run each section in Supabase SQL editor or MCP execute_sql.
-- ============================================================================

-- 1) Canonical column shape
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'onboarding_progress'
ORDER BY ordinal_position;

-- Expected:
-- - current_step_key, organization_info_confirmed_at,
--   organization_info_confirmed_by, completed_by, last_actor_user_id exist
-- - legacy user_id no longer exists

-- 2) Canonical uniqueness and duplicate collapse
SELECT
  organization_id,
  COUNT(*) AS row_count
FROM public.onboarding_progress
GROUP BY organization_id
HAVING COUNT(*) > 1;

-- Expected: zero rows

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'onboarding_progress'
ORDER BY indexname;

-- Expected:
-- - unique index/constraint on organization_id only
-- - no index keyed by legacy user_id

-- 3) RLS enablement + policies
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'onboarding_progress';

SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'onboarding_progress'
ORDER BY policyname;

-- Expected:
-- - rowsecurity = true
-- - admin_select / admin_insert / admin_update policies exist

-- 4) ACL surface
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'onboarding_progress'
ORDER BY grantee, privilege_type;

-- Expected:
-- - anon has no privileges
-- - authenticated has SELECT/INSERT/UPDATE only

-- 5) Runtime helper availability
SELECT
  proname,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'has_active_approved_admin_membership',
    'is_onboarding_org_info_domain_ready',
    'is_onboarding_employee_seed_ready',
    'is_onboarding_schedule_request_ready',
    'resolve_onboarding_completed_step_keys',
    'resolve_onboarding_current_step_key'
  )
ORDER BY proname;

-- Expected: six helper functions returned

-- 6) Optional smoke view of current canonical state
SELECT
  op.organization_id,
  op.current_step_key,
  op.current_step,
  public.resolve_onboarding_completed_step_keys(op.organization_id) AS completed_step_keys,
  op.organization_info_confirmed_at,
  op.completed_at
FROM public.onboarding_progress op
ORDER BY op.organization_id;
