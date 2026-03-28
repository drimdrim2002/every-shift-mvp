-- Slice 5: enforce edge-only mutation boundary for both stopgap(010) and authoritative(009) RPCs.
--
-- Goal:
-- - Block anon/authenticated/public direct execution paths.
-- - Keep service_role (edge function repository path) as the only runtime caller.

-- 010 stopgap signatures
REVOKE ALL ON FUNCTION public.mark_schedule_version_solving_start(uuid, uuid, text)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.apply_solver_result_if_current(
  uuid,
  uuid,
  text,
  jsonb,
  numeric,
  numeric,
  boolean,
  text,
  boolean
)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.patch_schedule_version_assignments_atomic(uuid, uuid, jsonb)
FROM PUBLIC, anon, authenticated;

-- 009 authoritative signatures
REVOKE ALL ON FUNCTION public.sync_schedule_version_preference_resolution(uuid)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.mark_schedule_version_solving_atomic(uuid, text)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.apply_schedule_version_solver_result(
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  text,
  uuid
)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.patch_schedule_version_assignments_atomic(uuid, jsonb, uuid)
FROM PUBLIC, anon, authenticated;

-- service_role allowlist
GRANT EXECUTE ON FUNCTION public.mark_schedule_version_solving_start(uuid, uuid, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.apply_solver_result_if_current(
  uuid,
  uuid,
  text,
  jsonb,
  numeric,
  numeric,
  boolean,
  text,
  boolean
)
TO service_role;

GRANT EXECUTE ON FUNCTION public.patch_schedule_version_assignments_atomic(uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_schedule_version_preference_resolution(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_schedule_version_solving_atomic(uuid, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.apply_schedule_version_solver_result(
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  text,
  uuid
)
TO service_role;

GRANT EXECUTE ON FUNCTION public.patch_schedule_version_assignments_atomic(uuid, jsonb, uuid) TO service_role;
