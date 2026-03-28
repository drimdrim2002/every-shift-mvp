-- Slice 5 follow-up: single-running-version enforcement and authoritative lifecycle writes.
--
-- Goals:
-- 1. Ensure only one version per schedule can be in a running/claimed state.
-- 2. Make solve-start authoritative in SQL, including legacy mirror updates and pre-solve reset.
-- 3. Sync version-scoped off-request resolution inside solver-result/manual-patch transactions.

CREATE UNIQUE INDEX IF NOT EXISTS schedule_versions_single_running_per_schedule_idx
  ON schedule_versions (schedule_id)
  WHERE status = 'solving' OR active_solver_execution_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_schedule_version_preference_resolution(
  p_version_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month text;
  v_start_date date;
  v_end_date date;
BEGIN
  SELECT s.month
  INTO v_month
  FROM schedule_versions sv
  JOIN schedules s ON s.id = sv.schedule_id
  WHERE sv.id = p_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  v_start_date := to_date(v_month || '-01', 'YYYY-MM-DD');
  v_end_date := (v_start_date + INTERVAL '1 month - 1 day')::date;

  UPDATE schedule_preferences sp
  SET
    resolution_status = CASE
      WHEN matched.shift_code = 'O' THEN 'fulfilled'
      ELSE 'unfulfilled'
    END,
    resolved_shift_id = matched.shift_id,
    resolved_at = now()
  FROM (
    SELECT
      pref.id AS preference_id,
      sa.shift_id,
      sh.code AS shift_code
    FROM schedule_preferences pref
    LEFT JOIN schedule_assignments sa
      ON sa.schedule_version_id = pref.schedule_version_id
      AND sa.employee_id = pref.employee_id
      AND sa.date = pref.date
    LEFT JOIN shifts sh
      ON sh.id = sa.shift_id
    WHERE pref.schedule_version_id = p_version_id
      AND pref.request_code = 'O'
      AND pref.date BETWEEN v_start_date AND v_end_date
  ) matched
  WHERE sp.id = matched.preference_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_schedule_version_solving_atomic(
  p_version_id uuid,
  p_solver_execution_id text
)
RETURNS TABLE (
  schedule_version_id uuid,
  status text,
  active_solver_execution_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
  v_month text;
  v_current_status text;
  v_current_execution_id text;
  v_start_date date;
  v_end_date date;
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
    v_current_execution_id
  FROM schedule_versions sv
  JOIN schedules s ON s.id = sv.schedule_id
  WHERE sv.id = p_version_id
  FOR UPDATE OF s, sv;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  IF v_current_status = 'solving' OR v_current_execution_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'another_version_solving';
  END IF;

  PERFORM 1
  FROM schedule_versions sibling
  WHERE sibling.schedule_id = v_schedule_id
    AND sibling.id <> p_version_id
    AND (
      sibling.status = 'solving'
      OR sibling.active_solver_execution_id IS NOT NULL
    );

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'another_version_solving';
  END IF;

  v_start_date := to_date(v_month || '-01', 'YYYY-MM-DD');
  v_end_date := (v_start_date + INTERVAL '1 month - 1 day')::date;

  UPDATE schedule_preferences sp
  SET
    resolution_status = 'pending',
    resolved_shift_id = NULL,
    resolved_at = NULL
  WHERE sp.schedule_version_id = p_version_id
    AND sp.date BETWEEN v_start_date AND v_end_date;

  UPDATE schedule_versions sv
  SET
    status = 'solving',
    active_solver_execution_id = p_solver_execution_id,
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

  UPDATE schedules s
  SET
    status = 'running',
    solver_execution_id = p_solver_execution_id,
    hard_score = NULL,
    soft_score = NULL,
    updated_at = now()
  WHERE s.id = v_schedule_id;

  RETURN NEXT;
END;
$$;

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
  FOR UPDATE OF s, sv;

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

    PERFORM public.sync_schedule_version_preference_resolution(p_version_id);

    hard_score := CASE
      WHEN p_score ? 'hardScore' THEN (p_score->>'hardScore')::integer
      ELSE NULL
    END;
    soft_score := CASE
      WHEN p_score ? 'softScore' THEN (p_score->>'softScore')::integer
      ELSE NULL
    END;
    failure_reason := NULL;

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

    UPDATE schedules s
    SET
      status = 'complete',
      solver_execution_id = NULL,
      hard_score = hard_score,
      soft_score = soft_score,
      updated_at = now()
    WHERE s.id = v_schedule_id;

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

  UPDATE schedules s
  SET
    status = 'error',
    solver_execution_id = NULL,
    hard_score = NULL,
    soft_score = NULL,
    updated_at = now()
  WHERE s.id = v_schedule_id;

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
  FOR UPDATE OF s, sv;

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

  PERFORM public.sync_schedule_version_preference_resolution(p_version_id);

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

  UPDATE schedules s
  SET
    status = 'changed',
    solver_execution_id = NULL,
    updated_at = now()
  WHERE s.id = v_schedule_id;

  RETURN NEXT;
END;
$$;
