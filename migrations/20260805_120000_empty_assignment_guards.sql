-- Empty assignment guards for solver commit and finalize.
--
-- Rules:
-- 1. completed solver results must include at least one month-scoped assignment with shiftId
--    before any DELETE of existing rows (empty_solver_result).
-- 2. finalize requires at least one live month-scoped assignment on the target version
--    (empty_assignments).

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
        AND COALESCE(entry->>'shiftId', '') <> ''
    ) filtered;

    IF jsonb_array_length(COALESCE(v_filtered_assignments, '[]'::jsonb)) = 0 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'empty_solver_result';
    END IF;

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
  v_month text;
  v_start_date date;
  v_end_date date;
  v_assignment_count integer;
  v_eval_revision integer;
  v_eval_result_status text;
  v_gate_allowed boolean;
  v_return_schedule_id uuid;
  v_return_finalized_version_id uuid;
  v_return_finalized_at timestamptz;
  v_return_finalized_by uuid;
BEGIN
  SELECT
    sv.schedule_id,
    sv.current_revision,
    sv.latest_evaluation_id,
    sv.status,
    sv.active_solver_execution_id,
    s.selected_version_id,
    s.finalized_version_id,
    s.month
  INTO
    v_schedule_id,
    v_current_revision,
    v_latest_evaluation_id,
    v_version_status,
    v_active_solver_execution_id,
    v_selected_version_id,
    v_existing_finalized_version_id,
    v_month
  FROM schedule_versions sv
  JOIN schedules s ON s.id = sv.schedule_id
  WHERE sv.id = p_version_id
  FOR UPDATE OF s, sv;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  IF v_existing_finalized_version_id IS NOT NULL THEN
    IF v_existing_finalized_version_id = p_version_id THEN
      SELECT
        s.id,
        s.finalized_version_id,
        s.finalized_at,
        s.finalized_by
      INTO
        v_return_schedule_id,
        v_return_finalized_version_id,
        v_return_finalized_at,
        v_return_finalized_by
      FROM schedules s
      WHERE s.id = v_schedule_id;

      RETURN QUERY SELECT
        v_return_schedule_id,
        p_version_id,
        'finalized'::text,
        v_return_finalized_version_id,
        v_return_finalized_at,
        v_return_finalized_by;
      RETURN;
    END IF;

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

  v_start_date := to_date(v_month || '-01', 'YYYY-MM-DD');
  v_end_date := (v_start_date + INTERVAL '1 month - 1 day')::date;

  SELECT count(*)::integer
  INTO v_assignment_count
  FROM schedule_assignments sa
  WHERE sa.schedule_version_id = p_version_id
    AND sa.date BETWEEN v_start_date AND v_end_date;

  IF COALESCE(v_assignment_count, 0) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'empty_assignments';
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
    v_return_schedule_id,
    v_return_finalized_version_id,
    v_return_finalized_at,
    v_return_finalized_by;

  INSERT INTO fairness_ledger_monthly (
    finalized_version_id,
    organization_id,
    schedule_id,
    month,
    finalized_at,
    finalized_by,
    evaluation_id,
    result_status,
    proof_summary,
    comparison_metrics,
    finalization_gate,
    snapshot
  )
  SELECT
    p_version_id,
    s.organization_id,
    s.id,
    s.month,
    s.finalized_at,
    s.finalized_by,
    se.id,
    se.result_status,
    COALESCE(se.proof_summary, '{}'::jsonb),
    COALESCE(se.comparison_metrics, '{}'::jsonb),
    COALESCE(se.finalization_gate, '{}'::jsonb),
    jsonb_build_object(
      'evaluationId', se.id,
      'scheduleId', s.id,
      'scheduleVersionId', p_version_id,
      'finalizedVersionId', p_version_id,
      'month', s.month,
      'finalizedAt', s.finalized_at,
      'finalizedBy', s.finalized_by,
      'resultStatus', se.result_status,
      'revisionNo', se.revision_no,
      'assignmentHash', se.assignment_hash,
      'proofSummary', se.proof_summary,
      'comparisonMetrics', se.comparison_metrics,
      'finalizationGate', se.finalization_gate
    )
  FROM schedules s
  JOIN schedule_evaluations se
    ON se.schedule_version_id = p_version_id
   AND se.id = v_latest_evaluation_id
  WHERE s.id = v_schedule_id
  ON CONFLICT ON CONSTRAINT fairness_ledger_monthly_finalized_version_id_key DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    schedule_id = EXCLUDED.schedule_id,
    month = EXCLUDED.month,
    finalized_at = EXCLUDED.finalized_at,
    finalized_by = EXCLUDED.finalized_by,
    evaluation_id = EXCLUDED.evaluation_id,
    result_status = EXCLUDED.result_status,
    proof_summary = EXCLUDED.proof_summary,
    comparison_metrics = EXCLUDED.comparison_metrics,
    finalization_gate = EXCLUDED.finalization_gate,
    snapshot = EXCLUDED.snapshot;

  RETURN QUERY SELECT
    v_return_schedule_id,
    p_version_id,
    'finalized'::text,
    v_return_finalized_version_id,
    v_return_finalized_at,
    v_return_finalized_by;
END;
$$;

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
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.finalize_schedule_version_atomic(uuid, uuid)
FROM PUBLIC, anon, authenticated;

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
) TO service_role;

GRANT EXECUTE ON FUNCTION public.finalize_schedule_version_atomic(uuid, uuid)
TO service_role;
