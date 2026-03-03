-- ============================================================================
-- EveryShift Service Transition - P2-1.2 Signup Role Flow Canonical DDL
-- File: 010_signup_role_flow.sql
-- Purpose:
--   1) Extend signup request state model with 'expired'
--   2) Add invite-code persistence model for user instant approval flow
--   3) Enforce integrity constraints for dedupe and review consistency
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0) Pre-check for pending request dedupe index safety
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.signup_requests sr
    WHERE sr.status = 'pending'
    GROUP BY
      sr.requester_user_id,
      sr.requested_role,
      COALESCE(sr.organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Migration 010 blocked: duplicate pending signup_requests detected for the same requester/role/organization scope.';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1) signup_requests.status CHECK: include 'expired'
-- ----------------------------------------------------------------------------

ALTER TABLE public.signup_requests
  DROP CONSTRAINT IF EXISTS signup_requests_status_check;

ALTER TABLE public.signup_requests
  DROP CONSTRAINT IF EXISTS chk_signup_requests_status;

ALTER TABLE public.signup_requests
  ADD CONSTRAINT chk_signup_requests_status
  CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'withdrawn'));

-- Review metadata consistency:
-- - approved/rejected must have reviewed_at
-- - pending/expired/withdrawn must not have reviewed_at
ALTER TABLE public.signup_requests
  DROP CONSTRAINT IF EXISTS chk_signup_requests_review_timeline;

ALTER TABLE public.signup_requests
  ADD CONSTRAINT chk_signup_requests_review_timeline
  CHECK (
    (status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL)
    OR
    (status IN ('pending', 'expired', 'withdrawn') AND reviewed_at IS NULL)
  );

-- Rejected requests must have explicit reviewer.
ALTER TABLE public.signup_requests
  DROP CONSTRAINT IF EXISTS chk_signup_requests_rejected_reviewer;

ALTER TABLE public.signup_requests
  ADD CONSTRAINT chk_signup_requests_rejected_reviewer
  CHECK (
    status <> 'rejected'
    OR reviewed_by IS NOT NULL
  );

-- Prevent duplicate pending requests per requester/role/org-scope.
-- organization_id NULL is normalized to all-zero UUID key for uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS ux_signup_requests_pending_dedupe
  ON public.signup_requests (
    requester_user_id,
    requested_role,
    COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE status = 'pending';

-- ----------------------------------------------------------------------------
-- 2) Invite code persistence model (user instant approval flow)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_scope VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (role_scope IN ('user')),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > created_at),
  CHECK (
    (used_at IS NULL AND used_by IS NULL)
    OR
    (used_at IS NOT NULL AND used_by IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_invite_codes_code_hash
  ON public.invite_codes(code_hash);

CREATE INDEX IF NOT EXISTS idx_invite_codes_org_active
  ON public.invite_codes(organization_id, expires_at)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invite_codes_used_by
  ON public.invite_codes(used_by, used_at DESC)
  WHERE used_at IS NOT NULL;

COMMENT ON TABLE public.invite_codes IS 'Single-use invite code store for user instant-approval signup flow.';
COMMENT ON COLUMN public.invite_codes.code_hash IS 'Hashed invite token. Raw invite code must never be stored.';
COMMENT ON COLUMN public.invite_codes.role_scope IS 'Invite role scope. P2 canonical model restricts this to user.';

-- ----------------------------------------------------------------------------
-- 3) Documentation-oriented integrity probes (manual runbook queries)
-- ----------------------------------------------------------------------------
-- Query A: pending dedupe candidates (must return 0 rows)
-- SELECT requester_user_id, requested_role, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid) AS org_scope, COUNT(*)
-- FROM public.signup_requests
-- WHERE status = 'pending'
-- GROUP BY requester_user_id, requested_role, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
-- HAVING COUNT(*) > 1;
--
-- Query B: invalid review timeline rows (must return 0 rows)
-- SELECT id, status, reviewed_by, reviewed_at
-- FROM public.signup_requests
-- WHERE NOT (
--   (status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL)
--   OR (status IN ('pending', 'expired', 'withdrawn') AND reviewed_at IS NULL)
-- );
--
-- Query C: invalid invite consume pair rows (must return 0 rows)
-- SELECT id, used_at, used_by
-- FROM public.invite_codes
-- WHERE NOT (
--   (used_at IS NULL AND used_by IS NULL)
--   OR (used_at IS NOT NULL AND used_by IS NOT NULL)
-- );

COMMIT;

