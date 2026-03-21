-- ============================================================================
-- EveryShift P3-1.5 Onboarding Progress Runtime Alignment
-- File: 013_onboarding_progress_runtime_alignment.sql
-- Purpose:
--   1) Replace onboarding_progress user-scoped ownership with an organization-
--      scoped canonical row model
--   2) Collapse legacy duplicate rows deterministically without keeping a
--      per-user completion path in production
--   3) Add canonical onboarding step helpers for later edge-function/runtime work
--   4) Enable admin-only tenant-isolated RLS for onboarding_progress
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) RBAC Helper: approved active admin membership only (no super bypass)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_active_approved_admin_membership(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.organization_memberships om
      ON om.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.account_status = 'active'
      AND om.organization_id = target_org_id
      AND om.status = 'approved'
      AND om.role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.has_active_approved_admin_membership(UUID) IS
  'Returns true when auth.uid() is an active approved admin member of the target organization. Super role does not bypass this onboarding-specific check.';

-- ============================================================================
-- 2) Add canonical columns before collapsing legacy duplicate rows
-- ============================================================================

ALTER TABLE public.onboarding_progress
  ADD COLUMN IF NOT EXISTS current_step_key VARCHAR(32),
  ADD COLUMN IF NOT EXISTS organization_info_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS organization_info_confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Preserve legacy rows long enough to compute a canonical winner per organization.
CREATE TEMP TABLE _onboarding_progress_canonical_choice ON COMMIT DROP AS
WITH completed_choice AS (
  SELECT DISTINCT ON (op.organization_id)
    op.organization_id,
    op.id AS chosen_id,
    op.user_id AS chosen_user_id,
    op.completed_at AS chosen_completed_at,
    op.current_step AS legacy_current_step,
    op.created_at AS legacy_created_at,
    op.updated_at AS legacy_updated_at
  FROM public.onboarding_progress op
  WHERE op.completed_at IS NOT NULL
  ORDER BY op.organization_id, op.completed_at ASC, op.user_id ASC
),
incomplete_choice AS (
  SELECT DISTINCT ON (op.organization_id)
    op.organization_id,
    op.id AS chosen_id,
    op.user_id AS chosen_user_id,
    NULL::TIMESTAMPTZ AS chosen_completed_at,
    op.current_step AS legacy_current_step,
    op.created_at AS legacy_created_at,
    op.updated_at AS legacy_updated_at
  FROM public.onboarding_progress op
  WHERE NOT EXISTS (
    SELECT 1
    FROM completed_choice cc
    WHERE cc.organization_id = op.organization_id
  )
  ORDER BY op.organization_id, op.current_step DESC, op.updated_at DESC, op.user_id ASC
)
SELECT *
FROM completed_choice
UNION ALL
SELECT *
FROM incomplete_choice;

UPDATE public.onboarding_progress op
SET current_step_key = CASE
      WHEN choice.chosen_completed_at IS NOT NULL THEN NULL
      WHEN choice.legacy_current_step <= 1 THEN 'organization_info'
      WHEN choice.legacy_current_step = 2 THEN 'employee_seed'
      ELSE 'schedule_request'
    END,
    organization_info_confirmed_at = CASE
      WHEN choice.legacy_current_step >= 2 OR choice.chosen_completed_at IS NOT NULL
        THEN COALESCE(op.organization_info_confirmed_at, choice.legacy_updated_at, choice.legacy_created_at)
      ELSE op.organization_info_confirmed_at
    END,
    organization_info_confirmed_by = CASE
      WHEN choice.legacy_current_step >= 2 OR choice.chosen_completed_at IS NOT NULL
        THEN COALESCE(op.organization_info_confirmed_by, choice.chosen_user_id)
      ELSE op.organization_info_confirmed_by
    END,
    completed_at = COALESCE(choice.chosen_completed_at, op.completed_at),
    completed_by = CASE
      WHEN choice.chosen_completed_at IS NOT NULL THEN COALESCE(op.completed_by, choice.chosen_user_id)
      ELSE op.completed_by
    END,
    last_actor_user_id = COALESCE(op.last_actor_user_id, choice.chosen_user_id)
FROM _onboarding_progress_canonical_choice choice
WHERE op.id = choice.chosen_id;

DELETE FROM public.onboarding_progress op
WHERE EXISTS (
  SELECT 1
  FROM _onboarding_progress_canonical_choice choice
  WHERE choice.organization_id = op.organization_id
    AND choice.chosen_id <> op.id
);

