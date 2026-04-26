-- Phase2A Slice O3.2: add an org-level atomic roster replace boundary for
-- Step3 setup-mode saves without touching the month-scoped schedule reset flow.

CREATE OR REPLACE FUNCTION public.replace_organization_roster_atomic(
  p_organization_id uuid,
  p_employees jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  employee_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked_organization_id uuid;
BEGIN
  IF p_employees IS NULL OR jsonb_typeof(p_employees) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;

  SELECT o.id
  INTO locked_organization_id
  FROM organizations o
  WHERE o.id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'organization_not_found';
  END IF;

  DELETE FROM employees
  WHERE organization_id = locked_organization_id;

  INSERT INTO employees (
    organization_id,
    employee_id,
    name,
    available_shifts,
    rank_code
  )
  SELECT
    locked_organization_id,
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

REVOKE ALL ON FUNCTION public.replace_organization_roster_atomic(uuid, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.replace_organization_roster_atomic(uuid, jsonb)
TO service_role;
