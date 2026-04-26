-- Slice 6 follow-up: canonical write-path immutability and atomic solver-result commit.
--
-- Goals:
-- 1. Close post-finalization write paths at the SQL authority layer.
-- 2. Move create-version cloning into a single SQL transaction.
-- 3. Commit solver-result assignments + evaluation append atomically.
-- 4. Strengthen finalize to require current review_ready state in addition to a passed gate.

CREATE OR REPLACE FUNCTION public.create_schedule_version_atomic(
  p_schedule_id uuid,
  p_base_version_id uuid,
  p_name text DEFAULT NULL,
  p_source_type text DEFAULT 're_solve',
  p_input_diff_summary jsonb DEFAULT '{}'::jsonb,
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
  v_finalized_version_id uuid;
  v_start_date date;
  v_end_date date;
BEGIN
  SELECT
    sv.schedule_id,
    s.month,
    sv.status,
    sv.active_solver_execution_id,
    s.finalized_version_id
  INTO
    v_schedule_id,
    v_month,
    v_current_status,
    v_current_execution_id,
    v_finalized_version_id
  FROM schedule_versions sv
  JOIN schedules s ON s.id = sv.schedule_id
  WHERE sv.id = p_version_id
  FOR UPDATE OF s, sv;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  IF v_finalized_version_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
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
    latest_evaluation_id = NULL,
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

CREATE OR REPLACE FUNCTION public.commit_schedule_version_solver_result_atomic(
  p_version_id uuid,
  p_solver_execution_id text,
  p_status text,
  p_assignments jsonb DEFAULT '[]'::jsonb,
  p_score jsonb DEFAULT NULL,
  p_failure_reason text DEFAULT NULL,
  p_edited_by uuid DEFAULT NULL,
  p_evaluation_result_status text DEFAULT 'passed',
  p_proof_summary jsonb DEFAULT '{}'::jsonb,
  p_violation_details jsonb DEFAULT '[]'::jsonb,
  p_infeasibility jsonb DEFAULT NULL,
  p_off_request_results jsonb DEFAULT '[]'::jsonb,
  p_comparison_metrics jsonb DEFAULT '{}'::jsonb,
  p_finalization_gate jsonb DEFAULT '{}'::jsonb,
  p_assignment_hash text DEFAULT '',
  p_evaluator_version text DEFAULT 'phase2a-trust-gate-v1'
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
  v_finalized_version_id uuid;
  v_current_revision integer;
  v_start_date date;
  v_end_date date;
  v_filtered_assignments jsonb := '[]'::jsonb;
  v_saved_status text;
  v_hard_score integer;
  v_soft_score integer;
  v_failure_reason text;
BEGIN
  SELECT
    sv.schedule_id,
    s.month,
    sv.status,
    sv.active_solver_execution_id,
    s.finalized_version_id,
    sv.current_revision
  INTO
    v_schedule_id,
    v_month,
    v_current_status,
    v_active_solver_execution_id,
    v_finalized_version_id,
    v_current_revision
  FROM schedule_versions sv
  JOIN schedules s ON s.id = sv.schedule_id
  WHERE sv.id = p_version_id
  FOR UPDATE OF s, sv;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  IF v_finalized_version_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
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
      AND sa.date BETWEEN v_start_date AND v_end_date;

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

    v_hard_score := CASE
      WHEN p_score IS NOT NULL AND p_score ? 'hardScore' THEN (p_score->>'hardScore')::integer
      ELSE NULL
    END;
    v_soft_score := CASE
      WHEN p_score IS NOT NULL AND p_score ? 'softScore' THEN (p_score->>'softScore')::integer
      ELSE NULL
    END;
    v_failure_reason := NULL;
  ELSE
    v_hard_score := NULL;
    v_soft_score := NULL;
    v_failure_reason := p_failure_reason;
  END IF;

  UPDATE schedule_versions sv
  SET
    active_solver_execution_id = NULL,
    updated_at = now()
  WHERE sv.id = p_version_id;

  SELECT saved.status
  INTO v_saved_status
  FROM public.save_schedule_version_evaluation_atomic(
    p_version_id,
    v_current_revision,
    p_evaluation_result_status,
    COALESCE(p_proof_summary, '{}'::jsonb),
    COALESCE(p_violation_details, '[]'::jsonb),
    p_infeasibility,
    COALESCE(p_off_request_results, '[]'::jsonb),
    COALESCE(p_comparison_metrics, '{}'::jsonb),
    COALESCE(p_finalization_gate, '{}'::jsonb),
    p_assignment_hash,
    p_solver_execution_id,
    p_evaluator_version
  ) AS saved;

  UPDATE schedules s
  SET
    hard_score = v_hard_score,
    soft_score = v_soft_score,
    updated_at = now()
  WHERE s.id = v_schedule_id;

  schedule_version_id := p_version_id;
  status := v_saved_status;
  active_solver_execution_id := NULL;
  hard_score := v_hard_score;
  soft_score := v_soft_score;
  failure_reason := v_failure_reason;
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
  v_version_status text;
  v_active_solver_execution_id text;
  v_finalized_version_id uuid;
  v_filtered_changes jsonb := '[]'::jsonb;
BEGIN
  SELECT
    sv.schedule_id,
    s.month,
    sv.status,
    sv.active_solver_execution_id,
    s.finalized_version_id
  INTO
    v_schedule_id,
    v_month,
    v_version_status,
    v_active_solver_execution_id,
    v_finalized_version_id
  FROM schedule_versions sv
  JOIN schedules s ON s.id = sv.schedule_id
  WHERE sv.id = p_version_id
  FOR UPDATE OF s, sv;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  IF v_finalized_version_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
  END IF;

  IF v_version_status = 'solving' OR v_active_solver_execution_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_locked_for_solving';
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

CREATE OR REPLACE FUNCTION public.finalize_schedule_version_atomic(
  p_version_id uuid,
  p_finalized_by uuid DEFAULT NULL
)
RETURNS TABLE (
  schedule_id uuid,
  schedule_version_id uuid,
  status text,
  finalized_version_id uuid,
  finalized_at timestamptz,
  finalized_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
  v_selected_version_id uuid;
  v_existing_finalized_version_id uuid;
  v_current_revision integer;
  v_latest_evaluation_id uuid;
  v_version_status text;
  v_active_solver_execution_id text;
  v_eval_revision integer;
  v_eval_result_status text;
  v_gate_allowed boolean;
BEGIN
  SELECT
    sv.schedule_id,
    sv.current_revision,
    sv.latest_evaluation_id,
    sv.status,
    sv.active_solver_execution_id,
    s.selected_version_id,
    s.finalized_version_id
  INTO
    v_schedule_id,
    v_current_revision,
    v_latest_evaluation_id,
    v_version_status,
    v_active_solver_execution_id,
    v_selected_version_id,
    v_existing_finalized_version_id
  FROM schedule_versions sv
  JOIN schedules s ON s.id = sv.schedule_id
  WHERE sv.id = p_version_id
  FOR UPDATE OF s, sv;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  IF v_existing_finalized_version_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
  END IF;

  IF v_active_solver_execution_id IS NOT NULL OR v_version_status = 'solving' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_locked_for_solving';
  END IF;

  IF v_selected_version_id IS DISTINCT FROM p_version_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'not_selected_version';
  END IF;

  IF v_version_status <> 'review_ready' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'not_review_ready';
  END IF;

  IF v_latest_evaluation_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_evaluation';
  END IF;

  SELECT
    se.revision_no,
    se.result_status,
    COALESCE((se.finalization_gate->>'allowed')::boolean, false)
  INTO
    v_eval_revision,
    v_eval_result_status,
    v_gate_allowed
  FROM schedule_evaluations se
  WHERE se.id = v_latest_evaluation_id
    AND se.schedule_version_id = p_version_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_evaluation';
  END IF;

  IF v_eval_revision <> v_current_revision THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_evaluation';
  END IF;

  IF v_eval_result_status <> 'passed' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'review_not_passed';
  END IF;

  IF v_gate_allowed IS NOT TRUE THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'gate_blocked';
  END IF;

  UPDATE schedule_versions sv
  SET
    status = 'finalized',
    updated_at = now()
  WHERE sv.id = p_version_id;

  UPDATE schedules s
  SET
    selected_version_id = p_version_id,
    finalized_version_id = p_version_id,
    finalized_at = now(),
    finalized_by = COALESCE(p_finalized_by, s.finalized_by),
    status = 'complete',
    solver_execution_id = NULL,
    updated_at = now()
  WHERE s.id = v_schedule_id
  RETURNING
    s.id,
    s.finalized_version_id,
    s.finalized_at,
    s.finalized_by
  INTO
    schedule_id,
    finalized_version_id,
    finalized_at,
    finalized_by;

  schedule_version_id := p_version_id;
  status := 'finalized';
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_schedule_version_atomic(uuid, uuid, text, text, jsonb, uuid)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.mark_schedule_version_solving_atomic(uuid, text)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.commit_schedule_version_solver_result_atomic(
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  text,
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  text,
  text
)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.patch_schedule_version_assignments_atomic(uuid, jsonb, uuid)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.finalize_schedule_version_atomic(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_schedule_version_atomic(uuid, uuid, text, text, jsonb, uuid)
TO service_role;

GRANT EXECUTE ON FUNCTION public.mark_schedule_version_solving_atomic(uuid, text)
TO service_role;

GRANT EXECUTE ON FUNCTION public.commit_schedule_version_solver_result_atomic(
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  text,
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  text,
  text
)
TO service_role;

GRANT EXECUTE ON FUNCTION public.patch_schedule_version_assignments_atomic(uuid, jsonb, uuid)
TO service_role;

GRANT EXECUTE ON FUNCTION public.finalize_schedule_version_atomic(uuid, uuid)
TO service_role;
