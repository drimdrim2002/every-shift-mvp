-- Slice 5: atomic version-scoped write guards for Step5 solver callbacks and manual patches.
--
-- Goals:
-- 1. Lock the target schedule_versions row before mutating assignments or counters.
-- 2. Reject stale solver callbacks before any assignment write happens.
-- 3. Restrict solver-result writes to the current planning month only.
-- 4. Commit manual patch writes and revision/manual_edit_count updates atomically.

CREATE OR REPLACE FUNCTION public.apply_schedule_version_solver_result(
  p_version_id uuid,
  p_solver_execution_id text,
  p_status text,
  p_assignments jsonb DEFAULT '[]'::jsonb,
  p_score jsonb DEFAULT NULL,
  p_failure_reason text DEFAULT NULL,
  p_edited_by uuid DEFAULT NULL
)
RETURNS TABLE (
  schedule_version_id uuid,
  status text,
  active_solver_execution_id text,
  hard_score integer,
  soft_score integer,
  failure_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
  v_month text;
  v_current_status text;
  v_active_solver_execution_id text;
  v_start_date date;
  v_end_date date;
  v_filtered_assignments jsonb := '[]'::jsonb;
BEGIN
  SELECT
    sv.schedule_id,
    s.month,
    sv.status,
    sv.active_solver_execution_id
  INTO
    v_schedule_id,
    v_month,
    v_current_status,
    v_active_solver_execution_id
  FROM schedule_versions sv
  JOIN schedules s ON s.id = sv.schedule_id
  WHERE sv.id = p_version_id
  FOR UPDATE OF sv;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  IF v_active_solver_execution_id IS DISTINCT FROM p_solver_execution_id THEN
    IF v_active_solver_execution_id IS NULL OR v_current_status <> 'solving' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_solver_callback';
    END IF;

    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'solver_execution_mismatch';
  END IF;

  IF p_status NOT IN ('completed', 'failed') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_solver_result_status';
  END IF;

  v_start_date := to_date(v_month || '-01', 'YYYY-MM-DD');
  v_end_date := (v_start_date + INTERVAL '1 month - 1 day')::date;

  IF p_status = 'completed' THEN
    SELECT COALESCE(jsonb_agg(entry), '[]'::jsonb)
    INTO v_filtered_assignments
    FROM (
      SELECT entry
      FROM jsonb_array_elements(COALESCE(p_assignments, '[]'::jsonb)) entry
      WHERE NULLIF(entry->>'date', '') IS NOT NULL
        AND (entry->>'date')::date BETWEEN v_start_date AND v_end_date
    ) filtered;

    DELETE FROM schedule_assignments sa
    WHERE sa.schedule_version_id = p_version_id
      AND sa.date BETWEEN v_start_date AND v_end_date
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_filtered_assignments) entry
        WHERE COALESCE(entry->>'shiftId', '') <> ''
          AND entry->>'employeeId' = sa.employee_id::text
          AND entry->>'date' = sa.date::text
      );

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
      v_schedule_id,
      p_version_id,
      (entry->>'employeeId')::uuid,
      (entry->>'shiftId')::uuid,
      (entry->>'date')::date,
      COALESCE((entry->>'isLocked')::boolean, false),
      NULLIF(entry->>'offReason', ''),
      NULLIF(entry->>'comment', ''),
      p_edited_by,
      now()
    FROM jsonb_array_elements(v_filtered_assignments) entry
    WHERE COALESCE(entry->>'shiftId', '') <> ''
    ON CONFLICT ON CONSTRAINT schedule_assignments_schedule_version_id_employee_id_date_key
    DO UPDATE SET
      schedule_id = EXCLUDED.schedule_id,
      shift_id = EXCLUDED.shift_id,
      is_locked = EXCLUDED.is_locked,
      off_reason = EXCLUDED.off_reason,
      comment = EXCLUDED.comment,
      edited_by = EXCLUDED.edited_by,
      edited_at = EXCLUDED.edited_at;

    UPDATE schedule_versions sv
    SET
      status = 'review_pending',
      active_solver_execution_id = NULL,
      updated_at = now()
    WHERE sv.id = p_version_id
    RETURNING
      sv.id,
      sv.status,
      sv.active_solver_execution_id
    INTO
      schedule_version_id,
      status,
      active_solver_execution_id;

    hard_score := CASE
      WHEN p_score ? 'hardScore' THEN (p_score->>'hardScore')::integer
      ELSE NULL
    END;
    soft_score := CASE
      WHEN p_score ? 'softScore' THEN (p_score->>'softScore')::integer
      ELSE NULL
    END;
    failure_reason := NULL;

    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE schedule_versions sv
  SET
    status = 'solve_failed',
    active_solver_execution_id = NULL,
    updated_at = now()
  WHERE sv.id = p_version_id
  RETURNING
    sv.id,
    sv.status,
    sv.active_solver_execution_id
  INTO
    schedule_version_id,
    status,
    active_solver_execution_id;

  hard_score := NULL;
  soft_score := NULL;
  failure_reason := p_failure_reason;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.patch_schedule_version_assignments_atomic(
  p_version_id uuid,
  p_changes jsonb DEFAULT '[]'::jsonb,
  p_edited_by uuid DEFAULT NULL
)
RETURNS TABLE (
  schedule_version_id uuid,
  status text,
  current_revision integer,
  manual_edit_count integer,
  changed_cells integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
  v_month text;
  v_filtered_changes jsonb := '[]'::jsonb;
BEGIN
  SELECT
    sv.schedule_id,
    s.month
  INTO
    v_schedule_id,
    v_month
  FROM schedule_versions sv
  JOIN schedules s ON s.id = sv.schedule_id
  WHERE sv.id = p_version_id
  FOR UPDATE OF sv;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  SELECT COALESCE(jsonb_agg(entry), '[]'::jsonb)
  INTO v_filtered_changes
  FROM (
    SELECT entry
    FROM jsonb_array_elements(COALESCE(p_changes, '[]'::jsonb)) entry
    WHERE NULLIF(entry->>'date', '') IS NOT NULL
      AND (entry->>'date')::date BETWEEN to_date(v_month || '-01', 'YYYY-MM-DD')
      AND (to_date(v_month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month - 1 day')::date
  ) filtered;

  DELETE FROM schedule_assignments sa
  WHERE sa.schedule_version_id = p_version_id
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_filtered_changes) entry
      WHERE COALESCE(entry->>'shiftId', '') = ''
        AND entry->>'employeeId' = sa.employee_id::text
        AND entry->>'date' = sa.date::text
    );

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
    v_schedule_id,
    p_version_id,
    (entry->>'employeeId')::uuid,
    (entry->>'shiftId')::uuid,
    (entry->>'date')::date,
    COALESCE((entry->>'isLocked')::boolean, false),
    NULLIF(entry->>'offReason', ''),
    NULLIF(entry->>'comment', ''),
    p_edited_by,
    now()
  FROM jsonb_array_elements(v_filtered_changes) entry
  WHERE COALESCE(entry->>'shiftId', '') <> ''
  ON CONFLICT ON CONSTRAINT schedule_assignments_schedule_version_id_employee_id_date_key
  DO UPDATE SET
    schedule_id = EXCLUDED.schedule_id,
    shift_id = EXCLUDED.shift_id,
    is_locked = EXCLUDED.is_locked,
    off_reason = EXCLUDED.off_reason,
    comment = EXCLUDED.comment,
    edited_by = EXCLUDED.edited_by,
    edited_at = EXCLUDED.edited_at;

  UPDATE schedule_versions sv
  SET
    current_revision = sv.current_revision + 1,
    manual_edit_count = sv.manual_edit_count + jsonb_array_length(v_filtered_changes),
    status = 'review_pending',
    updated_at = now()
  WHERE sv.id = p_version_id
  RETURNING
    sv.id,
    sv.status,
    sv.current_revision,
    sv.manual_edit_count,
    jsonb_array_length(v_filtered_changes)
  INTO
    schedule_version_id,
    status,
    current_revision,
    manual_edit_count,
    changed_cells;

  RETURN NEXT;
END;
$$;
