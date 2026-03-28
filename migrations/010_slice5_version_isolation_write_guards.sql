-- Slice 5 / Step5 version isolation write guards
-- Authoritative write ownership is enforced on schedule_versions:
--   - running ownership: status='solving' + active_solver_execution_id
--   - manual save guard: selected version only, never while solving

CREATE OR REPLACE FUNCTION mark_schedule_version_solving_start(
  p_schedule_id UUID,
  p_schedule_version_id UUID,
  p_execution_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_selected_version_id UUID;
  v_conflicting_version_id UUID;
  v_current_execution_id TEXT;
BEGIN
  IF p_execution_id IS NULL OR btrim(p_execution_id) = '' THEN
    RAISE EXCEPTION USING MESSAGE = 'missing_solver_execution_id';
  END IF;

  SELECT selected_version_id
    INTO v_selected_version_id
  FROM schedules
  WHERE id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'missing_schedule';
  END IF;

  IF v_selected_version_id IS DISTINCT FROM p_schedule_version_id THEN
    RAISE EXCEPTION USING MESSAGE = 'invalid_selection_state';
  END IF;

  SELECT active_solver_execution_id
    INTO v_current_execution_id
  FROM schedule_versions
  WHERE schedule_id = p_schedule_id
    AND id = p_schedule_version_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'missing_version';
  END IF;

  SELECT id
    INTO v_conflicting_version_id
  FROM schedule_versions
  WHERE schedule_id = p_schedule_id
    AND id <> p_schedule_version_id
    AND status = 'solving'
  LIMIT 1
  FOR UPDATE;

  IF v_conflicting_version_id IS NOT NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'another_version_solving';
  END IF;

  IF v_current_execution_id IS NOT NULL AND v_current_execution_id <> p_execution_id THEN
    RAISE EXCEPTION USING MESSAGE = 'another_version_solving';
  END IF;

  UPDATE schedule_versions
  SET status = 'solving',
      active_solver_execution_id = p_execution_id,
      updated_at = NOW()
  WHERE schedule_id = p_schedule_id
    AND id = p_schedule_version_id;

  UPDATE schedules
  SET status = 'running',
      solver_execution_id = p_execution_id,
      updated_at = NOW()
  WHERE id = p_schedule_id;
END;
$$;

CREATE OR REPLACE FUNCTION apply_solver_result_if_current(
  p_schedule_id UUID,
  p_schedule_version_id UUID,
  p_execution_id TEXT,
  p_assignments JSONB DEFAULT '[]'::jsonb,
  p_hard_score NUMERIC DEFAULT NULL,
  p_soft_score NUMERIC DEFAULT NULL,
  p_is_final BOOLEAN DEFAULT FALSE,
  p_final_status TEXT DEFAULT NULL,
  p_replace_assignments BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_version_status TEXT;
  v_active_execution_id TEXT;
  v_final_status TEXT;
BEGIN
  IF p_execution_id IS NULL OR btrim(p_execution_id) = '' THEN
    RAISE EXCEPTION USING MESSAGE = 'missing_solver_execution_id';
  END IF;

  SELECT status, active_solver_execution_id
    INTO v_version_status, v_active_execution_id
  FROM schedule_versions
  WHERE schedule_id = p_schedule_id
    AND id = p_schedule_version_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'missing_version';
  END IF;

  IF v_version_status <> 'solving'
     OR v_active_execution_id IS NULL
     OR v_active_execution_id <> p_execution_id THEN
    RAISE EXCEPTION USING MESSAGE = 'stale_solver_callback';
  END IF;

  IF p_replace_assignments THEN
    IF p_assignments IS NULL OR jsonb_typeof(p_assignments) <> 'array' THEN
      RAISE EXCEPTION USING MESSAGE = 'bad_request';
    END IF;

    DELETE FROM schedule_assignments
    WHERE schedule_id = p_schedule_id
      AND schedule_version_id = p_schedule_version_id;

    INSERT INTO schedule_assignments (
      schedule_id,
      schedule_version_id,
      employee_id,
      shift_id,
      date,
      is_locked,
      off_reason,
      comment,
      edited_at
    )
    SELECT
      p_schedule_id,
      p_schedule_version_id,
      row.employee_id,
      row.shift_id,
      row.date,
      COALESCE(row.is_locked, FALSE),
      row.off_reason,
      row.comment,
      NOW()
    FROM jsonb_to_recordset(COALESCE(p_assignments, '[]'::jsonb)) AS row(
      employee_id UUID,
      date DATE,
      shift_id UUID,
      is_locked BOOLEAN,
      comment TEXT,
      off_reason TEXT
    )
    WHERE row.employee_id IS NOT NULL
      AND row.date IS NOT NULL
      AND row.shift_id IS NOT NULL
    ON CONFLICT (schedule_version_id, employee_id, date)
    DO UPDATE
      SET shift_id = EXCLUDED.shift_id,
          is_locked = EXCLUDED.is_locked,
          off_reason = EXCLUDED.off_reason,
          comment = EXCLUDED.comment,
          edited_at = NOW();
  END IF;

  IF p_is_final THEN
    v_final_status := COALESCE(p_final_status, 'review_ready');
    IF v_final_status NOT IN ('review_ready', 'review_blocked', 'solve_failed') THEN
      RAISE EXCEPTION USING MESSAGE = 'invalid_solver_final_status';
    END IF;

    UPDATE schedule_versions
    SET status = v_final_status,
        active_solver_execution_id = NULL,
        updated_at = NOW()
    WHERE schedule_id = p_schedule_id
      AND id = p_schedule_version_id;

    UPDATE schedules
    SET status = CASE
                   WHEN v_final_status = 'solve_failed' THEN 'error'
                   ELSE 'complete'
                 END,
        solver_execution_id = NULL,
        hard_score = COALESCE(p_hard_score, hard_score),
        soft_score = COALESCE(p_soft_score, soft_score),
        updated_at = NOW()
    WHERE id = p_schedule_id;
  ELSE
    UPDATE schedules
    SET status = 'running',
        solver_execution_id = p_execution_id,
        hard_score = COALESCE(p_hard_score, hard_score),
        soft_score = COALESCE(p_soft_score, soft_score),
        updated_at = NOW()
    WHERE id = p_schedule_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION patch_schedule_version_assignments_atomic(
  p_schedule_id UUID,
  p_schedule_version_id UUID,
  p_changes JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_selected_version_id UUID;
  v_version_status TEXT;
  v_active_execution_id TEXT;
  v_change_count INTEGER;
BEGIN
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'array' THEN
    RAISE EXCEPTION USING MESSAGE = 'bad_request';
  END IF;

  v_change_count := jsonb_array_length(p_changes);
  IF v_change_count = 0 THEN
    RETURN;
  END IF;

  SELECT selected_version_id
    INTO v_selected_version_id
  FROM schedules
  WHERE id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'missing_schedule';
  END IF;

  IF v_selected_version_id IS DISTINCT FROM p_schedule_version_id THEN
    RAISE EXCEPTION USING MESSAGE = 'invalid_selection_state';
  END IF;

  SELECT status, active_solver_execution_id
    INTO v_version_status, v_active_execution_id
  FROM schedule_versions
  WHERE schedule_id = p_schedule_id
    AND id = p_schedule_version_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'missing_version';
  END IF;

  IF v_version_status = 'solving' OR v_active_execution_id IS NOT NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'version_locked_for_solving';
  END IF;

  INSERT INTO schedule_assignments (
    schedule_id,
    schedule_version_id,
    employee_id,
    shift_id,
    date,
    edited_at
  )
  SELECT
    p_schedule_id,
    p_schedule_version_id,
    row.employee_id,
    row.shift_id,
    row.date,
    NOW()
  FROM jsonb_to_recordset(p_changes) AS row(
    employee_id UUID,
    date DATE,
    shift_id UUID,
    comment TEXT
  )
  WHERE row.employee_id IS NOT NULL
    AND row.date IS NOT NULL
    AND row.shift_id IS NOT NULL
  ON CONFLICT (schedule_version_id, employee_id, date)
  DO UPDATE
    SET shift_id = EXCLUDED.shift_id,
        comment = COALESCE(EXCLUDED.comment, schedule_assignments.comment),
        edited_at = NOW();

  UPDATE schedule_versions
  SET status = 'review_pending',
      current_revision = current_revision + 1,
      manual_edit_count = manual_edit_count + v_change_count,
      active_solver_execution_id = NULL,
      updated_at = NOW()
  WHERE schedule_id = p_schedule_id
    AND id = p_schedule_version_id;

  UPDATE schedules
  SET status = 'changed',
      solver_execution_id = NULL,
      updated_at = NOW()
  WHERE id = p_schedule_id;
END;
$$;
