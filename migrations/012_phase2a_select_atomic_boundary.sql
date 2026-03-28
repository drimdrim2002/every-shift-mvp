-- Slice 3 leak recovery: make selection mutation atomic and finalize-safe.

CREATE OR REPLACE FUNCTION public.select_schedule_version_atomic(
  p_version_id uuid
)
RETURNS TABLE (
  schedule_id uuid,
  selected_version_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
  v_finalized_version_id uuid;
BEGIN
  SELECT
    sv.schedule_id,
    s.finalized_version_id
  INTO
    v_schedule_id,
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

  UPDATE schedules s
  SET
    selected_version_id = p_version_id,
    updated_at = now()
  WHERE s.id = v_schedule_id
    AND s.selected_version_id IS DISTINCT FROM p_version_id;

  RETURN QUERY
  SELECT
    v_schedule_id,
    p_version_id;
END;
$$;

REVOKE ALL ON FUNCTION public.select_schedule_version_atomic(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_schedule_version_atomic(uuid) TO service_role;
