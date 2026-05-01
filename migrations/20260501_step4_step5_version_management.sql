-- Step4/Step5 version-management SQL authority.
--
-- Enforce normalized version names at the database layer and persist the
-- create-version input snapshot through the atomic write path.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.schedule_versions
    WHERE name IS NOT NULL
      AND btrim(name) <> ''
    GROUP BY schedule_id, lower(btrim(name))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'duplicate_version_names',
      DETAIL = 'Schedule versions contain duplicate normalized names, including archived versions. Resolve duplicates before applying this migration.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_versions_name_normalized_unique
ON public.schedule_versions (schedule_id, lower(btrim(name)))
WHERE name IS NOT NULL
  AND btrim(name) <> '';

DO $$
BEGIN
  IF to_regprocedure('public.create_schedule_version_atomic(uuid, uuid, text, text, jsonb, uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.create_schedule_version_atomic(uuid, uuid, text, text, jsonb, uuid)
    FROM PUBLIC, anon, authenticated;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.create_schedule_version_atomic(uuid, uuid, text, text, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.create_schedule_version_atomic(
  p_schedule_id uuid,
  p_base_version_id uuid,
  p_name text DEFAULT NULL,
  p_source_type text DEFAULT 're_solve',
  p_input_diff_summary jsonb DEFAULT '{}'::jsonb,
  p_input_snapshot jsonb DEFAULT '{}'::jsonb,
  p_created_by uuid DEFAULT NULL
)
RETURNS TABLE (
  schedule_id uuid,
  created_version_id uuid,
  selected_version_id uuid,
  finalized_version_id uuid,
  latest_version_no integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_version_no integer;
BEGIN
  SELECT
    s.selected_version_id,
    s.finalized_version_id,
    COALESCE(s.latest_version_no, 0) + 1
  INTO
    selected_version_id,
    finalized_version_id,
    v_next_version_no
  FROM schedules s
  WHERE s.id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'schedule_not_found';
  END IF;

  IF finalized_version_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
  END IF;

  PERFORM 1
  FROM schedule_versions sv
  WHERE sv.id = p_base_version_id
    AND sv.schedule_id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  INSERT INTO schedule_versions (
    schedule_id,
    version_no,
    name,
    source_type,
    base_version_id,
    current_revision,
    status,
    input_diff_summary,
    input_snapshot,
    manual_edit_count,
    latest_evaluation_id,
    active_solver_execution_id,
    created_by
  )
  VALUES (
    p_schedule_id,
    v_next_version_no,
    p_name,
    p_source_type,
    p_base_version_id,
    0,
    'draft',
    COALESCE(p_input_diff_summary, '{}'::jsonb),
    COALESCE(p_input_snapshot, '{}'::jsonb),
    0,
    NULL,
    NULL,
    p_created_by
  )
  RETURNING id INTO created_version_id;

  INSERT INTO schedule_preferences (
    schedule_id,
    schedule_version_id,
    employee_id,
    date,
    request_code,
    request_note,
    is_soft,
    resolution_status,
    resolved_shift_id,
    resolved_at,
    request_source
  )
  SELECT
    sp.schedule_id,
    created_version_id,
    sp.employee_id,
    sp.date,
    sp.request_code,
    sp.request_note,
    sp.is_soft,
    sp.resolution_status,
    sp.resolved_shift_id,
    sp.resolved_at,
    COALESCE(sp.request_source, 'employee_off')
  FROM schedule_preferences sp
  WHERE sp.schedule_version_id = p_base_version_id;

  INSERT INTO schedule_assignments (
    schedule_id,
    schedule_version_id,
    employee_id,
    shift_id,
    date,
    is_locked,
    off_reason,
    comment,
    edited_by,
    edited_at
  )
  SELECT
    sa.schedule_id,
    created_version_id,
    sa.employee_id,
    sa.shift_id,
    sa.date,
    TRUE,
    sa.off_reason,
    sa.comment,
    sa.edited_by,
    sa.edited_at
  FROM schedule_assignments sa
  WHERE sa.schedule_version_id = p_base_version_id
    AND sa.is_locked IS TRUE;

  UPDATE schedules s
  SET
    latest_version_no = v_next_version_no,
    updated_at = now()
  WHERE s.id = p_schedule_id;

  schedule_id := p_schedule_id;
  latest_version_no := v_next_version_no;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_schedule_version_atomic(uuid, uuid, text, text, jsonb, jsonb, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_schedule_version_atomic(uuid, uuid, text, text, jsonb, jsonb, uuid)
TO service_role;

DROP FUNCTION IF EXISTS public.overwrite_schedule_version_atomic(uuid, uuid, text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.overwrite_schedule_version_atomic(
  p_schedule_id uuid,
  p_overwrite_version_id uuid,
  p_name text,
  p_input_diff_summary jsonb DEFAULT '{}'::jsonb,
  p_input_snapshot jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  schedule_id uuid,
  overwritten_version_id uuid,
  selected_version_id uuid,
  finalized_version_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date;
  v_month_end_exclusive date;
  v_target_status text;
  v_target_archived_at timestamptz;
  v_target_active_solver_execution_id text;
BEGIN
  SELECT
    s.selected_version_id,
    s.finalized_version_id,
    (s.month || '-01')::date
  INTO
    selected_version_id,
    finalized_version_id,
    v_month_start
  FROM schedules s
  WHERE s.id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'schedule_not_found';
  END IF;

  IF finalized_version_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
  END IF;

  SELECT
    sv.status,
    sv.archived_at,
    sv.active_solver_execution_id
  INTO
    v_target_status,
    v_target_archived_at,
    v_target_active_solver_execution_id
  FROM schedule_versions sv
  WHERE sv.id = p_overwrite_version_id
    AND sv.schedule_id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  IF v_target_status = 'finalized' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_finalized';
  END IF;

  IF v_target_status = 'solving' OR v_target_active_solver_execution_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_solving';
  END IF;

  IF v_target_archived_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_archived';
  END IF;

  PERFORM 1
  FROM schedule_versions sv
  WHERE sv.schedule_id = p_schedule_id
    AND sv.archived_at IS NULL
    AND (sv.status = 'solving' OR sv.active_solver_execution_id IS NOT NULL)
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'another_version_solving';
  END IF;

  v_month_end_exclusive := (v_month_start + INTERVAL '1 month')::date;

  DELETE FROM schedule_assignments sa
  WHERE sa.schedule_version_id = p_overwrite_version_id
    AND sa.date >= v_month_start
    AND sa.date < v_month_end_exclusive;

  UPDATE schedule_versions sv
  SET
    active_solver_execution_id = NULL,
    latest_evaluation_id = NULL,
    status = 'draft',
    current_revision = 0,
    manual_edit_count = 0,
    name = p_name,
    input_diff_summary = COALESCE(p_input_diff_summary, '{}'::jsonb),
    input_snapshot = COALESCE(p_input_snapshot, '{}'::jsonb)
  WHERE sv.id = p_overwrite_version_id
    AND sv.schedule_id = p_schedule_id;

  UPDATE schedules s
  SET updated_at = now()
  WHERE s.id = p_schedule_id;

  schedule_id := p_schedule_id;
  overwritten_version_id := p_overwrite_version_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.overwrite_schedule_version_atomic(uuid, uuid, text, jsonb, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.overwrite_schedule_version_atomic(uuid, uuid, text, jsonb, jsonb)
TO service_role;
