-- Phase2B Epic 2 follow-up:
-- Align direct client table access with membership-based organization access.

ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_requirements ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('organizations', 'employees', 'shifts', 'site_requirements')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END $$;

CREATE POLICY organizations_select_authenticated ON public.organizations
FOR SELECT TO authenticated
USING (has_org_access(id, 'user'));

CREATE POLICY organizations_update_admin ON public.organizations
FOR UPDATE TO authenticated
USING (has_org_access(id, 'admin'))
WITH CHECK (has_org_access(id, 'admin'));

CREATE POLICY employees_select_authenticated ON public.employees
FOR SELECT TO authenticated
USING (has_org_access(organization_id, 'user'));

CREATE POLICY employees_admin_all ON public.employees
FOR ALL TO authenticated
USING (has_org_access(organization_id, 'admin'))
WITH CHECK (has_org_access(organization_id, 'admin'));

CREATE POLICY shifts_select_authenticated ON public.shifts
FOR SELECT TO authenticated
USING (has_org_access(organization_id, 'user'));

CREATE POLICY shifts_admin_all ON public.shifts
FOR ALL TO authenticated
USING (has_org_access(organization_id, 'admin'))
WITH CHECK (has_org_access(organization_id, 'admin'));

CREATE POLICY site_requirements_select_authenticated ON public.site_requirements
FOR SELECT TO authenticated
USING (has_org_access(organization_id, 'user'));

CREATE POLICY site_requirements_admin_all ON public.site_requirements
FOR ALL TO authenticated
USING (has_org_access(organization_id, 'admin'))
WITH CHECK (has_org_access(organization_id, 'admin'));
