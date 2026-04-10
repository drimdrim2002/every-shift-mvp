-- Phase2A Slice O5.1: finalized-only rolling fairness ledger.
-- Keep this narrow:
-- - one row per finalized version
-- - idempotent retries key off finalized_version_id
-- - no public write path

CREATE TABLE IF NOT EXISTS fairness_ledger_monthly (
  finalized_version_id UUID PRIMARY KEY REFERENCES schedule_versions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  finalized_at TIMESTAMPTZ NOT NULL,
  finalized_by UUID,
  evaluation_id UUID NOT NULL REFERENCES schedule_evaluations(id) ON DELETE CASCADE,
  result_status TEXT NOT NULL,
  proof_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  comparison_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  finalization_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fairness_ledger_monthly
  ADD COLUMN IF NOT EXISTS finalized_version_id UUID,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_by UUID,
  ADD COLUMN IF NOT EXISTS evaluation_id UUID,
  ADD COLUMN IF NOT EXISTS result_status TEXT,
  ADD COLUMN IF NOT EXISTS proof_summary JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS comparison_metrics JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS finalization_gate JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS snapshot JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fairness_ledger_monthly'
      AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE fairness_ledger_monthly
      ALTER COLUMN employee_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fairness_ledger_monthly'
      AND column_name = 'schedule_version_id'
  ) THEN
    ALTER TABLE fairness_ledger_monthly
      ALTER COLUMN schedule_version_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fairness_ledger_monthly'
      AND column_name = 'night_count'
  ) THEN
    ALTER TABLE fairness_ledger_monthly
      ALTER COLUMN night_count DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fairness_ledger_monthly'
      AND column_name = 'evening_count'
  ) THEN
    ALTER TABLE fairness_ledger_monthly
      ALTER COLUMN evening_count DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fairness_ledger_monthly'
      AND column_name = 'weekend_count'
  ) THEN
    ALTER TABLE fairness_ledger_monthly
      ALTER COLUMN weekend_count DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fairness_ledger_monthly'
      AND column_name = 'schedule_version_id'
  ) THEN
    EXECUTE $sql$
      UPDATE fairness_ledger_monthly flm
      SET
        finalized_version_id = COALESCE(flm.finalized_version_id, s.finalized_version_id, flm.schedule_version_id),
        finalized_at = COALESCE(flm.finalized_at, s.finalized_at, flm.created_at, NOW()),
        finalized_by = COALESCE(flm.finalized_by, s.finalized_by),
        result_status = COALESCE(flm.result_status, 'passed'),
        proof_summary = COALESCE(flm.proof_summary, '{}'::jsonb),
        comparison_metrics = COALESCE(flm.comparison_metrics, '{}'::jsonb),
        finalization_gate = COALESCE(flm.finalization_gate, '{}'::jsonb),
        snapshot = COALESCE(flm.snapshot, '{}'::jsonb),
        created_at = COALESCE(flm.created_at, NOW())
      FROM schedules s
      WHERE s.id = flm.schedule_id
        AND flm.finalized_version_id IS NULL
    $sql$;
  ELSE
    UPDATE fairness_ledger_monthly flm
    SET
      finalized_version_id = COALESCE(flm.finalized_version_id, s.finalized_version_id),
      finalized_at = COALESCE(flm.finalized_at, s.finalized_at, flm.created_at, NOW()),
      finalized_by = COALESCE(flm.finalized_by, s.finalized_by),
      result_status = COALESCE(flm.result_status, 'passed'),
      proof_summary = COALESCE(flm.proof_summary, '{}'::jsonb),
      comparison_metrics = COALESCE(flm.comparison_metrics, '{}'::jsonb),
      finalization_gate = COALESCE(flm.finalization_gate, '{}'::jsonb),
      snapshot = COALESCE(flm.snapshot, '{}'::jsonb),
      created_at = COALESCE(flm.created_at, NOW())
    FROM schedules s
    WHERE s.id = flm.schedule_id
      AND flm.finalized_version_id IS NULL;
  END IF;
END $$;

ALTER TABLE fairness_ledger_monthly
  ALTER COLUMN proof_summary SET DEFAULT '{}'::jsonb,
  ALTER COLUMN proof_summary SET NOT NULL,
  ALTER COLUMN comparison_metrics SET DEFAULT '{}'::jsonb,
  ALTER COLUMN comparison_metrics SET NOT NULL,
  ALTER COLUMN finalization_gate SET DEFAULT '{}'::jsonb,
  ALTER COLUMN finalization_gate SET NOT NULL,
  ALTER COLUMN snapshot SET DEFAULT '{}'::jsonb,
  ALTER COLUMN snapshot SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM fairness_ledger_monthly
    WHERE finalized_version_id IS NULL
      OR finalized_at IS NULL
      OR evaluation_id IS NULL
      OR result_status IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'fairness_ledger_monthly_legacy_rows_require_manual_migration';
  END IF;
END $$;

ALTER TABLE fairness_ledger_monthly
  ALTER COLUMN finalized_version_id SET NOT NULL,
  ALTER COLUMN finalized_at SET NOT NULL,
  ALTER COLUMN evaluation_id SET NOT NULL,
  ALTER COLUMN result_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fairness_ledger_monthly_finalized_version_id_key'
  ) THEN
    ALTER TABLE fairness_ledger_monthly
      ADD CONSTRAINT fairness_ledger_monthly_finalized_version_id_key
      UNIQUE (finalized_version_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fairness_ledger_monthly_finalized_version_id_fkey'
  ) THEN
    ALTER TABLE fairness_ledger_monthly
      ADD CONSTRAINT fairness_ledger_monthly_finalized_version_id_fkey
      FOREIGN KEY (finalized_version_id)
      REFERENCES schedule_versions(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fairness_ledger_monthly_evaluation_id_fkey'
  ) THEN
    ALTER TABLE fairness_ledger_monthly
      ADD CONSTRAINT fairness_ledger_monthly_evaluation_id_fkey
      FOREIGN KEY (evaluation_id)
      REFERENCES schedule_evaluations(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS fairness_ledger_monthly_organization_month_idx
  ON fairness_ledger_monthly (organization_id, month, finalized_at DESC);

ALTER TABLE fairness_ledger_monthly ENABLE ROW LEVEL SECURITY;

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
    v_finalized_version_id
  FROM schedule_versions sv
  JOIN schedules s ON s.id = sv.schedule_id
  WHERE sv.id = p_version_id
  FOR UPDATE OF s, sv;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  IF v_finalized_version_id IS NOT NULL THEN
    IF v_finalized_version_id = p_version_id THEN
      SELECT
        s.id,
        s.finalized_version_id,
        s.finalized_at,
        s.finalized_by
      INTO
        schedule_id,
        finalized_version_id,
        finalized_at,
        finalized_by
      FROM schedules s
      WHERE s.id = v_schedule_id;

      schedule_version_id := p_version_id;
      status := 'finalized';
      RETURN NEXT;
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
    schedule_id,
    finalized_version_id,
    finalized_at,
    finalized_by;

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
  ON CONFLICT (finalized_version_id) DO UPDATE SET
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

  schedule_version_id := p_version_id;
  status := 'finalized';
  RETURN NEXT;
END;
$$;

COMMENT ON TABLE fairness_ledger_monthly IS 'Finalized-only rolling fairness ledger keyed by finalized schedule version.';
COMMENT ON COLUMN fairness_ledger_monthly.finalized_version_id IS 'Unique finalized version identity used for idempotent ledger retries.';
COMMENT ON COLUMN fairness_ledger_monthly.snapshot IS 'Structured finalized-version snapshot captured at write time.';
