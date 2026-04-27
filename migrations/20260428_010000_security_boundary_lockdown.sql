-- Lock down client-visible Phase2 security boundaries.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.grant_superuser(text, uuid[])') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.grant_superuser(text, uuid[]) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.grant_superuser(text, uuid[]) TO service_role';
  END IF;

  IF to_regprocedure('public.has_org_access(uuid, text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.has_org_access(uuid, text) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.has_org_access(uuid, text) TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.is_super_admin()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.onboarding_progress_before_write()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.onboarding_progress_before_write() FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.onboarding_progress_before_write() TO authenticated, service_role';
  END IF;
END;
$$;

ALTER TABLE IF EXISTS public.schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_staffing_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_site_assignments ENABLE ROW LEVEL SECURITY;

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
USING (public.has_org_access(organization_id, 'user'));

CREATE POLICY schedules_admin_all ON public.schedules
FOR ALL TO authenticated
USING (public.has_org_access(organization_id, 'admin'))
WITH CHECK (public.has_org_access(organization_id, 'admin'));

DROP POLICY IF EXISTS "Admin can do everything" ON public.schedule_preferences;
DROP POLICY IF EXISTS schedule_preferences_select_authenticated ON public.schedule_preferences;
DROP POLICY IF EXISTS schedule_preferences_admin_all ON public.schedule_preferences;

CREATE POLICY schedule_preferences_select_authenticated ON public.schedule_preferences
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    JOIN public.employees e ON e.id = schedule_preferences.employee_id
    LEFT JOIN public.shifts sh ON sh.id = schedule_preferences.resolved_shift_id
    WHERE s.id = schedule_preferences.schedule_id
      AND e.organization_id = s.organization_id
      AND (
        schedule_preferences.resolved_shift_id IS NULL
        OR sh.organization_id = s.organization_id
      )
      AND public.has_org_access(s.organization_id, 'user')
  )
);

CREATE POLICY schedule_preferences_admin_all ON public.schedule_preferences
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    JOIN public.employees e ON e.id = schedule_preferences.employee_id
    LEFT JOIN public.shifts sh ON sh.id = schedule_preferences.resolved_shift_id
    WHERE s.id = schedule_preferences.schedule_id
      AND e.organization_id = s.organization_id
      AND (
        schedule_preferences.resolved_shift_id IS NULL
        OR sh.organization_id = s.organization_id
      )
      AND public.has_org_access(s.organization_id, 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    JOIN public.employees e ON e.id = schedule_preferences.employee_id
    LEFT JOIN public.shifts sh ON sh.id = schedule_preferences.resolved_shift_id
    WHERE s.id = schedule_preferences.schedule_id
      AND e.organization_id = s.organization_id
      AND (
        schedule_preferences.resolved_shift_id IS NULL
        OR sh.organization_id = s.organization_id
      )
      AND public.has_org_access(s.organization_id, 'admin')
  )
);

DROP POLICY IF EXISTS schedule_assignments_select_authenticated ON public.schedule_assignments;
DROP POLICY IF EXISTS schedule_assignments_admin_insert ON public.schedule_assignments;
DROP POLICY IF EXISTS schedule_assignments_admin_update ON public.schedule_assignments;
DROP POLICY IF EXISTS schedule_assignments_admin_delete ON public.schedule_assignments;

CREATE POLICY schedule_assignments_select_authenticated ON public.schedule_assignments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    JOIN public.employees e ON e.id = schedule_assignments.employee_id
    JOIN public.shifts sh ON sh.id = schedule_assignments.shift_id
    LEFT JOIN public.sites st ON st.id = schedule_assignments.site_id
    WHERE s.id = schedule_assignments.schedule_id
      AND e.organization_id = s.organization_id
      AND sh.organization_id = s.organization_id
      AND (
        schedule_assignments.site_id IS NULL
        OR st.organization_id = s.organization_id
      )
      AND public.has_org_access(s.organization_id, 'user')
  )
);

CREATE POLICY schedule_assignments_admin_insert ON public.schedule_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    JOIN public.employees e ON e.id = schedule_assignments.employee_id
    JOIN public.shifts sh ON sh.id = schedule_assignments.shift_id
    LEFT JOIN public.sites st ON st.id = schedule_assignments.site_id
    WHERE s.id = schedule_assignments.schedule_id
      AND e.organization_id = s.organization_id
      AND sh.organization_id = s.organization_id
      AND (
        schedule_assignments.site_id IS NULL
        OR st.organization_id = s.organization_id
      )
      AND public.has_org_access(s.organization_id, 'admin')
  )
);

