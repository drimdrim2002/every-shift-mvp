-- Slice 9: archive non-finalized active versions on month reset and exclude them from future active flows.

ALTER TABLE schedule_versions
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_versions_archive_reason_check'
      AND conrelid = 'schedule_versions'::regclass
  ) THEN
    ALTER TABLE schedule_versions
      ADD CONSTRAINT schedule_versions_archive_reason_check
      CHECK (archive_reason IS NULL OR archive_reason IN ('month_reset'));
  END IF;
END $$;

DROP INDEX IF EXISTS schedule_versions_single_running_per_schedule_idx;

CREATE UNIQUE INDEX IF NOT EXISTS schedule_versions_single_running_per_schedule_idx
  ON schedule_versions (schedule_id)
  WHERE archived_at IS NULL AND (status = 'solving' OR active_solver_execution_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS schedule_versions_active_flow_idx
  ON schedule_versions (schedule_id, version_no)
  WHERE archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.reset_schedule_active_flow_atomic(
  p_schedule_id uuid,
  p_archived_by uuid DEFAULT NULL
)
RETURNS TABLE (
  schedule_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_finalized_version_id uuid;
BEGIN
  SELECT s.finalized_version_id
  INTO v_finalized_version_id
  FROM schedules s
  WHERE s.id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'schedule_not_found';
  END IF;

  IF v_finalized_version_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
  END IF;

  UPDATE schedule_versions sv
  SET
    archived_at = now(),
    archived_by = p_archived_by,
    archive_reason = 'month_reset',
    active_solver_execution_id = NULL,
    updated_at = now()
  WHERE sv.schedule_id = p_schedule_id
    AND sv.archived_at IS NULL
    AND sv.status <> 'finalized';

  DELETE FROM schedule_preferences sp
  WHERE sp.schedule_id = p_schedule_id
    AND sp.schedule_version_id IS NULL;

  DELETE FROM schedule_assignments sa
  WHERE sa.schedule_id = p_schedule_id
    AND sa.schedule_version_id IS NULL;

  UPDATE schedules s
  SET
    selected_version_id = NULL,
    status = 'created',
    solver_execution_id = NULL,
    hard_score = NULL,
    soft_score = NULL,
    updated_at = now()
  WHERE s.id = p_schedule_id;

  schedule_id := p_schedule_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_schedule_active_flow_atomic(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reset_schedule_active_flow_atomic(uuid, uuid)
TO service_role;
