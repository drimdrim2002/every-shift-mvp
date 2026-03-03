-- ============================================================================
-- EveryShift Service Transition - P1-3.4 Superuser Bootstrap Function
-- File: 011_superuser_grant_function.sql
-- Purpose:
--   1) Provide reusable SQL function to grant super privileges by email
--   2) Upsert profiles role/status and optional organization admin memberships
--   3) Guarantee idempotent rerun behavior
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.grant_superuser(
  target_email TEXT,
  target_organization_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  target_user_id UUID,
  normalized_email TEXT,
  profile_upserted BOOLEAN,
  membership_upserted_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_user_id UUID;
  v_normalized_email TEXT;
  v_org_id UUID;
  v_membership_count INTEGER := 0;
BEGIN
  v_normalized_email := LOWER(BTRIM(target_email));

  IF v_normalized_email IS NULL OR v_normalized_email = '' THEN
    RAISE EXCEPTION 'grant_superuser failed: target_email is required';
  END IF;

  SELECT u.id
  INTO v_target_user_id
  FROM auth.users u
  WHERE LOWER(BTRIM(u.email)) = v_normalized_email
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION
      'grant_superuser failed: auth user not found for email=%',
      v_normalized_email;
  END IF;

  INSERT INTO public.profiles (
    id,
    global_role,
    account_status,
    created_at,
    updated_at
  )
  VALUES (
    v_target_user_id,
    'super',
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    global_role = 'super',
    account_status = 'active',
    updated_at = NOW();

  IF target_organization_ids IS NOT NULL
     AND ARRAY_LENGTH(target_organization_ids, 1) > 0 THEN
    FOR v_org_id IN
      SELECT DISTINCT org_id
      FROM UNNEST(target_organization_ids) AS org_id
      WHERE org_id IS NOT NULL
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE o.id = v_org_id
      ) THEN
        RAISE EXCEPTION
          'grant_superuser failed: organization not found id=%',
          v_org_id;
      END IF;

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
        v_org_id,
        v_target_user_id,
        'admin',
        'approved',
        NULL,
        NOW(),
        NULL,
        NOW(),
        NOW()
      )
      ON CONFLICT (organization_id, user_id) DO UPDATE
      SET
        role = 'admin',
        status = 'approved',
        approved_by = NULL,
        approved_at = COALESCE(public.organization_memberships.approved_at, EXCLUDED.approved_at),
        rejection_reason = NULL,
        updated_at = NOW();

      v_membership_count := v_membership_count + 1;
    END LOOP;
  END IF;

  RETURN QUERY
  SELECT
    v_target_user_id,
    v_normalized_email,
    TRUE,
    v_membership_count;
END;
$$;

COMMENT ON FUNCTION public.grant_superuser(TEXT, UUID[]) IS
  'Grants super profile to a Console-created auth user and optionally upserts approved admin memberships for specified organizations. Designed to be idempotent.';

COMMIT;