-- ============================================================================
-- 3) Retire legacy ownership shape and tighten canonical table constraints
-- ============================================================================

ALTER TABLE public.onboarding_progress
  DROP CONSTRAINT IF EXISTS onboarding_progress_organization_id_user_id_key;

DROP INDEX IF EXISTS public.idx_onboarding_user_completed_at;

ALTER TABLE public.onboarding_progress
  DROP CONSTRAINT IF EXISTS onboarding_progress_current_step_check;

ALTER TABLE public.onboarding_progress
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE public.onboarding_progress
  ALTER COLUMN current_step SET DEFAULT 1,
  ALTER COLUMN current_step_key SET DEFAULT 'organization_info';

ALTER TABLE public.onboarding_progress
  ADD CONSTRAINT onboarding_progress_organization_id_key UNIQUE (organization_id);

ALTER TABLE public.onboarding_progress
  ADD CONSTRAINT onboarding_progress_current_step_key_check
    CHECK (
      current_step_key IS NULL
      OR current_step_key IN ('organization_info', 'employee_seed', 'schedule_request')
    ),
  ADD CONSTRAINT onboarding_progress_step1_actor_check
    CHECK (
      organization_info_confirmed_at IS NOT NULL
      OR organization_info_confirmed_by IS NULL
    ),
  ADD CONSTRAINT onboarding_progress_completed_actor_check
    CHECK (
      completed_at IS NOT NULL
      OR completed_by IS NULL
    );

COMMENT ON TABLE public.onboarding_progress IS
  'Organization-scoped onboarding progress. One canonical row per organization, mutated only by approved active admins of the same tenant.';

COMMENT ON COLUMN public.onboarding_progress.current_step IS
  'Legacy compatibility field derived from current_step_key. 1=organization_info, 2=employee_seed, 3=schedule_request, 4=complete.';

COMMENT ON COLUMN public.onboarding_progress.current_step_key IS
  'Canonical first incomplete onboarding step key. Null means onboarding is complete for the organization.';

COMMENT ON COLUMN public.onboarding_progress.organization_info_confirmed_at IS
  'Persisted Step 1 confirmation event timestamp for the organization-scoped onboarding flow.';

COMMENT ON COLUMN public.onboarding_progress.organization_info_confirmed_by IS
  'Audit actor that confirmed Step 1 organization_info.';

COMMENT ON COLUMN public.onboarding_progress.completed_by IS
  'Audit actor that completed onboarding, when known.';

COMMENT ON COLUMN public.onboarding_progress.last_actor_user_id IS
  'Most recent authenticated admin actor that changed the onboarding row.';

-- ============================================================================
-- 4) Canonical step/domain helpers used by migration and later runtime work
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_onboarding_org_info_domain_ready(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
           SELECT 1
           FROM public.organizations o
           WHERE o.id = target_org_id
             AND NULLIF(BTRIM(o.name), '') IS NOT NULL
             AND NULLIF(BTRIM(o.type), '') IS NOT NULL
         )
     AND EXISTS (
           SELECT 1
           FROM public.organization_settings os
           WHERE os.organization_id = target_org_id
         )
     AND EXISTS (
           SELECT 1
           FROM public.sites s
           WHERE s.organization_id = target_org_id
         )
     AND EXISTS (
           SELECT 1
           FROM public.shifts sh
           WHERE sh.organization_id = target_org_id
         );
$$;

COMMENT ON FUNCTION public.is_onboarding_org_info_domain_ready(UUID) IS
  'Returns true when the target organization has the minimum persisted organization settings, site, and shift prerequisites required by onboarding Step 1.';

CREATE OR REPLACE FUNCTION public.is_onboarding_employee_seed_ready(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.organization_id = target_org_id
      AND CASE
            WHEN jsonb_typeof(e.available_shifts) = 'array'
              THEN jsonb_array_length(e.available_shifts) > 0
            ELSE FALSE
          END
  );
$$;

COMMENT ON FUNCTION public.is_onboarding_employee_seed_ready(UUID) IS
  'Returns true when the target organization has at least one schedulable employee row.';

CREATE OR REPLACE FUNCTION public.is_onboarding_schedule_request_ready(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.schedules sc
    WHERE sc.organization_id = target_org_id
  );
$$;

COMMENT ON FUNCTION public.is_onboarding_schedule_request_ready(UUID) IS
  'Returns true when the target organization has at least one persisted schedule/planning-start record.';

