-- ============================================================================
-- EveryShift Service Transition - P1-2.1 RBAC Helpers
-- File: 008_rls_progressive_rollout.sql
-- Purpose:
--   1) Define helper functions for RBAC and multi-tenant RLS policies
--   2) Enable RLS on core tables (but do not add all policies yet)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) Helper Functions for RBAC
-- ============================================================================

-- Check if current user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
      AND global_role = 'super'
      AND account_status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.is_super_admin() IS 'Returns true if the authenticated user has a global super role and active status.';

-- Unified helper for organization-scoped access
-- min_role: 'admin' or 'user' (default 'user')
CREATE OR REPLACE FUNCTION public.has_org_access(target_org_id UUID, min_role TEXT DEFAULT 'user')
RETURNS BOOLEAN AS $$
DECLARE
  v_global_role TEXT;
  v_account_status TEXT;
  v_membership_role TEXT;
  v_membership_status TEXT;
BEGIN
  -- 1. Get profile status and global role
  SELECT global_role, account_status INTO v_global_role, v_account_status
  FROM public.profiles
  WHERE id = auth.uid();

  -- Super admin bypass
  IF v_global_role = 'super' AND v_account_status = 'active' THEN
    RETURN TRUE;
  END IF;

  -- Account must be active for any other access
  IF v_account_status IS NULL OR v_account_status != 'active' THEN
    RETURN FALSE;
  END IF;

  -- 2. Check organization membership
  SELECT role, status INTO v_membership_role, v_membership_status
  FROM public.organization_memberships
  WHERE organization_id = target_org_id AND user_id = auth.uid();

  -- Membership must be approved
  IF v_membership_status IS NULL OR v_membership_status != 'approved' THEN
    RETURN FALSE;
  END IF;

  -- 3. Role hierarchy check
  IF min_role = 'admin' THEN
    RETURN v_membership_role = 'admin';
  END IF;

  -- min_role = 'user' allows both 'admin' and 'user' organization roles
  RETURN v_membership_role IN ('admin', 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.has_org_access(UUID, TEXT) IS 'Validates if the user has approved access to an organization with a minimum role requirement.';

-- ============================================================================
-- 2) Enable RLS on core tables
-- ============================================================================

-- These tables are part of the multi-tenant architecture and require RLS.
-- Actual policies will be added progressively in P1-2.2 (Task 10000000-0000-4000-8000-000000000047).

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;

COMMIT;
