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