CREATE OR REPLACE FUNCTION public.resolve_onboarding_completed_step_keys(target_org_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress public.onboarding_progress%ROWTYPE;
  v_step1_complete BOOLEAN := FALSE;
  v_step2_complete BOOLEAN := FALSE;
  v_step3_complete BOOLEAN := FALSE;
  v_result TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT *
  INTO v_progress
  FROM public.onboarding_progress
  WHERE organization_id = target_org_id;

  IF NOT FOUND THEN
    RETURN v_result;
  END IF;

  v_step1_complete := v_progress.organization_info_confirmed_at IS NOT NULL
    AND public.is_onboarding_org_info_domain_ready(target_org_id);

  IF v_step1_complete THEN
    v_result := array_append(v_result, 'organization_info');
  END IF;

  v_step2_complete := v_step1_complete
    AND public.is_onboarding_employee_seed_ready(target_org_id);

  IF v_step2_complete THEN
    v_result := array_append(v_result, 'employee_seed');
  END IF;

  v_step3_complete := v_step2_complete
    AND public.is_onboarding_schedule_request_ready(target_org_id);

  IF v_step3_complete THEN
    v_result := array_append(v_result, 'schedule_request');
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.resolve_onboarding_completed_step_keys(UUID) IS
  'Returns the canonical ordered completed onboarding step keys for the target organization.';

CREATE OR REPLACE FUNCTION public.resolve_onboarding_current_step_key(target_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_step_keys TEXT[];
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.onboarding_progress op
    WHERE op.organization_id = target_org_id
  ) THEN
    RETURN 'organization_info';
  END IF;

  v_completed_step_keys := public.resolve_onboarding_completed_step_keys(target_org_id);

  IF NOT ('organization_info' = ANY (v_completed_step_keys)) THEN
    RETURN 'organization_info';
  END IF;

  IF NOT ('employee_seed' = ANY (v_completed_step_keys)) THEN
    RETURN 'employee_seed';
  END IF;

  IF NOT ('schedule_request' = ANY (v_completed_step_keys)) THEN
    RETURN 'schedule_request';
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.resolve_onboarding_current_step_key(UUID) IS
  'Returns the canonical first incomplete onboarding step key for the target organization, or null when onboarding is complete.';

-- ============================================================================
-- 5) Recalculate canonical state from explicit confirmation + domain facts
-- ============================================================================

WITH recalculated AS (
  SELECT
    op.id,
    public.resolve_onboarding_current_step_key(op.organization_id) AS next_step_key,
    first_schedule.first_schedule_created_at
  FROM public.onboarding_progress op
  LEFT JOIN LATERAL (
    SELECT MIN(sc.created_at) AS first_schedule_created_at
    FROM public.schedules sc
    WHERE sc.organization_id = op.organization_id
  ) first_schedule ON TRUE
)
UPDATE public.onboarding_progress op
SET current_step_key = recalculated.next_step_key,
    current_step = CASE recalculated.next_step_key
      WHEN 'organization_info' THEN 1
      WHEN 'employee_seed' THEN 2
      WHEN 'schedule_request' THEN 3
      ELSE 4
    END,
    completed_at = CASE
      WHEN recalculated.next_step_key IS NULL
        THEN COALESCE(op.completed_at, recalculated.first_schedule_created_at)
      ELSE NULL
    END,
    completed_by = CASE
      WHEN recalculated.next_step_key IS NULL THEN op.completed_by
      ELSE NULL
    END
FROM recalculated
WHERE op.id = recalculated.id;

ALTER TABLE public.onboarding_progress
  ADD CONSTRAINT onboarding_progress_current_step_check
    CHECK (current_step BETWEEN 1 AND 4),
  ADD CONSTRAINT onboarding_progress_completion_shape_check
    CHECK (
      (current_step_key IS NULL AND completed_at IS NOT NULL)
      OR (current_step_key IS NOT NULL AND completed_at IS NULL)
    );

