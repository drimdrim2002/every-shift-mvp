DROP FUNCTION IF EXISTS public.overwrite_schedule_version_atomic(uuid, uuid, text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.overwrite_schedule_version_atomic(
  p_schedule_id uuid,
  p_overwrite_version_id uuid,
  p_name text,
  p_source_type text DEFAULT 're_solve',
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
  v_target_source_type text;
  v_target_base_version_id uuid;
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
    sv.source_type,
    sv.base_version_id,
    sv.archived_at,
    sv.active_solver_execution_id
  INTO
    v_target_status,
    v_target_source_type,
    v_target_base_version_id,
    v_target_archived_at,
    v_target_active_solver_execution_id
  FROM schedule_versions sv
  WHERE sv.id = p_overwrite_version_id
    AND sv.schedule_id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  IF v_target_archived_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_archived';
  END IF;

  IF v_target_status = 'finalized' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_finalized';
  END IF;

  IF v_target_status = 'solving' OR v_target_active_solver_execution_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_solving';
  END IF;

  IF v_target_status IS DISTINCT FROM 'solve_failed'
    AND NOT (
      p_source_type = 'initial_solve'
      AND v_target_status = 'draft'
      AND v_target_source_type = 'initial_solve'
      AND v_target_base_version_id IS NULL
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_solve_failed';
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

REVOKE ALL ON FUNCTION public.overwrite_schedule_version_atomic(uuid, uuid, text, text, jsonb, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.overwrite_schedule_version_atomic(uuid, uuid, text, text, jsonb, jsonb)
TO service_role;
