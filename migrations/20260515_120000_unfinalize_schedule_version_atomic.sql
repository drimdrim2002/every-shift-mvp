-- Add an atomic boundary for canceling a finalized schedule version.
-- This removes the month from finalized-ledger based reports and reopens
-- the selected version for review/editing.

CREATE OR REPLACE FUNCTION public.unfinalize_schedule_version_atomic(
  p_version_id uuid
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
  v_existing_finalized_version_id uuid;
  v_version_status text;
  v_active_solver_execution_id text;
  v_return_schedule_id uuid;
BEGIN
  SELECT
    sv.schedule_id,
    sv.status,
    sv.active_solver_execution_id,
    s.finalized_version_id
  INTO
    v_schedule_id,
    v_version_status,
    v_active_solver_execution_id,
    v_existing_finalized_version_id
  FROM schedule_versions sv
  JOIN schedules s ON s.id = sv.schedule_id
  WHERE sv.id = p_version_id
  FOR UPDATE OF s, sv;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_not_found';
  END IF;

  IF v_existing_finalized_version_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'not_finalized';
  END IF;

  IF v_existing_finalized_version_id IS DISTINCT FROM p_version_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'finalized_version_mismatch';
  END IF;

  IF v_active_solver_execution_id IS NOT NULL OR v_version_status = 'solving' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_locked_for_solving';
  END IF;

  DELETE FROM fairness_ledger_monthly
  WHERE fairness_ledger_monthly.finalized_version_id = p_version_id;

  UPDATE schedule_versions sv
  SET
    status = 'review_ready',
    updated_at = now()
  WHERE sv.id = p_version_id;

  UPDATE schedules s
  SET
    selected_version_id = p_version_id,
    finalized_version_id = NULL,
    finalized_at = NULL,
    finalized_by = NULL,
    solver_execution_id = NULL,
    updated_at = now()
  WHERE s.id = v_schedule_id
  RETURNING s.id
  INTO v_return_schedule_id;

  RETURN QUERY SELECT
    v_return_schedule_id,
    p_version_id,
    'review_ready'::text,
    NULL::uuid,
    NULL::timestamptz,
    NULL::uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.unfinalize_schedule_version_atomic(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.unfinalize_schedule_version_atomic(uuid)
TO service_role;