-- ============================================================================
-- 6) Trigger: keep compatibility fields/audit fields aligned on future writes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.onboarding_progress_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_info_confirmed_at IS NULL THEN
    NEW.organization_info_confirmed_by := NULL;
  END IF;

  IF NEW.completed_at IS NULL THEN
    NEW.completed_by := NULL;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF NEW.organization_info_confirmed_by IS NOT NULL
       AND NEW.organization_info_confirmed_by <> auth.uid() THEN
      RAISE EXCEPTION 'organization_info_confirmed_by must match auth.uid()'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.completed_by IS NOT NULL
       AND NEW.completed_by <> auth.uid() THEN
      RAISE EXCEPTION 'completed_by must match auth.uid()'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.last_actor_user_id IS NOT NULL
       AND NEW.last_actor_user_id <> auth.uid() THEN
      RAISE EXCEPTION 'last_actor_user_id must match auth.uid()'
        USING ERRCODE = '42501';
    END IF;

    NEW.last_actor_user_id := auth.uid();
  END IF;

  IF TG_OP = 'UPDATE'
     AND auth.uid() IS NOT NULL
     AND OLD.completed_at IS NOT NULL
     AND (NEW.completed_at IS NULL OR NEW.current_step_key IS NOT NULL) THEN
    RAISE EXCEPTION 'completed onboarding_progress rows cannot be rewound by product writes'
      USING ERRCODE = '42501';
  END IF;

  NEW.current_step := CASE NEW.current_step_key
    WHEN 'organization_info' THEN 1
    WHEN 'employee_seed' THEN 2
    WHEN 'schedule_request' THEN 3
    ELSE 4
  END;
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_progress_before_write ON public.onboarding_progress;

CREATE TRIGGER trg_onboarding_progress_before_write
BEFORE INSERT OR UPDATE ON public.onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION public.onboarding_progress_before_write();

-- ============================================================================
-- 7) RLS + grants: admin-only access for same organization, no broad ACL
-- ============================================================================

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.onboarding_progress FROM PUBLIC;
REVOKE ALL ON TABLE public.onboarding_progress FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.onboarding_progress TO authenticated;

DROP POLICY IF EXISTS onboarding_progress_admin_select ON public.onboarding_progress;
DROP POLICY IF EXISTS onboarding_progress_admin_insert ON public.onboarding_progress;
DROP POLICY IF EXISTS onboarding_progress_admin_update ON public.onboarding_progress;

CREATE POLICY onboarding_progress_admin_select
  ON public.onboarding_progress
  FOR SELECT
  TO authenticated
  USING (public.has_active_approved_admin_membership(organization_id));

CREATE POLICY onboarding_progress_admin_insert
  ON public.onboarding_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_approved_admin_membership(organization_id)
    AND current_step_key = 'organization_info'
    AND completed_at IS NULL
    AND organization_info_confirmed_at IS NULL
    AND organization_info_confirmed_by IS NULL
    AND completed_by IS NULL
    AND (last_actor_user_id IS NULL OR last_actor_user_id = auth.uid())
  );

CREATE POLICY onboarding_progress_admin_update
  ON public.onboarding_progress
  FOR UPDATE
  TO authenticated
  USING (public.has_active_approved_admin_membership(organization_id))
  WITH CHECK (
    public.has_active_approved_admin_membership(organization_id)
    AND (organization_info_confirmed_by IS NULL OR organization_info_confirmed_by = auth.uid())
    AND (completed_by IS NULL OR completed_by = auth.uid())
    AND (last_actor_user_id IS NULL OR last_actor_user_id = auth.uid())
  );

-- ============================================================================
-- 8) Post-migration verification
-- ============================================================================

DO $$
DECLARE
  _duplicate_count INTEGER;
  _rls_enabled BOOLEAN;
BEGIN
  SELECT COUNT(*)
  INTO _duplicate_count
  FROM (
    SELECT organization_id
    FROM public.onboarding_progress
    GROUP BY organization_id
    HAVING COUNT(*) > 1
  ) duplicates;

  IF _duplicate_count <> 0 THEN
    RAISE EXCEPTION 'Migration 013 failed: onboarding_progress still has duplicate organization rows (%).', _duplicate_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'onboarding_progress'
      AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'Migration 013 failed: legacy user_id column still exists on onboarding_progress.';
  END IF;

  SELECT c.relrowsecurity
  INTO _rls_enabled
  FROM pg_class c
  JOIN pg_namespace n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'onboarding_progress';

  IF COALESCE(_rls_enabled, FALSE) IS NOT TRUE THEN
    RAISE EXCEPTION 'Migration 013 failed: onboarding_progress RLS is not enabled.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'onboarding_progress'
      AND policyname = 'onboarding_progress_admin_select'
  ) THEN
    RAISE EXCEPTION 'Migration 013 failed: missing onboarding_progress_admin_select policy.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'onboarding_progress'
      AND column_name = 'current_step_key'
  ) THEN
    RAISE EXCEPTION 'Migration 013 failed: current_step_key column missing.';
  END IF;

  RAISE NOTICE 'Migration 013 verified: onboarding_progress is canonical org-scoped, duplicate-free, and protected by RLS.';
END $$;

COMMIT;
