-- Phase2A Slice O3.1: add employee rank code foundation and extend the roster reset boundary.
-- Keep this migration narrow:
-- - only the nullable employees.rank_code column
-- - preserve the existing single destructive roster reset path
-- - null remains the default-fallback state

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS rank_code TEXT;

COMMENT ON COLUMN employees.rank_code IS 'Nullable employee rank code used for default policy fallback.';

CREATE OR REPLACE FUNCTION public.replace_roster_and_reset_schedule_atomic(
  p_organization_id uuid,
  p_month text,
  p_employees jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  deleted_schedule_id uuid,
  employee_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_employees IS NULL OR jsonb_typeof(p_employees) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;

  SELECT s.id
  INTO deleted_schedule_id
  FROM schedules s
  WHERE s.organization_id = p_organization_id
    AND s.month = p_month
  FOR UPDATE;

  IF FOUND THEN
    PERFORM 1
    FROM schedules s
    WHERE s.id = deleted_schedule_id
      AND s.finalized_version_id IS NOT NULL;

    IF FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
    END IF;

    DELETE FROM schedules
    WHERE id = deleted_schedule_id;
  ELSE
    deleted_schedule_id := NULL;
  END IF;

  DELETE FROM employees
  WHERE organization_id = p_organization_id;

  INSERT INTO employees (
    organization_id,
    employee_id,
    name,
    available_shifts,
    rank_code
  )
  SELECT
    p_organization_id,
    btrim(row.employee_id),
    btrim(row.name),
    COALESCE(row.available_shifts, '[]'::jsonb),
    NULLIF(btrim(row.rank_code), '')
  FROM jsonb_to_recordset(COALESCE(p_employees, '[]'::jsonb)) AS row(
    employee_id text,
    name text,
    available_shifts jsonb,
    rank_code text
  )
  WHERE NULLIF(btrim(row.employee_id), '') IS NOT NULL
    AND NULLIF(btrim(row.name), '') IS NOT NULL;

  GET DIAGNOSTICS employee_count = ROW_COUNT;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_roster_and_reset_schedule_atomic(uuid, text, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.replace_roster_and_reset_schedule_atomic(uuid, text, jsonb)
TO service_role;

REVOKE ALL ON FUNCTION public.mark_schedule_version_solving_start(uuid, uuid, text)
FROM service_role;

REVOKE ALL ON FUNCTION public.apply_solver_result_if_current(
  uuid,
  uuid,
  text,
  jsonb,
  numeric,
  numeric,
  boolean,
  text,
  boolean
)
FROM service_role;

REVOKE ALL ON FUNCTION public.patch_schedule_version_assignments_atomic(uuid, uuid, jsonb)
FROM service_role;

REVOKE ALL ON FUNCTION public.apply_schedule_version_solver_result(
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  text,
  uuid
)
FROM service_role;

CREATE TABLE IF NOT EXISTS organization_rank_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_rank_codes_organization_id_code_key'
  ) THEN
    ALTER TABLE organization_rank_codes
      ADD CONSTRAINT organization_rank_codes_organization_id_code_key
      UNIQUE (organization_id, code);
  END IF;
END $$;

DROP TRIGGER IF EXISTS organization_rank_codes_set_updated_at ON organization_rank_codes;
CREATE TRIGGER organization_rank_codes_set_updated_at
BEFORE UPDATE ON organization_rank_codes
FOR EACH ROW
EXECUTE FUNCTION set_ops_updated_at();

CREATE TABLE IF NOT EXISTS off_request_policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rank_code TEXT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'annual')),
  limit_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'off_request_policy_rules_organization_rank_period_key'
  ) THEN
    ALTER TABLE off_request_policy_rules
      ADD CONSTRAINT off_request_policy_rules_organization_rank_period_key
      UNIQUE (organization_id, rank_code, period_type);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'off_request_policy_rules_organization_rank_code_fkey'
  ) THEN
    ALTER TABLE off_request_policy_rules
      ADD CONSTRAINT off_request_policy_rules_organization_rank_code_fkey
      FOREIGN KEY (organization_id, rank_code)
      REFERENCES organization_rank_codes(organization_id, code)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS off_request_policy_rules_active_rank_period_idx
  ON off_request_policy_rules (organization_id, rank_code, period_type)
  WHERE is_active AND rank_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS off_request_policy_rules_active_default_period_idx
  ON off_request_policy_rules (organization_id, period_type)
  WHERE is_active AND rank_code IS NULL;

DROP TRIGGER IF EXISTS off_request_policy_rules_set_updated_at ON off_request_policy_rules;
CREATE TRIGGER off_request_policy_rules_set_updated_at
BEFORE UPDATE ON off_request_policy_rules
FOR EACH ROW
EXECUTE FUNCTION set_ops_updated_at();

CREATE OR REPLACE FUNCTION public.replace_off_request_policy_setup_atomic(
  p_organization_id uuid,
  p_rank_codes jsonb DEFAULT '[]'::jsonb,
  p_policy_rules jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_rank_codes IS NULL OR jsonb_typeof(p_rank_codes) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;

  IF p_policy_rules IS NULL OR jsonb_typeof(p_policy_rules) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;

  DELETE FROM off_request_policy_rules
  WHERE organization_id = p_organization_id;

  DELETE FROM organization_rank_codes
  WHERE organization_id = p_organization_id;

  INSERT INTO organization_rank_codes (
    id,
    organization_id,
    code,
    label,
    display_order,
    is_active
  )
  SELECT
    COALESCE(NULLIF(btrim(row.id), '')::uuid, gen_random_uuid()),
    p_organization_id,
    btrim(row.code),
    btrim(row.label),
    row.display_order,
    COALESCE(row.is_active, TRUE)
  FROM jsonb_to_recordset(COALESCE(p_rank_codes, '[]'::jsonb)) AS row(
    id text,
    code text,
    label text,
    display_order integer,
    is_active boolean
  )
  WHERE NULLIF(btrim(row.code), '') IS NOT NULL
    AND NULLIF(btrim(row.label), '') IS NOT NULL;

  INSERT INTO off_request_policy_rules (
    id,
    organization_id,
    rank_code,
    period_type,
    limit_count,
    is_active
  )
  SELECT
    COALESCE(NULLIF(btrim(row.id), '')::uuid, gen_random_uuid()),
    p_organization_id,
    NULLIF(btrim(row.rank_code), ''),
    row.period_type,
    row.limit_count,
    COALESCE(row.is_active, TRUE)
  FROM jsonb_to_recordset(COALESCE(p_policy_rules, '[]'::jsonb)) AS row(
    id text,
    rank_code text,
    period_type text,
    limit_count integer,
    is_active boolean
  );
END;
$$;

REVOKE ALL ON FUNCTION public.replace_off_request_policy_setup_atomic(uuid, jsonb, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.replace_off_request_policy_setup_atomic(uuid, jsonb, jsonb)
TO service_role;

ALTER TABLE schedule_preferences
  ADD COLUMN IF NOT EXISTS policy_check_status TEXT;

ALTER TABLE schedule_preferences
  ADD COLUMN IF NOT EXISTS policy_rejection_reason TEXT;

COMMENT ON TABLE organization_rank_codes IS 'Organization-specific rank dictionary for off-request policy matching.';
COMMENT ON TABLE off_request_policy_rules IS 'Organization off-request policy limits with rank-specific and default fallback rules.';
COMMENT ON COLUMN schedule_preferences.policy_check_status IS 'Off-request policy evaluation status for each schedule preference.';
COMMENT ON COLUMN schedule_preferences.policy_rejection_reason IS 'Human-readable policy rejection reason for explainable request rows.';
