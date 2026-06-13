-- Nurse preceptor pairing: employees.preceptor_id + roster replace 2-pass resolve.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS preceptor_id UUID NULL
    REFERENCES public.employees(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.employees.preceptor_id IS
  'Preceptee -> preceptor FK. NULL means no pairing constraint. 1:1 enforced by partial unique index.';

CREATE UNIQUE INDEX IF NOT EXISTS employees_preceptor_id_unique
  ON public.employees (preceptor_id)
  WHERE preceptor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_preceptor_id
  ON public.employees (preceptor_id)
  WHERE preceptor_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.has_overlapping_work_shifts(
  p_left_shifts jsonb,
  p_right_shifts jsonb
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(COALESCE(p_left_shifts, '[]'::jsonb)) AS left_shift(value)
    JOIN jsonb_array_elements_text(COALESCE(p_right_shifts, '[]'::jsonb)) AS right_shift(value)
      ON upper(btrim(left_shift.value)) = upper(btrim(right_shift.value))
    WHERE upper(btrim(left_shift.value)) <> 'O'
      AND btrim(left_shift.value) <> ''
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_roster_preceptor_assignments(
  p_employees jsonb
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  duplicate_preceptor_id text;
  chain_employee_id text;
  missing_preceptor_id text;
  shift_overlap_employee_id text;
  self_assignment_employee_id text;
BEGIN
  IF p_employees IS NULL OR jsonb_typeof(p_employees) <> 'array' THEN
    RETURN;
  END IF;

  SELECT assignment.employee_id
  INTO self_assignment_employee_id
  FROM (
    SELECT
      btrim(row.employee_id) AS employee_id,
      NULLIF(btrim(row.preceptor_employee_id), '') AS preceptor_employee_id
    FROM jsonb_to_recordset(p_employees) AS row(
      employee_id text,
      name text,
      available_shifts jsonb,
      rank_code text,
      preceptor_employee_id text
    )
    WHERE NULLIF(btrim(row.employee_id), '') IS NOT NULL
      AND NULLIF(btrim(row.name), '') IS NOT NULL
  ) AS assignment
  WHERE assignment.preceptor_employee_id IS NOT NULL
    AND assignment.employee_id = assignment.preceptor_employee_id
  LIMIT 1;

  IF self_assignment_employee_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;

  SELECT assignment.preceptor_employee_id
  INTO duplicate_preceptor_id
  FROM (
    SELECT
      NULLIF(btrim(row.preceptor_employee_id), '') AS preceptor_employee_id
    FROM jsonb_to_recordset(p_employees) AS row(
      employee_id text,
      name text,
      available_shifts jsonb,
      rank_code text,
      preceptor_employee_id text
    )
    WHERE NULLIF(btrim(row.employee_id), '') IS NOT NULL
      AND NULLIF(btrim(row.name), '') IS NOT NULL
  ) AS assignment
  WHERE assignment.preceptor_employee_id IS NOT NULL
  GROUP BY assignment.preceptor_employee_id
  HAVING COUNT(*) > 1
  LIMIT 1;

  IF duplicate_preceptor_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;

  SELECT assignment_a.employee_id
  INTO chain_employee_id
  FROM (
    SELECT
      btrim(row.employee_id) AS employee_id,
      NULLIF(btrim(row.preceptor_employee_id), '') AS preceptor_employee_id
    FROM jsonb_to_recordset(p_employees) AS row(
      employee_id text,
      name text,
      available_shifts jsonb,
      rank_code text,
      preceptor_employee_id text
    )
    WHERE NULLIF(btrim(row.employee_id), '') IS NOT NULL
      AND NULLIF(btrim(row.name), '') IS NOT NULL
  ) AS assignment_a
  JOIN (
    SELECT
      btrim(row.employee_id) AS employee_id,
      NULLIF(btrim(row.preceptor_employee_id), '') AS preceptor_employee_id
    FROM jsonb_to_recordset(p_employees) AS row(
      employee_id text,
      name text,
      available_shifts jsonb,
      rank_code text,
      preceptor_employee_id text
    )
    WHERE NULLIF(btrim(row.employee_id), '') IS NOT NULL
      AND NULLIF(btrim(row.name), '') IS NOT NULL
  ) AS assignment_b
    ON assignment_a.preceptor_employee_id = assignment_b.employee_id
   AND assignment_b.preceptor_employee_id = assignment_a.employee_id
  WHERE assignment_a.preceptor_employee_id IS NOT NULL
  LIMIT 1;

  IF chain_employee_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;

  SELECT assignment.employee_id
  INTO missing_preceptor_id
  FROM (
    SELECT
      btrim(row.employee_id) AS employee_id,
      NULLIF(btrim(row.preceptor_employee_id), '') AS preceptor_employee_id
    FROM jsonb_to_recordset(p_employees) AS row(
      employee_id text,
      name text,
      available_shifts jsonb,
      rank_code text,
      preceptor_employee_id text
    )
    WHERE NULLIF(btrim(row.employee_id), '') IS NOT NULL
      AND NULLIF(btrim(row.name), '') IS NOT NULL
  ) AS assignment
  WHERE assignment.preceptor_employee_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(p_employees) AS preceptor_row(
        employee_id text,
        name text,
        available_shifts jsonb,
        rank_code text,
        preceptor_employee_id text
      )
      WHERE btrim(preceptor_row.employee_id) = assignment.preceptor_employee_id
        AND NULLIF(btrim(preceptor_row.name), '') IS NOT NULL
    )
  LIMIT 1;

  IF missing_preceptor_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = format('프리셉터 직번 ''%s''를 찾을 수 없습니다.', missing_preceptor_id);
  END IF;

  SELECT assignment.employee_id
  INTO shift_overlap_employee_id
  FROM (
    SELECT
      btrim(row.employee_id) AS employee_id,
      NULLIF(btrim(row.preceptor_employee_id), '') AS preceptor_employee_id,
      COALESCE(row.available_shifts, '[]'::jsonb) AS available_shifts
    FROM jsonb_to_recordset(p_employees) AS row(
      employee_id text,
      name text,
      available_shifts jsonb,
      rank_code text,
      preceptor_employee_id text
    )
    WHERE NULLIF(btrim(row.employee_id), '') IS NOT NULL
      AND NULLIF(btrim(row.name), '') IS NOT NULL
  ) AS assignment
  JOIN (
    SELECT
      btrim(row.employee_id) AS employee_id,
      COALESCE(row.available_shifts, '[]'::jsonb) AS available_shifts
    FROM jsonb_to_recordset(p_employees) AS row(
      employee_id text,
      name text,
      available_shifts jsonb,
      rank_code text,
      preceptor_employee_id text
    )
    WHERE NULLIF(btrim(row.employee_id), '') IS NOT NULL
      AND NULLIF(btrim(row.name), '') IS NOT NULL
  ) AS preceptor
    ON preceptor.employee_id = assignment.preceptor_employee_id
  WHERE assignment.preceptor_employee_id IS NOT NULL
    AND NOT public.has_overlapping_work_shifts(assignment.available_shifts, preceptor.available_shifts)
  LIMIT 1;

  IF shift_overlap_employee_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_roster_preceptor_ids(
  p_organization_id uuid,
  p_employees jsonb
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  missing_preceptor_id text;
BEGIN
  UPDATE public.employees AS preceptee
  SET preceptor_id = preceptor.id
  FROM jsonb_to_recordset(COALESCE(p_employees, '[]'::jsonb)) AS row(
    employee_id text,
    name text,
    available_shifts jsonb,
    rank_code text,
    preceptor_employee_id text
  )
  JOIN public.employees AS preceptor
    ON preceptor.organization_id = p_organization_id
   AND preceptor.employee_id = btrim(row.preceptor_employee_id)
  WHERE preceptee.organization_id = p_organization_id
    AND preceptee.employee_id = btrim(row.employee_id)
    AND NULLIF(btrim(row.preceptor_employee_id), '') IS NOT NULL;

  SELECT btrim(row.preceptor_employee_id)
  INTO missing_preceptor_id
  FROM jsonb_to_recordset(COALESCE(p_employees, '[]'::jsonb)) AS row(
    employee_id text,
    name text,
    available_shifts jsonb,
    rank_code text,
    preceptor_employee_id text
  )
  JOIN public.employees AS preceptee
    ON preceptee.organization_id = p_organization_id
   AND preceptee.employee_id = btrim(row.employee_id)
  WHERE NULLIF(btrim(row.preceptor_employee_id), '') IS NOT NULL
    AND preceptee.preceptor_id IS NULL
  LIMIT 1;

  IF missing_preceptor_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = format('프리셉터 직번 ''%s''를 찾을 수 없습니다.', missing_preceptor_id);
  END IF;
END;
$$;

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
  inserted_employee_count integer;
BEGIN
  IF p_employees IS NULL OR jsonb_typeof(p_employees) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;

  PERFORM public.validate_roster_preceptor_assignments(p_employees);

  SELECT o.id
  INTO locked_organization_id
  FROM public.organizations o
  WHERE o.id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'organization_not_found';
  END IF;

  DELETE FROM public.employees
  WHERE organization_id = locked_organization_id;

  INSERT INTO public.employees (
    organization_id,
    employee_id,
    name,
    available_shifts,
    rank_code,
    preceptor_id
  )
  SELECT
    locked_organization_id,
    btrim(row.employee_id),
    btrim(row.name),
    COALESCE(row.available_shifts, '[]'::jsonb),
    NULLIF(btrim(row.rank_code), ''),
    NULL::uuid
  FROM jsonb_to_recordset(COALESCE(p_employees, '[]'::jsonb)) AS row(
    employee_id text,
    name text,
    available_shifts jsonb,
    rank_code text,
    preceptor_employee_id text
  )
  WHERE NULLIF(btrim(row.employee_id), '') IS NOT NULL
    AND NULLIF(btrim(row.name), '') IS NOT NULL;

  GET DIAGNOSTICS inserted_employee_count = ROW_COUNT;

  PERFORM public.resolve_roster_preceptor_ids(locked_organization_id, p_employees);

  employee_count := inserted_employee_count;
  RETURN NEXT;
END;
$$;

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
DECLARE
  inserted_employee_count integer;
BEGIN
  IF p_employees IS NULL OR jsonb_typeof(p_employees) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;

  PERFORM public.validate_roster_preceptor_assignments(p_employees);

  SELECT s.id
  INTO deleted_schedule_id
  FROM public.schedules s
  WHERE s.organization_id = p_organization_id
    AND s.month = p_month
  FOR UPDATE;

  IF FOUND THEN
    PERFORM 1
    FROM public.schedules s
    WHERE s.id = deleted_schedule_id
      AND s.finalized_version_id IS NOT NULL;

    IF FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
    END IF;

    DELETE FROM public.schedules
    WHERE id = deleted_schedule_id;
  ELSE
    deleted_schedule_id := NULL;
  END IF;

  DELETE FROM public.employees
  WHERE organization_id = p_organization_id;

  INSERT INTO public.employees (
    organization_id,
    employee_id,
    name,
    available_shifts,
    rank_code,
    preceptor_id
  )
  SELECT
    p_organization_id,
    btrim(row.employee_id),
    btrim(row.name),
    COALESCE(row.available_shifts, '[]'::jsonb),
    NULLIF(btrim(row.rank_code), ''),
    NULL::uuid
  FROM jsonb_to_recordset(COALESCE(p_employees, '[]'::jsonb)) AS row(
    employee_id text,
    name text,
    available_shifts jsonb,
    rank_code text,
    preceptor_employee_id text
  )
  WHERE NULLIF(btrim(row.employee_id), '') IS NOT NULL
    AND NULLIF(btrim(row.name), '') IS NOT NULL;

  GET DIAGNOSTICS inserted_employee_count = ROW_COUNT;

  PERFORM public.resolve_roster_preceptor_ids(p_organization_id, p_employees);

  employee_count := inserted_employee_count;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.has_overlapping_work_shifts(jsonb, jsonb)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.validate_roster_preceptor_assignments(jsonb)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.resolve_roster_preceptor_ids(uuid, jsonb)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.replace_organization_roster_atomic(uuid, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.replace_organization_roster_atomic(uuid, jsonb)
TO service_role;

REVOKE ALL ON FUNCTION public.replace_roster_and_reset_schedule_atomic(uuid, text, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.replace_roster_and_reset_schedule_atomic(uuid, text, jsonb)
TO service_role;
