CREATE OR REPLACE FUNCTION public.delete_schedule_month_atomic(
  p_organization_id uuid,
  p_month text,
  p_deleted_by uuid DEFAULT NULL
)
RETURNS TABLE (
  deleted_schedule_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT s.id
  INTO deleted_schedule_id
  FROM schedules s
  WHERE s.organization_id = p_organization_id
    AND s.month = p_month
  FOR UPDATE;

  IF NOT FOUND THEN
    deleted_schedule_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  PERFORM 1
  FROM schedules s
  WHERE s.id = deleted_schedule_id
    AND s.finalized_version_id IS NOT NULL;

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
  END IF;

  PERFORM 1
  FROM schedule_versions sv
  WHERE sv.schedule_id = deleted_schedule_id
    AND sv.archived_at IS NULL
    AND (sv.status = 'solving' OR sv.active_solver_execution_id IS NOT NULL);

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_locked_for_solving';
  END IF;

  DELETE FROM schedules
  WHERE id = deleted_schedule_id;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_schedule_month_atomic(uuid, text, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.delete_schedule_month_atomic(uuid, text, uuid)
TO service_role;
