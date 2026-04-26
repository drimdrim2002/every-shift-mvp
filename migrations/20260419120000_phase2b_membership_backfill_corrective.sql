-- Phase2B Epic 2 follow-up:
-- Correct stale same-org membership rows for legacy active profiles without
-- overwriting already-approved membership records.

INSERT INTO public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  approved_by,
  approved_at,
  rejection_reason,
  created_at,
  updated_at
)
SELECT
  p.organization_id,
  p.id,
  CASE
    WHEN lower(coalesce(p.role, 'user')) = 'admin' THEN 'admin'
    ELSE 'user'
  END,
  'approved',
  p.id,
  coalesce(p.updated_at, p.created_at, now()),
  NULL,
  coalesce(p.created_at, now()),
  now()
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
  AND lower(coalesce(p.account_status, 'pending')) = 'active'
  AND lower(coalesce(p.status, 'active')) = 'active'
ON CONFLICT (organization_id, user_id) DO UPDATE
SET
  role = EXCLUDED.role,
  status = 'approved',
  approved_by = coalesce(public.organization_memberships.approved_by, EXCLUDED.approved_by),
  approved_at = coalesce(public.organization_memberships.approved_at, EXCLUDED.approved_at, now()),
  rejection_reason = NULL,
  updated_at = now()
WHERE lower(coalesce(public.organization_memberships.status, 'pending')) <> 'approved';
