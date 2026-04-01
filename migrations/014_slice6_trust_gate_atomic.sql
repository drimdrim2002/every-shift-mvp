-- Slice 6: Trust gate atomic boundaries for immutable evaluation append and finalize.
--
-- Goals:
-- 1. Persist immutable evaluations as append-only rows for the current revision.
-- 2. Update latest_evaluation_id and version status atomically with evaluation persistence.
-- 3. Finalize only when selected-version + latest passed evaluation gate conditions hold under lock.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_evaluations_schedule_version_id_revision_no_key'
      AND conrelid = 'schedule_evaluations'::regclass
  ) THEN
    ALTER TABLE schedule_evaluations
      DROP CONSTRAINT schedule_evaluations_schedule_version_id_revision_no_key;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS schedule_evaluations_version_revision_created_idx
  ON schedule_evaluations (schedule_version_id, revision_no, created_at DESC);

CREATE OR REPLACE FUNCTION public.save_schedule_version_evaluation_atomic(
  p_version_id uuid,
  p_revision_no integer,
  p_result_status text,
  p_proof_summary jsonb DEFAULT '{}'::jsonb,
  p_violation_details jsonb DEFAULT '[]'::jsonb,
  p_infeasibility jsonb DEFAULT NULL,
  p_off_request_results jsonb DEFAULT '[]'::jsonb,
  p_comparison_metrics jsonb DEFAULT '{}'::jsonb,
  p_finalization_gate jsonb DEFAULT '{}'::jsonb,
  p_assignment_hash text DEFAULT '',
  p_solver_execution_id text DEFAULT NULL,
  p_evaluator_version text DEFAULT 'phase2a-trust-gate-v1'
)
RETURNS TABLE (
  schedule_version_id uuid,
  current_revision integer,
  evaluation_id uuid,
  status text,
  evaluation_result_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
  v_current_revision integer;
  v_active_solver_execution_id text;
  v_finalized_version_id uuid;
  v_mapped_version_status text;
BEGIN
  SELECT
    sv.schedule_id,
    sv.current_revision,
    sv.active_solver_execution_id,
    s.finalized_version_id
  INTO
    v_schedule_id,
    v_current_revision,
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

  IF v_active_solver_execution_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_locked_for_solving';
  END IF;

  IF p_revision_no <> v_current_revision THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_evaluation';
  END IF;

  IF p_result_status NOT IN ('passed', 'review_blocked', 'infeasible', 'solve_failed') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_result_status';
  END IF;

  v_mapped_version_status := CASE p_result_status
    WHEN 'passed' THEN 'review_ready'
    WHEN 'review_blocked' THEN 'review_blocked'
    WHEN 'infeasible' THEN 'infeasible'
    ELSE 'solve_failed'
  END;

  INSERT INTO schedule_evaluations (
    schedule_id,
    schedule_version_id,
    revision_no,
    result_status,
    proof_summary,
    violation_details,
    infeasibility,
    off_request_results,
    comparison_metrics,
    finalization_gate,
    assignment_hash,
    solver_execution_id,
    evaluator_version
  )
  VALUES (
    v_schedule_id,
    p_version_id,
    p_revision_no,
    p_result_status,
    COALESCE(p_proof_summary, '{}'::jsonb),
    COALESCE(p_violation_details, '[]'::jsonb),
    p_infeasibility,
    COALESCE(p_off_request_results, '[]'::jsonb),
    COALESCE(p_comparison_metrics, '{}'::jsonb),
    COALESCE(p_finalization_gate, '{}'::jsonb),
    COALESCE(NULLIF(p_assignment_hash, ''), 'sha256:'),
    p_solver_execution_id,
    COALESCE(NULLIF(p_evaluator_version, ''), 'phase2a-trust-gate-v1')
  )
  RETURNING id INTO evaluation_id;

  UPDATE schedule_versions sv
  SET
    latest_evaluation_id = evaluation_id,
    status = v_mapped_version_status,
    updated_at = now()
  WHERE sv.id = p_version_id;

  UPDATE schedules s
  SET
    status = CASE
      WHEN v_mapped_version_status = 'solve_failed' THEN 'error'
      ELSE 'complete'
    END,
    solver_execution_id = NULL,
    updated_at = now()
  WHERE s.id = v_schedule_id;

  schedule_version_id := p_version_id;
  current_revision := v_current_revision;
  status := v_mapped_version_status;
  evaluation_result_status := p_result_status;
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
  v_finalized_version_id uuid;
  v_current_revision integer;
  v_latest_evaluation_id uuid;
  v_eval_revision integer;
  v_eval_result_status text;
  v_gate_allowed boolean;
BEGIN
  SELECT
    sv.schedule_id,
    sv.current_revision,
    sv.latest_evaluation_id,
    s.selected_version_id,
    s.finalized_version_id
  INTO
    v_schedule_id,
    v_current_revision,
    v_latest_evaluation_id,
    v_selected_version_id,
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

  IF v_selected_version_id IS DISTINCT FROM p_version_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'not_selected_version';
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

REVOKE ALL ON FUNCTION public.save_schedule_version_evaluation_atomic(
  uuid,
  integer,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  text,
  text,
  text
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.finalize_schedule_version_atomic(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.save_schedule_version_evaluation_atomic(
  uuid,
  integer,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  text,
  text,
  text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.finalize_schedule_version_atomic(uuid, uuid)
TO service_role;
