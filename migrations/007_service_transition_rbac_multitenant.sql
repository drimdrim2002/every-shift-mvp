-- ============================================================================
-- EveryShift Service Transition - P1-1 Schema Expansion
-- File: 007_service_transition_rbac_multitenant.sql
-- Purpose:
--   1) Add RBAC + multitenant service tables
--   2) Add skills/ranks/sites and onboarding/notification foundations
--   3) Extend existing MVP core tables with nullable service fields
-- Notes:
--   - Non-destructive migration (existing MVP rows remain valid)
--   - Backfill is handled in the follow-up migration/task (P1-3)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) Identity / Membership / Approval
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  global_role VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (global_role IN ('super', 'admin', 'user')),
  account_status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'pending', 'rejected', 'suspended', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role_status
  ON profiles(global_role, account_status);

CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user
  ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_status_role
  ON organization_memberships(organization_id, status, role);

CREATE TABLE IF NOT EXISTS signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  requested_role VARCHAR(20) NOT NULL CHECK (requested_role IN ('admin', 'user')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  work_type VARCHAR(100),
  shift_type VARCHAR(100),
  requested_site_name VARCHAR(255),
  requested_skill_summary TEXT,
  requested_rank_code VARCHAR(50),
  requested_credit NUMERIC(10, 2),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signup_requests_status_created
  ON signup_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_requests_org_status
  ON signup_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_signup_requests_requester
  ON signup_requests(requester_user_id);

CREATE TABLE IF NOT EXISTS approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_request_id UUID REFERENCES signup_requests(id) ON DELETE SET NULL,
  membership_id UUID REFERENCES organization_memberships(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL
    CHECK (action IN ('approve', 'reject', 'withdraw', 'revoke')),
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_logs_org_created
  ON approval_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_logs_target_created
  ON approval_logs(target_user_id, created_at DESC);

-- ============================================================================
-- 2) Onboarding / Notification
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step >= 1),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user_completed_at
  ON onboarding_progress(user_id, completed_at);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('in_app', 'email')),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read_at
  ON notifications(recipient_user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_org_type
  ON notifications(organization_id, notification_type, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  allow_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  allow_email BOOLEAN NOT NULL DEFAULT FALSE,
  event_preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
  quiet_hours JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_org
  ON notification_preferences(organization_id);

-- ============================================================================
-- 3) Master Data (Organization Settings / Skills / Ranks / Sites)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  max_consecutive_night_shifts INTEGER,
  minimum_rest_hours JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (max_consecutive_night_shifts IS NULL OR max_consecutive_night_shifts >= 0)
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS employee_skills (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (employee_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_skills_skill
  ON employee_skills(skill_id);

CREATE TABLE IF NOT EXISTS employee_site_assignments (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (employee_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_sites_site
  ON employee_site_assignments(site_id);

-- NOTE:
--   site_staffing_requirements is the new service-level requirement table.
--   site_requirements (legacy MVP table) is extended later for transition compatibility.
CREATE TABLE IF NOT EXISTS site_staffing_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  required_count INTEGER NOT NULL CHECK (required_count >= 0),
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  rank_id UUID REFERENCES ranks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_staffing_req_org_site_day
  ON site_staffing_requirements(organization_id, site_id, day_of_week);

-- ============================================================================
-- 4) Analytics Foundation
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_month VARCHAR(7),
  metric_category VARCHAR(50) NOT NULL,
  metric_key VARCHAR(100) NOT NULL,
  metric_value NUMERIC(14, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_metrics_org_month_category
  ON analytics_metrics(organization_id, metric_month, metric_category);

-- ============================================================================
-- 5) Extend Existing Core Tables (nullable service fields)
-- ============================================================================

-- NOTE (2026-02 schema baseline):
--   - employees already uses employee_id (not staff_no)
--   - organizations/schedules/shifts keep current MVP columns as-is
--   - this migration only appends nullable service transition fields
--   - compatibility cleanup is intentionally excluded from this file
--     and should be handled in a separate migration if legacy drift exists

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- shifts:
-- Keep existing MVP columns; service-only columns are deferred until real usage appears.

-- schedules:
-- Keep existing MVP schedule fields; audit/publication metadata is deferred.

ALTER TABLE schedule_assignments
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

ALTER TABLE site_requirements
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rank_id UUID REFERENCES ranks(id) ON DELETE SET NULL;

ALTER TABLE site_requirements
  DROP CONSTRAINT IF EXISTS site_requirements_organization_id_shift_id_day_of_week_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_site_requirements_scope
  ON site_requirements(
    organization_id,
    COALESCE(site_id, '00000000-0000-0000-0000-000000000000'::UUID),
    shift_id,
    day_of_week,
    COALESCE(skill_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(rank_id, '00000000-0000-0000-0000-000000000000'::UUID)
  );

-- Optional indexes for added service columns
CREATE INDEX IF NOT EXISTS idx_employees_user_id
  ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_site_id
  ON schedule_assignments(site_id);
CREATE INDEX IF NOT EXISTS idx_site_requirements_site_id
  ON site_requirements(site_id);

-- ============================================================================
-- 6) Migration comments (table + column documentation)
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profile extension for auth.users with global RBAC role';
COMMENT ON TABLE organization_memberships IS 'Organization-scoped memberships with approval status';
COMMENT ON TABLE signup_requests IS 'Signup pipeline queue for admin/user onboarding';
COMMENT ON TABLE approval_logs IS 'Audit log for approval and account lifecycle actions';
COMMENT ON TABLE onboarding_progress IS 'First-login onboarding wizard progress for admin accounts';
COMMENT ON TABLE notifications IS 'In-app/email notification events';
COMMENT ON TABLE notification_preferences IS 'Per-user notification channel and event preferences';
COMMENT ON TABLE organization_settings IS 'Organization-level scheduling rules and defaults';
COMMENT ON TABLE skills IS 'Master list of organization-specific skills';
COMMENT ON TABLE ranks IS 'Master list of organization-specific rank definitions';
COMMENT ON TABLE sites IS 'Master list of organization-specific sites';
COMMENT ON TABLE employee_skills IS 'Many-to-many mapping of employee and skills';
COMMENT ON TABLE employee_site_assignments IS 'Many-to-many mapping of employee and sites';
COMMENT ON TABLE site_staffing_requirements IS 'Service-native staffing requirements (site/day/shift with optional skill/rank)';
COMMENT ON TABLE site_requirements IS 'Legacy MVP requirements table extended for transition compatibility';
COMMENT ON TABLE analytics_metrics IS 'Foundation table for dashboard and export metrics';

COMMENT ON COLUMN employees.user_id IS 'Link employee row to authenticated user account';
COMMENT ON COLUMN site_requirements.site_id IS 'Optional site scope for legacy requirement rows';

COMMIT;
