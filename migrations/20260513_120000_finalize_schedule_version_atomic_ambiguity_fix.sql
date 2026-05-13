-- Fix finalize_schedule_version_atomic ambiguity between RETURNS TABLE output
-- parameters and database columns named finalized_version_id.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.fairness_ledger_monthly'::regclass
      AND conname = 'fairness_ledger_monthly_finalized_version_id_key'
  ) THEN
    ALTER TABLE public.fairness_ledger_monthly
      ADD CONSTRAINT fairness_ledger_monthly_finalized_version_id_key
      UNIQUE (finalized_version_id);
  END IF;
END $$;

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

REVOKE ALL ON FUNCTION public.finalize_schedule_version_atomic(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.finalize_schedule_version_atomic(uuid, uuid)
TO service_role;
