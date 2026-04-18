CREATE OR REPLACE FUNCTION public.submit_admin_signup_atomic(
  p_user_id uuid,
  p_organization_id uuid,
  p_display_name text,
  p_requested_site_name text
)
RETURNS TABLE (
  signup_request_id uuid,
  organization_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup_request_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_organization_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_signup_payload';
  END IF;

  PERFORM 1
  FROM public.organizations
  WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'organization_not_found';
  END IF;

  PERFORM 1
  FROM public.signup_requests sr
  WHERE sr.requester_user_id = p_user_id
    AND sr.organization_id = p_organization_id
    AND sr.requested_role = 'admin'
    AND sr.status = 'pending';

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'duplicate_signup_request';
  END IF;

  INSERT INTO public.profiles (
    id,
    global_role,
    account_status,
    organization_id,
    role,
    display_name,
    status
  )
  VALUES (
    p_user_id,
    'user',
    'pending',
    p_organization_id,
    'admin',
    NULLIF(trim(p_display_name), ''),
    'inactive'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    global_role = 'user',
    account_status = 'pending',
    organization_id = EXCLUDED.organization_id,
    role = 'admin',
    display_name = EXCLUDED.display_name,
    status = 'inactive',
    updated_at = now();

  INSERT INTO public.signup_requests (
    requester_user_id,
    organization_id,
    requested_role,
    status,
    requested_site_name
  )
  VALUES (
    p_user_id,
    p_organization_id,
    'admin',
    'pending',
    NULLIF(trim(p_requested_site_name), '')
  )
  RETURNING id INTO v_signup_request_id;

  RETURN QUERY
  SELECT
    v_signup_request_id,
    p_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_admin_signup_atomic(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_admin_signup_atomic(uuid, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.redeem_user_invite_signup_atomic(
  p_user_id uuid,
  p_organization_id uuid,
  p_display_name text,
  p_invite_code_hash text
)
RETURNS TABLE (
  signup_request_id uuid,
  membership_id uuid,
  organization_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_invite public.invite_codes%ROWTYPE;
  v_signup_request_id uuid;
  v_membership_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_organization_id IS NULL OR p_invite_code_hash IS NULL OR length(trim(p_invite_code_hash)) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_signup_payload';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.invite_codes ic
  WHERE ic.organization_id = p_organization_id
    AND ic.code_hash = trim(p_invite_code_hash)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_invite_code_not_found';
  END IF;

  IF v_invite.role_scope <> 'user' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_invite_code_role_scope';
  END IF;

  IF v_invite.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_invite_code_revoked';
  END IF;

  IF v_invite.expires_at <= v_now THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_invite_code_expired';
  END IF;

  IF COALESCE(v_invite.used_count, 0) >= GREATEST(COALESCE(v_invite.max_uses, 1), 1)
    OR v_invite.used_at IS NOT NULL
    OR v_invite.used_by IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_invite_code_used';
  END IF;

  PERFORM 1
  FROM public.organization_memberships om
  WHERE om.organization_id = p_organization_id
    AND om.user_id = p_user_id
    AND om.status = 'approved';

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'duplicate_approved_membership';
  END IF;

  UPDATE public.invite_codes
  SET
    used_count = GREATEST(COALESCE(max_uses, 1), 1),
    used_at = v_now,
    used_by = p_user_id,
    updated_at = v_now
  WHERE id = v_invite.id;

  INSERT INTO public.profiles (
    id,
    global_role,
    account_status,
    organization_id,
    role,
    display_name,
    status
  )
  VALUES (
    p_user_id,
    'user',
    'active',
    p_organization_id,
    'user',
    NULLIF(trim(p_display_name), ''),
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    global_role = 'user',
    account_status = 'active',
    organization_id = EXCLUDED.organization_id,
    role = 'user',
    display_name = EXCLUDED.display_name,
    status = 'active',
    updated_at = now();

  INSERT INTO public.organization_memberships (
    organization_id,
    user_id,
    role,
    status,
    approved_by,
    approved_at,
    rejection_reason
  )
  VALUES (
    p_organization_id,
    p_user_id,
    'user',
    'approved',
    p_user_id,
    v_now,
    NULL
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET
    role = 'user',
    status = 'approved',
    approved_by = EXCLUDED.approved_by,
    approved_at = EXCLUDED.approved_at,
    rejection_reason = NULL,
    updated_at = now()
  RETURNING id INTO v_membership_id;

  INSERT INTO public.signup_requests (
    requester_user_id,
    organization_id,
    requested_role,
    status,
    reviewed_by,
    reviewed_at,
    review_note
  )
  VALUES (
    p_user_id,
    p_organization_id,
    'user',
    'approved',
    p_user_id,
    v_now,
    'invite_auto_approved'
  )
  RETURNING id INTO v_signup_request_id;

  INSERT INTO public.approval_logs (
    signup_request_id,
    membership_id,
    organization_id,
    actor_user_id,
    target_user_id,
    action,
    reason,
    metadata,
    created_at
  )
  VALUES (
    v_signup_request_id,
    v_membership_id,
    p_organization_id,
    p_user_id,
    p_user_id,
    'approve',
    NULL,
    jsonb_build_object(
      'source', 'invite_auto_approve',
      'invite_code_hash', trim(p_invite_code_hash),
      'requested_role', 'user'
    ),
    v_now
  );

  RETURN QUERY
  SELECT
    v_signup_request_id,
    v_membership_id,
    p_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_user_invite_signup_atomic(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_user_invite_signup_atomic(uuid, uuid, text, text) TO service_role;