CREATE POLICY schedule_assignments_admin_update ON public.schedule_assignments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    JOIN public.employees e ON e.id = schedule_assignments.employee_id
    JOIN public.shifts sh ON sh.id = schedule_assignments.shift_id
    LEFT JOIN public.sites st ON st.id = schedule_assignments.site_id
    WHERE s.id = schedule_assignments.schedule_id
      AND e.organization_id = s.organization_id
      AND sh.organization_id = s.organization_id
      AND (
        schedule_assignments.site_id IS NULL
        OR st.organization_id = s.organization_id
      )
      AND public.has_org_access(s.organization_id, 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    JOIN public.employees e ON e.id = schedule_assignments.employee_id
    JOIN public.shifts sh ON sh.id = schedule_assignments.shift_id
    LEFT JOIN public.sites st ON st.id = schedule_assignments.site_id
    WHERE s.id = schedule_assignments.schedule_id
      AND e.organization_id = s.organization_id
      AND sh.organization_id = s.organization_id
      AND (
        schedule_assignments.site_id IS NULL
        OR st.organization_id = s.organization_id
      )
      AND public.has_org_access(s.organization_id, 'admin')
  )
);

CREATE POLICY schedule_assignments_admin_delete ON public.schedule_assignments
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    JOIN public.employees e ON e.id = schedule_assignments.employee_id
    JOIN public.shifts sh ON sh.id = schedule_assignments.shift_id
    LEFT JOIN public.sites st ON st.id = schedule_assignments.site_id
    WHERE s.id = schedule_assignments.schedule_id
      AND e.organization_id = s.organization_id
      AND sh.organization_id = s.organization_id
      AND (
        schedule_assignments.site_id IS NULL
        OR st.organization_id = s.organization_id
      )
      AND public.has_org_access(s.organization_id, 'admin')
  )
);

DROP POLICY IF EXISTS organization_settings_select_authenticated ON public.organization_settings;
DROP POLICY IF EXISTS organization_settings_admin_all ON public.organization_settings;

CREATE POLICY organization_settings_select_authenticated ON public.organization_settings
FOR SELECT TO authenticated
USING (public.has_org_access(organization_id, 'user'));

CREATE POLICY organization_settings_admin_all ON public.organization_settings
FOR ALL TO authenticated
USING (public.has_org_access(organization_id, 'admin'))
WITH CHECK (public.has_org_access(organization_id, 'admin'));

DROP POLICY IF EXISTS site_staffing_requirements_select_authenticated ON public.site_staffing_requirements;
DROP POLICY IF EXISTS site_staffing_requirements_admin_all ON public.site_staffing_requirements;

CREATE POLICY site_staffing_requirements_select_authenticated ON public.site_staffing_requirements
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM (SELECT 1) guard
    LEFT JOIN public.sites st ON st.id = site_staffing_requirements.site_id
    LEFT JOIN public.shifts sh ON sh.id = site_staffing_requirements.shift_id
    LEFT JOIN public.skills sk ON sk.id = site_staffing_requirements.skill_id
    LEFT JOIN public.ranks r ON r.id = site_staffing_requirements.rank_id
    WHERE (
        site_staffing_requirements.site_id IS NULL
        OR st.organization_id = site_staffing_requirements.organization_id
      )
      AND (
        site_staffing_requirements.shift_id IS NULL
        OR sh.organization_id = site_staffing_requirements.organization_id
      )
      AND (
        site_staffing_requirements.skill_id IS NULL
        OR sk.organization_id = site_staffing_requirements.organization_id
      )
      AND (
        site_staffing_requirements.rank_id IS NULL
        OR r.organization_id = site_staffing_requirements.organization_id
      )
      AND public.has_org_access(site_staffing_requirements.organization_id, 'user')
  )
);

CREATE POLICY site_staffing_requirements_admin_all ON public.site_staffing_requirements
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM (SELECT 1) guard
    LEFT JOIN public.sites st ON st.id = site_staffing_requirements.site_id
    LEFT JOIN public.shifts sh ON sh.id = site_staffing_requirements.shift_id
    LEFT JOIN public.skills sk ON sk.id = site_staffing_requirements.skill_id
    LEFT JOIN public.ranks r ON r.id = site_staffing_requirements.rank_id
    WHERE (
        site_staffing_requirements.site_id IS NULL
        OR st.organization_id = site_staffing_requirements.organization_id
      )
      AND (
        site_staffing_requirements.shift_id IS NULL
        OR sh.organization_id = site_staffing_requirements.organization_id
      )
      AND (
        site_staffing_requirements.skill_id IS NULL
        OR sk.organization_id = site_staffing_requirements.organization_id
      )
      AND (
        site_staffing_requirements.rank_id IS NULL
        OR r.organization_id = site_staffing_requirements.organization_id
      )
      AND public.has_org_access(site_staffing_requirements.organization_id, 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (SELECT 1) guard
    LEFT JOIN public.sites st ON st.id = site_staffing_requirements.site_id
    LEFT JOIN public.shifts sh ON sh.id = site_staffing_requirements.shift_id
    LEFT JOIN public.skills sk ON sk.id = site_staffing_requirements.skill_id
    LEFT JOIN public.ranks r ON r.id = site_staffing_requirements.rank_id
    WHERE (
        site_staffing_requirements.site_id IS NULL
        OR st.organization_id = site_staffing_requirements.organization_id
      )
      AND (
        site_staffing_requirements.shift_id IS NULL
        OR sh.organization_id = site_staffing_requirements.organization_id
      )
      AND (
        site_staffing_requirements.skill_id IS NULL
        OR sk.organization_id = site_staffing_requirements.organization_id
      )
      AND (
        site_staffing_requirements.rank_id IS NULL
        OR r.organization_id = site_staffing_requirements.organization_id
      )
      AND public.has_org_access(site_staffing_requirements.organization_id, 'admin')
  )
);

