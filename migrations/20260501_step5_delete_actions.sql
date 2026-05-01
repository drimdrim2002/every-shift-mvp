ALTER TABLE public.schedule_versions
  DROP CONSTRAINT IF EXISTS schedule_versions_archive_reason_check;

ALTER TABLE public.schedule_versions
  ADD CONSTRAINT schedule_versions_archive_reason_check
  CHECK (
    archive_reason IS NULL
    OR archive_reason IN ('month_reset', 'version_delete', 'generated_results_reset')
  );

CREATE OR REPLACE FUNCTION public.archive_schedule_version_atomic(
  p_version_id uuid,
  p_replacement_selected_version_id uuid DEFAULT NULL,
  p_archived_by uuid DEFAULT NULL
)
RETURNS TABLE (
  schedule_id uuid,
  archived_version_id uuid,
  selected_version_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_status text;
  v_target_archived_at timestamptz;
  v_schedule_selected_version_id uuid;
  v_finalized_version_id uuid;
  v_active_version_count integer;
  v_replacement_selected_version_id uuid;
BEGIN
  SELECT
    sv.schedule_id,
    sv.status,
    sv.archived_at,
    s.selected_version_id,
    s.finalized_version_id
  INTO
    schedule_id,
    v_target_status,
    v_target_archived_at,
    v_schedule_selected_version_id,
    v_finalized_version_id
  FROM schedule_versions sv
  JOIN schedules s ON s.id = sv.schedule_id
  WHERE sv.id = p_version_id
  FOR UPDATE OF s, sv;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  archived_version_id := p_version_id;

  IF v_target_archived_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_archived';
  END IF;

  IF v_finalized_version_id IS NOT NULL OR v_target_status = 'finalized' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
  END IF;

  PERFORM 1
  FROM schedule_versions sibling
  WHERE sibling.schedule_id = schedule_id
    AND sibling.archived_at IS NULL
    AND (sibling.status = 'solving' OR sibling.active_solver_execution_id IS NOT NULL)
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_locked_for_solving';
  END IF;

  SELECT count(*)
  INTO v_active_version_count
  FROM schedule_versions sibling
  WHERE sibling.schedule_id = schedule_id
    AND sibling.archived_at IS NULL;

  IF v_active_version_count <= 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'last_version';
  END IF;

  selected_version_id := v_schedule_selected_version_id;

  IF v_schedule_selected_version_id = p_version_id THEN
    IF p_replacement_selected_version_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'replacement_selected_version_required';
    END IF;

    SELECT sibling.id
    INTO v_replacement_selected_version_id
    FROM schedule_versions sibling
    WHERE sibling.id = p_replacement_selected_version_id
      AND sibling.schedule_id = schedule_id
      AND sibling.archived_at IS NULL
      AND sibling.id <> p_version_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'replacement_selected_version_invalid';
    END IF;

    selected_version_id := v_replacement_selected_version_id;
  END IF;

  UPDATE schedule_versions sv
  SET
    archived_at = now(),
    archived_by = p_archived_by,
    archive_reason = 'version_delete',
    active_solver_execution_id = NULL,
    updated_at = now()
  WHERE sv.id = p_version_id;

  IF v_schedule_selected_version_id = p_version_id THEN
    UPDATE schedules s
    SET
      selected_version_id = v_replacement_selected_version_id,
      updated_at = now()
    WHERE s.id = schedule_id;
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_schedule_version_atomic(uuid, uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.archive_schedule_version_atomic(uuid, uuid, uuid)
TO service_role;

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
  SELECT
    s.month,
    s.finalized_version_id
  INTO
    v_month,
    v_finalized_version_id
  FROM schedules s
  WHERE s.id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'schedule_not_found';
  END IF;

  SELECT
    sv.status,
    sv.archived_at
  INTO
    v_source_status,
    v_source_archived_at
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

  UPDATE schedule_versions sv
  SET
    archived_at = now(),
    archived_by = p_reset_by,
    archive_reason = 'generated_results_reset',
    active_solver_execution_id = NULL,
    updated_at = now()
  WHERE sv.schedule_id = p_schedule_id
    AND sv.id <> p_source_version_id
    AND sv.archived_at IS NULL
    AND sv.status <> 'finalized';

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
    selected_version_id = p_source_version_id,
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
