CREATE OR REPLACE FUNCTION public.reset_schedule_generated_results_atomic(
  p_schedule_id uuid,
  p_source_version_id uuid,
  p_reset_by uuid DEFAULT NULL
)
RETURNS TABLE (
  schedule_id uuid,
  source_version_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month text;
  v_month_start date;
  v_month_end_exclusive date;
  v_source_status text;
  v_source_archived_at timestamptz;
  v_finalized_version_id uuid;
BEGIN
  SELECT s.month, s.finalized_version_id
  INTO v_month, v_finalized_version_id
  FROM schedules s
  WHERE s.id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'schedule_not_found';
  END IF;

  SELECT sv.status, sv.archived_at
  INTO v_source_status, v_source_archived_at
  FROM schedule_versions sv
  WHERE sv.id = p_source_version_id
    AND sv.schedule_id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  IF v_source_archived_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_archived';
  END IF;

  IF v_finalized_version_id IS NOT NULL OR v_source_status = 'finalized' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
  END IF;

  PERFORM 1
  FROM schedule_versions sv
  WHERE sv.schedule_id = p_schedule_id
    AND sv.archived_at IS NULL
    AND (sv.status = 'solving' OR sv.active_solver_execution_id IS NOT NULL)
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_locked_for_solving';
  END IF;

  v_month_start := to_date(v_month || '-01', 'YYYY-MM-DD');
  v_month_end_exclusive := (v_month_start + INTERVAL '1 month')::date;

  DELETE FROM schedule_assignments sa
  WHERE sa.schedule_version_id = p_source_version_id
    AND sa.date >= v_month_start
    AND sa.date < v_month_end_exclusive;

  UPDATE schedule_preferences sp
  SET
    resolution_status = 'pending',
    resolved_shift_id = NULL,
    resolved_at = NULL,
    updated_at = now()
  WHERE sp.schedule_version_id = p_source_version_id
    AND sp.date >= v_month_start
    AND sp.date < v_month_end_exclusive;

  UPDATE schedule_versions sv
  SET
    status = 'draft',
    latest_evaluation_id = NULL,
    active_solver_execution_id = NULL,
    current_revision = 0,
    manual_edit_count = 0,
    updated_at = now()
  WHERE sv.id = p_source_version_id
    AND sv.schedule_id = p_schedule_id;

  UPDATE schedules s
  SET
    selected_version_id = COALESCE(s.selected_version_id, p_source_version_id),
    status = 'created',
    solver_execution_id = NULL,
    hard_score = NULL,
    soft_score = NULL,
    updated_at = now()
  WHERE s.id = p_schedule_id;

  schedule_id := p_schedule_id;
  source_version_id := p_source_version_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_schedule_generated_results_atomic(uuid, uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reset_schedule_generated_results_atomic(uuid, uuid, uuid)
TO service_role;

CREATE OR REPLACE FUNCTION public.reset_schedule_all_generated_results_atomic(
  p_schedule_id uuid,
  p_reset_by uuid DEFAULT NULL
)
RETURNS TABLE (
  schedule_id uuid,
  reset_version_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month text;
  v_month_start date;
  v_month_end_exclusive date;
  v_finalized_version_id uuid;
BEGIN
  SELECT s.month, s.finalized_version_id
  INTO v_month, v_finalized_version_id
  FROM schedules s
  WHERE s.id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'schedule_not_found';
  END IF;

  IF v_finalized_version_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
  END IF;

  PERFORM 1
  FROM schedule_versions sv
  WHERE sv.schedule_id = p_schedule_id
    AND sv.archived_at IS NULL
    AND (sv.status = 'solving' OR sv.active_solver_execution_id IS NOT NULL)
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_locked_for_solving';
  END IF;

  v_month_start := to_date(v_month || '-01', 'YYYY-MM-DD');
  v_month_end_exclusive := (v_month_start + INTERVAL '1 month')::date;

  WITH active_versions AS (
    SELECT sv.id
    FROM schedule_versions sv
    WHERE sv.schedule_id = p_schedule_id
      AND sv.archived_at IS NULL
      AND sv.status <> 'finalized'
    FOR UPDATE
  ),
  deleted_assignments AS (
    DELETE FROM schedule_assignments sa
    USING active_versions av
    WHERE sa.schedule_version_id = av.id
      AND sa.date >= v_month_start
      AND sa.date < v_month_end_exclusive
    RETURNING sa.schedule_version_id
  ),
  reset_preferences AS (
    UPDATE schedule_preferences sp
    SET
      resolution_status = 'pending',
      resolved_shift_id = NULL,
      resolved_at = NULL,
      updated_at = now()
    FROM active_versions av
    WHERE sp.schedule_version_id = av.id
      AND sp.date >= v_month_start
      AND sp.date < v_month_end_exclusive
    RETURNING sp.schedule_version_id
  ),
  reset_versions AS (
    UPDATE schedule_versions sv
    SET
      status = 'draft',
      latest_evaluation_id = NULL,
      active_solver_execution_id = NULL,
      current_revision = 0,
      manual_edit_count = 0,
      updated_at = now()
    FROM active_versions av
    WHERE sv.id = av.id
    RETURNING sv.id
  )
  SELECT count(*)::integer INTO reset_version_count FROM reset_versions;

  UPDATE schedules s
  SET
    status = 'created',
    solver_execution_id = NULL,
    hard_score = NULL,
    soft_score = NULL,
    updated_at = now()
  WHERE s.id = p_schedule_id;

  schedule_id := p_schedule_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_schedule_all_generated_results_atomic(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reset_schedule_all_generated_results_atomic(uuid, uuid)
TO service_role;
