-- Phase2B Epic 2 Task 6:
-- Backfill active legacy profiles into organization_memberships and replace
-- legacy org-claim RLS assumptions with membership-based access checks.

CREATE OR REPLACE FUNCTION public.has_org_access(
  p_organization_id uuid,
  p_required_role text DEFAULT 'user'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(coalesce(p.account_status, 'pending')) = 'active'
      AND (
        lower(coalesce(p.global_role, 'user')) = 'super'
        OR (
          p_organization_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.organization_memberships om
            WHERE om.organization_id = p_organization_id
              AND om.user_id = p.id
              AND lower(coalesce(om.status, 'pending')) = 'approved'
              AND CASE lower(coalesce(p_required_role, 'user'))
                WHEN 'admin' THEN lower(coalesce(om.role, 'user')) = 'admin'
                ELSE lower(coalesce(om.role, 'user')) IN ('admin', 'user')
              END
          )
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_org_access(uuid, text) TO authenticated;

INSERT INTO public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  approved_at,
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
  coalesce(p.updated_at, p.created_at, now()),
  coalesce(p.created_at, now()),
  now()
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
  AND p.account_status = 'active'
  AND coalesce(p.status, 'active') = 'active'
ON CONFLICT (organization_id, user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_organization_memberships_user_status_org
  ON public.organization_memberships (user_id, status, organization_id);

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can do everything" ON public.profiles;
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;

CREATE POLICY profiles_self_select ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY profiles_self_update ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can do everything" ON public.schedules;
DROP POLICY IF EXISTS "Users can view own organization schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can insert own organization schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can update own organization schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can delete own organization schedules" ON public.schedules;
DROP POLICY IF EXISTS schedules_select_authenticated ON public.schedules;
DROP POLICY IF EXISTS schedules_admin_all ON public.schedules;

CREATE POLICY schedules_select_authenticated ON public.schedules
FOR SELECT TO authenticated
USING (has_org_access(organization_id, 'user'));

CREATE POLICY schedules_admin_all ON public.schedules
FOR ALL TO authenticated
USING (has_org_access(organization_id, 'admin'))
WITH CHECK (has_org_access(organization_id, 'admin'));
