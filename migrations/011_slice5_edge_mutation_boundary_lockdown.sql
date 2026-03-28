-- Slice 5: close direct client RPC bypass and keep write mutations behind edge auth boundary.
--
-- We intentionally lock down only the stopgap 010 function signatures:
--   mark_schedule_version_solving_start(uuid, uuid, text)
--   apply_solver_result_if_current(uuid, uuid, text, jsonb, numeric, numeric, boolean, text, boolean)
--   patch_schedule_version_assignments_atomic(uuid, uuid, jsonb)
--
-- The authoritative 009 signatures remain available for service_role via edge repository.

REVOKE EXECUTE
ON FUNCTION public.mark_schedule_version_solving_start(uuid, uuid, text)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE
ON FUNCTION public.apply_solver_result_if_current(
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

REVOKE EXECUTE
ON FUNCTION public.patch_schedule_version_assignments_atomic(uuid, uuid, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.mark_schedule_version_solving_start(uuid, uuid, text)
TO service_role;

GRANT EXECUTE
ON FUNCTION public.apply_solver_result_if_current(
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

GRANT EXECUTE
ON FUNCTION public.patch_schedule_version_assignments_atomic(uuid, uuid, jsonb)
TO service_role;
