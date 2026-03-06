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
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_invite_codes_expires_after_created
    CHECK (expires_at > created_at),
  CONSTRAINT chk_invite_codes_code_hash_sha256_hex
    CHECK (code_hash ~ '^[0-9A-Fa-f]{64}$'),
  CONSTRAINT chk_invite_codes_single_use
    CHECK (
    max_uses = 1
    AND used_count BETWEEN 0 AND max_uses
  ),
  CONSTRAINT chk_invite_codes_usage_pair
    CHECK (
    (used_count = 0 AND used_at IS NULL AND used_by IS NULL)
    OR
    (used_count = max_uses AND used_at IS NOT NULL AND used_by IS NOT NULL)
  )
);

ALTER TABLE public.invite_codes
  ADD COLUMN IF NOT EXISTS max_uses INTEGER;

ALTER TABLE public.invite_codes
  ADD COLUMN IF NOT EXISTS used_count INTEGER;

ALTER TABLE public.invite_codes
  ALTER COLUMN max_uses TYPE INTEGER USING max_uses::INTEGER,
  ALTER COLUMN used_count TYPE INTEGER USING used_count::INTEGER;

UPDATE public.invite_codes
SET
  max_uses = COALESCE(max_uses, 1),
  used_count = CASE
    WHEN used_at IS NULL THEN 0
    ELSE 1
  END
WHERE max_uses IS NULL OR used_count IS NULL;

ALTER TABLE public.invite_codes
  ALTER COLUMN max_uses SET DEFAULT 1,
  ALTER COLUMN max_uses SET NOT NULL,
  ALTER COLUMN used_count SET DEFAULT 0,
  ALTER COLUMN used_count SET NOT NULL;

ALTER TABLE public.invite_codes
  DROP CONSTRAINT IF EXISTS chk_invite_codes_expires_after_created;

ALTER TABLE public.invite_codes
  ADD CONSTRAINT chk_invite_codes_expires_after_created
  CHECK (expires_at > created_at);

ALTER TABLE public.invite_codes
  DROP CONSTRAINT IF EXISTS chk_invite_codes_code_hash_sha256_hex;

ALTER TABLE public.invite_codes
  ADD CONSTRAINT chk_invite_codes_code_hash_sha256_hex
  CHECK (code_hash ~ '^[0-9A-Fa-f]{64}$');

ALTER TABLE public.invite_codes
  DROP CONSTRAINT IF EXISTS chk_invite_codes_single_use;

ALTER TABLE public.invite_codes
  ADD CONSTRAINT chk_invite_codes_single_use
  CHECK (
    max_uses = 1
    AND used_count BETWEEN 0 AND max_uses
  );

ALTER TABLE public.invite_codes
  DROP CONSTRAINT IF EXISTS chk_invite_codes_usage_pair;

ALTER TABLE public.invite_codes
  ADD CONSTRAINT chk_invite_codes_usage_pair
  CHECK (
    (used_count = 0 AND used_at IS NULL AND used_by IS NULL)
    OR
    (used_count = max_uses AND used_at IS NOT NULL AND used_by IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_invite_codes_code_hash
  ON public.invite_codes(code_hash);

CREATE INDEX IF NOT EXISTS idx_invite_codes_org_active
  ON public.invite_codes(organization_id, expires_at)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invite_codes_used_by
  ON public.invite_codes(used_by, used_at DESC)
  WHERE used_at IS NOT NULL;

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invite_codes_select_admin_scope ON public.invite_codes;
CREATE POLICY invite_codes_select_admin_scope
  ON public.invite_codes
  FOR SELECT
  USING (public.can_manage_invite_codes(organization_id));

DROP POLICY IF EXISTS invite_codes_insert_admin_scope ON public.invite_codes;
CREATE POLICY invite_codes_insert_admin_scope
  ON public.invite_codes
  FOR INSERT
  WITH CHECK (public.can_manage_invite_codes(organization_id));

DROP POLICY IF EXISTS invite_codes_update_admin_scope ON public.invite_codes;
CREATE POLICY invite_codes_update_admin_scope
  ON public.invite_codes
  FOR UPDATE
  USING (public.can_manage_invite_codes(organization_id))
  WITH CHECK (public.can_manage_invite_codes(organization_id));

COMMENT ON TABLE public.invite_codes IS 'Single-use invite code store for user instant-approval signup flow.';
COMMENT ON COLUMN public.invite_codes.code_hash IS '64-character SHA-256 hex digest of invite token. Raw invite code must never be stored.';
COMMENT ON COLUMN public.invite_codes.expires_at IS 'Mandatory invite expiration timestamp. Values must be later than created_at.';
COMMENT ON COLUMN public.invite_codes.role_scope IS 'Invite role scope. P2 canonical model restricts this to user.';
COMMENT ON COLUMN public.invite_codes.max_uses IS 'Fixed to 1 in P2 canonical contract.';
COMMENT ON COLUMN public.invite_codes.used_count IS '0=unused, 1=consumed. Values above 1 are forbidden.';

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
-- SELECT id, max_uses, used_count, used_at, used_by
-- FROM public.invite_codes
-- WHERE NOT (
--   (max_uses = 1 AND used_count = 0 AND used_at IS NULL AND used_by IS NULL)
--   OR
--   (max_uses = 1 AND used_count = 1 AND used_at IS NOT NULL AND used_by IS NOT NULL)
-- );

COMMIT;
