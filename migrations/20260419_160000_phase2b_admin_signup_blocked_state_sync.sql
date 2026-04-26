-- Align admin signup blocked-state persistence with membership-backed RBAC.

DROP FUNCTION IF EXISTS public.submit_admin_signup_atomic(uuid, uuid, text, text, text);

CREATE FUNCTION public.submit_admin_signup_atomic(
  p_user_id uuid,
  p_organization_id uuid,
  p_display_name text,
  p_requested_site_name text,
  p_requester_email text
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
  FROM public.organizations o
  WHERE o.id = p_organization_id;

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

  PERFORM 1
  FROM public.organization_memberships om
  WHERE om.organization_id = p_organization_id
    AND om.user_id = p_user_id
    AND lower(coalesce(om.status, 'pending')) = 'approved';

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'duplicate_approved_membership';
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
  VALUES (
    p_organization_id,
    p_user_id,
    'admin',
    'pending',
    NULL,
    NULL,
    NULL,
    now(),
    now()
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET
    role = 'admin',
    status = 'pending',
    approved_by = NULL,
    approved_at = NULL,
    rejection_reason = NULL,
    updated_at = now()
  WHERE lower(coalesce(public.organization_memberships.status, 'pending')) <> 'approved';

  INSERT INTO public.signup_requests (
    requester_user_id,
    requester_email,
    organization_id,
    requested_role,
    status,
    requested_site_name
  )
  VALUES (
    p_user_id,
    NULLIF(trim(p_requester_email), ''),
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

REVOKE ALL ON FUNCTION public.submit_admin_signup_atomic(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_admin_signup_atomic(uuid, uuid, text, text, text) TO service_role;

WITH latest_admin_requests AS (
  SELECT DISTINCT ON (sr.requester_user_id, sr.organization_id)
    sr.requester_user_id,
    sr.organization_id,
    lower(coalesce(sr.status, 'pending')) AS request_status,
    NULLIF(trim(coalesce(sr.review_note, '')), '') AS review_note,
    COALESCE(sr.reviewed_at, sr.created_at, now()) AS request_created_at
  FROM public.signup_requests sr
  WHERE sr.requested_role = 'admin'
    AND sr.requester_user_id IS NOT NULL
    AND sr.organization_id IS NOT NULL
    AND lower(coalesce(sr.status, 'pending')) IN ('pending', 'rejected')
  ORDER BY
    sr.requester_user_id,
    sr.organization_id,
    COALESCE(sr.reviewed_at, sr.created_at, now()) DESC,
    sr.created_at DESC,
    sr.id DESC
),
blocked_admin_requests AS (
  SELECT lar.*
  FROM latest_admin_requests lar
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.organization_id = lar.organization_id
      AND om.user_id = lar.requester_user_id
      AND lower(coalesce(om.role, 'user')) = 'admin'
      AND lower(coalesce(om.status, 'pending')) = 'approved'
  )
)
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
  bar.organization_id,
  bar.requester_user_id,
  'admin',
  bar.request_status,
  NULL,
  NULL,
  CASE
    WHEN bar.request_status = 'rejected' THEN bar.review_note
    ELSE NULL
  END,
  bar.request_created_at,
  now()
FROM blocked_admin_requests bar
ON CONFLICT (organization_id, user_id) DO UPDATE
SET
  role = 'admin',
  status = EXCLUDED.status,
  approved_by = NULL,
  approved_at = NULL,
  rejection_reason = EXCLUDED.rejection_reason,
  updated_at = now()
WHERE lower(coalesce(public.organization_memberships.status, 'pending')) <> 'approved';

UPDATE public.profiles p
SET
  account_status = 'active',
  role = 'admin',
  status = 'active',
  updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM public.organization_memberships om
  WHERE om.user_id = p.id
    AND lower(coalesce(om.role, 'user')) = 'admin'
    AND lower(coalesce(om.status, 'pending')) = 'approved'
)
  AND (
    lower(coalesce(p.account_status, 'pending')) <> 'active'
    OR lower(coalesce(p.role, 'user')) <> 'admin'
    OR lower(coalesce(p.status, 'inactive')) <> 'active'
  );

WITH latest_pending_admin_requests AS (
  SELECT *
  FROM (
    SELECT DISTINCT ON (sr.requester_user_id, sr.organization_id)
      sr.requester_user_id,
      sr.organization_id,
      lower(coalesce(sr.status, 'pending')) AS request_status,
      COALESCE(sr.reviewed_at, sr.created_at, now()) AS request_created_at
    FROM public.signup_requests sr
    WHERE sr.requested_role = 'admin'
      AND sr.requester_user_id IS NOT NULL
      AND sr.organization_id IS NOT NULL
      AND lower(coalesce(sr.status, 'pending')) = 'pending'
    ORDER BY
      sr.requester_user_id,
      sr.organization_id,
      COALESCE(sr.reviewed_at, sr.created_at, now()) DESC,
      sr.created_at DESC,
      sr.id DESC
  ) pending_rows
)
UPDATE public.profiles p
SET
  account_status = 'pending',
  organization_id = COALESCE(p.organization_id, pending_rows.organization_id),
  role = 'admin',
  status = 'inactive',
  updated_at = now()
FROM latest_pending_admin_requests pending_rows
WHERE p.id = pending_rows.requester_user_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.user_id = p.id
      AND lower(coalesce(om.role, 'user')) = 'admin'
      AND lower(coalesce(om.status, 'pending')) = 'approved'
  );

WITH latest_rejected_admin_requests AS (
  SELECT *
  FROM (
    SELECT DISTINCT ON (sr.requester_user_id, sr.organization_id)
      sr.requester_user_id,
      sr.organization_id,
      lower(coalesce(sr.status, 'pending')) AS request_status,
      COALESCE(sr.reviewed_at, sr.created_at, now()) AS request_created_at
    FROM public.signup_requests sr
    WHERE sr.requested_role = 'admin'
      AND sr.requester_user_id IS NOT NULL
      AND sr.organization_id IS NOT NULL
      AND lower(coalesce(sr.status, 'pending')) = 'rejected'
    ORDER BY
      sr.requester_user_id,
      sr.organization_id,
      COALESCE(sr.reviewed_at, sr.created_at, now()) DESC,
      sr.created_at DESC,
      sr.id DESC
  ) rejected_rows
)
UPDATE public.profiles p
SET
  account_status = 'rejected',
  organization_id = COALESCE(p.organization_id, rejected_rows.organization_id),
  role = 'admin',
  status = 'inactive',
  updated_at = now()
FROM latest_rejected_admin_requests rejected_rows
WHERE p.id = rejected_rows.requester_user_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.user_id = p.id
      AND lower(coalesce(om.role, 'user')) = 'admin'
      AND lower(coalesce(om.status, 'pending')) = 'approved'
  );
