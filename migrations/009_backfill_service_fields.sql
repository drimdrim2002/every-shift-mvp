-- ============================================================================
-- EveryShift Service Transition - P1-3.2 Idempotent Backfill
-- File: 009_backfill_service_fields.sql
-- Task: 10000000-0000-4000-8000-000000000050
-- Target project: every-shift-mvp (vjmerqaxguovnojinxfq)
-- Purpose:
--   1) Backfill service master data for operational organizations
--   2) Backfill admin-only profiles/organization_memberships bootstrap rows
--   3) Migrate legacy site_requirements into site_staffing_requirements safely
--   4) Fill schedule_assignments.site_id with operational default site
--   5) Keep employees.user_id unchanged in this phase (policy-only)
-- Notes:
--   - This migration is designed to be idempotent and re-runnable.
--   - If any step fails, the transaction is rolled back entirely.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- B001) Resolve operational organizations and enforce admin seed invariant
-- ----------------------------------------------------------------------------

CREATE TEMP TABLE _operational_orgs AS
SELECT
  o.id AS organization_id
FROM public.organizations o
LEFT JOIN public.employees e ON e.organization_id = o.id
LEFT JOIN public.site_requirements sr ON sr.organization_id = o.id
LEFT JOIN public.schedules sc ON sc.organization_id = o.id
LEFT JOIN public.schedule_assignments sa ON sa.schedule_id = sc.id
GROUP BY o.id
HAVING count(DISTINCT e.id) > 0
   AND count(DISTINCT sr.id) > 0
   AND count(DISTINCT sa.id) > 0;

DO $$
DECLARE
  _operational_org_count BIGINT;
  _admin_user_count BIGINT;
BEGIN
  SELECT count(*) INTO _operational_org_count FROM _operational_orgs;
  IF _operational_org_count = 0 THEN
    RAISE EXCEPTION 'B001 failed: no operational organizations detected';
  END IF;

  SELECT count(*)
    INTO _admin_user_count
  FROM auth.users u
  WHERE lower(u.email) = 'admin@everyshift.com';

  IF _admin_user_count <> 1 THEN
    RAISE EXCEPTION
      'B001 failed: expected exactly 1 auth.users row for admin@everyshift.com, found %',
      _admin_user_count;
  END IF;
END $$;

CREATE TEMP TABLE _admin_user AS
SELECT
  u.id AS user_id
FROM auth.users u
WHERE lower(u.email) = 'admin@everyshift.com';

-- ----------------------------------------------------------------------------
-- B002) organization_settings backfill (idempotent: ON CONFLICT DO NOTHING)
-- ----------------------------------------------------------------------------

INSERT INTO public.organization_settings (
  organization_id,
  max_consecutive_night_shifts,
  minimum_rest_hours
)
SELECT
  oo.organization_id,
  NULL,
  '{}'::jsonb
FROM _operational_orgs oo
ON CONFLICT (organization_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- B003) sites backfill (default site MAIN/본원)
-- ----------------------------------------------------------------------------

INSERT INTO public.sites (
  organization_id,
  code,
  name
)
SELECT
  oo.organization_id,
  'MAIN',
  '본원'
FROM _operational_orgs oo
ON CONFLICT (organization_id, code) DO NOTHING;

CREATE TEMP TABLE _main_sites AS
SELECT
  s.organization_id,
  s.id AS site_id
FROM public.sites s
JOIN _operational_orgs oo ON oo.organization_id = s.organization_id
WHERE s.code = 'MAIN';

DO $$
DECLARE
  _main_site_count BIGINT;
  _operational_org_count BIGINT;
BEGIN
  SELECT count(*) INTO _main_site_count FROM _main_sites;
  SELECT count(*) INTO _operational_org_count FROM _operational_orgs;

  IF _main_site_count <> _operational_org_count THEN
    RAISE EXCEPTION
      'B003 failed: MAIN site count(%) does not match operational org count(%)',
      _main_site_count,
      _operational_org_count;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- B004) ranks backfill (default RN/일반간호사)
-- ----------------------------------------------------------------------------

INSERT INTO public.ranks (
  organization_id,
  code,
  name
)
SELECT
  oo.organization_id,
  'RN',
  '일반간호사'
FROM _operational_orgs oo
ON CONFLICT (organization_id, code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- B005) skills backfill (default GENERAL/기본간호)
-- ----------------------------------------------------------------------------

INSERT INTO public.skills (
  organization_id,
  code,
  name
)
SELECT
  oo.organization_id,
  'GENERAL',
  '기본간호'
FROM _operational_orgs oo
ON CONFLICT (organization_id, code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- B006) Admin-only bootstrap for profiles + organization_memberships
-- ----------------------------------------------------------------------------

INSERT INTO public.profiles (
  id,
  global_role,
  account_status
)
SELECT
  au.user_id,
  'super',
  'active'
FROM _admin_user au
ON CONFLICT (id) DO UPDATE
SET
  global_role = EXCLUDED.global_role,
  account_status = EXCLUDED.account_status,
  updated_at = NOW();

INSERT INTO public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  approved_by,
  approved_at,
  rejection_reason
)
SELECT
  oo.organization_id,
  au.user_id,
  'admin',
  'approved',
  NULL,
  COALESCE(om.approved_at, NOW()),
  NULL
FROM _operational_orgs oo
CROSS JOIN _admin_user au
LEFT JOIN public.organization_memberships om
  ON om.organization_id = oo.organization_id
 AND om.user_id = au.user_id
ON CONFLICT (organization_id, user_id) DO UPDATE
SET
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  approved_by = NULL,
  approved_at = COALESCE(public.organization_memberships.approved_at, EXCLUDED.approved_at),
  rejection_reason = NULL,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- B007) site_staffing_requirements migration from legacy site_requirements
-- Guard strategy: NOT EXISTS (required because unique-index drift may exist)
-- ----------------------------------------------------------------------------

INSERT INTO public.site_staffing_requirements (
  organization_id,
  site_id,
  shift_id,
  day_of_week,
  required_count,
  skill_id,
  rank_id
)
SELECT
  sr.organization_id,
  COALESCE(sr.site_id, ms.site_id) AS target_site_id,
  sr.shift_id,
  sr.day_of_week,
  sr.required_count,
  sr.skill_id,
  sr.rank_id
FROM public.site_requirements sr
JOIN _operational_orgs oo
  ON oo.organization_id = sr.organization_id
JOIN _main_sites ms
  ON ms.organization_id = sr.organization_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.site_staffing_requirements ssr
  WHERE ssr.organization_id = sr.organization_id
    AND ssr.site_id = COALESCE(sr.site_id, ms.site_id)
    AND ssr.shift_id = sr.shift_id
    AND ssr.day_of_week = sr.day_of_week
    AND COALESCE(ssr.skill_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(sr.skill_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND COALESCE(ssr.rank_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(sr.rank_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- ----------------------------------------------------------------------------
-- B008) schedule_assignments.site_id fill for operational organizations only
-- ----------------------------------------------------------------------------

UPDATE public.schedule_assignments sa
SET
  site_id = ms.site_id,
  updated_at = NOW()
FROM public.schedules sc
JOIN _operational_orgs oo
  ON oo.organization_id = sc.organization_id
JOIN _main_sites ms
  ON ms.organization_id = sc.organization_id
WHERE sa.schedule_id = sc.id
  AND sa.site_id IS NULL;

-- ----------------------------------------------------------------------------
-- B009) employees.user_id policy note
-- This phase intentionally does not mutate employees.user_id.
-- Post validation should use POST-07 from P1-3.1 validation query catalog.
-- ----------------------------------------------------------------------------

COMMIT;