DROP POLICY IF EXISTS analytics_metrics_select_authenticated ON public.analytics_metrics;
DROP POLICY IF EXISTS analytics_metrics_admin_all ON public.analytics_metrics;

CREATE POLICY analytics_metrics_select_authenticated ON public.analytics_metrics
FOR SELECT TO authenticated
USING (public.has_org_access(organization_id, 'user'));

CREATE POLICY analytics_metrics_admin_all ON public.analytics_metrics
FOR ALL TO authenticated
USING (public.has_org_access(organization_id, 'admin'))
WITH CHECK (public.has_org_access(organization_id, 'admin'));

DROP POLICY IF EXISTS notifications_select_authenticated ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_insert ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_update ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_delete ON public.notifications;

CREATE POLICY notifications_select_authenticated ON public.notifications
FOR SELECT TO authenticated
USING (
  recipient_user_id = auth.uid()
  AND public.has_org_access(organization_id, 'user')
);

CREATE POLICY notifications_admin_insert ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (public.has_org_access(organization_id, 'admin'));

CREATE POLICY notifications_admin_update ON public.notifications
FOR UPDATE TO authenticated
USING (public.has_org_access(organization_id, 'admin'))
WITH CHECK (public.has_org_access(organization_id, 'admin'));

CREATE POLICY notifications_admin_delete ON public.notifications
FOR DELETE TO authenticated
USING (public.has_org_access(organization_id, 'admin'));

DROP POLICY IF EXISTS notification_preferences_select_authenticated ON public.notification_preferences;
DROP POLICY IF EXISTS notification_preferences_admin_all ON public.notification_preferences;
DROP POLICY IF EXISTS notification_preferences_admin_insert ON public.notification_preferences;
DROP POLICY IF EXISTS notification_preferences_admin_update ON public.notification_preferences;
DROP POLICY IF EXISTS notification_preferences_admin_delete ON public.notification_preferences;

CREATE POLICY notification_preferences_select_authenticated ON public.notification_preferences
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_org_access(organization_id, 'user')
);

CREATE POLICY notification_preferences_admin_insert ON public.notification_preferences
FOR INSERT TO authenticated
WITH CHECK (public.has_org_access(organization_id, 'admin'));

CREATE POLICY notification_preferences_admin_update ON public.notification_preferences
FOR UPDATE TO authenticated
USING (public.has_org_access(organization_id, 'admin'))
WITH CHECK (public.has_org_access(organization_id, 'admin'));

CREATE POLICY notification_preferences_admin_delete ON public.notification_preferences
FOR DELETE TO authenticated
USING (public.has_org_access(organization_id, 'admin'));

DROP POLICY IF EXISTS employee_skills_select_authenticated ON public.employee_skills;
DROP POLICY IF EXISTS employee_skills_admin_all ON public.employee_skills;

CREATE POLICY employee_skills_select_authenticated ON public.employee_skills
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.skills sk ON sk.id = employee_skills.skill_id
    WHERE e.id = employee_skills.employee_id
      AND sk.organization_id = e.organization_id
      AND public.has_org_access(e.organization_id, 'user')
  )
);

CREATE POLICY employee_skills_admin_all ON public.employee_skills
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.skills sk ON sk.id = employee_skills.skill_id
    WHERE e.id = employee_skills.employee_id
      AND sk.organization_id = e.organization_id
      AND public.has_org_access(e.organization_id, 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.skills sk ON sk.id = employee_skills.skill_id
    WHERE e.id = employee_skills.employee_id
      AND sk.organization_id = e.organization_id
      AND public.has_org_access(e.organization_id, 'admin')
  )
);

DROP POLICY IF EXISTS employee_site_assignments_select_authenticated ON public.employee_site_assignments;
DROP POLICY IF EXISTS employee_site_assignments_admin_all ON public.employee_site_assignments;

CREATE POLICY employee_site_assignments_select_authenticated ON public.employee_site_assignments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.sites st ON st.id = employee_site_assignments.site_id
    WHERE e.id = employee_site_assignments.employee_id
      AND st.organization_id = e.organization_id
      AND public.has_org_access(e.organization_id, 'user')
  )
);

CREATE POLICY employee_site_assignments_admin_all ON public.employee_site_assignments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.sites st ON st.id = employee_site_assignments.site_id
    WHERE e.id = employee_site_assignments.employee_id
      AND st.organization_id = e.organization_id
      AND public.has_org_access(e.organization_id, 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.sites st ON st.id = employee_site_assignments.site_id
    WHERE e.id = employee_site_assignments.employee_id
      AND st.organization_id = e.organization_id
      AND public.has_org_access(e.organization_id, 'admin')
  )
);

DROP POLICY IF EXISTS approval_logs_no_client_access ON public.approval_logs;

CREATE POLICY approval_logs_no_client_access ON public.approval_logs
FOR ALL TO authenticated
USING (false)
WITH CHECK (false);

COMMIT;
