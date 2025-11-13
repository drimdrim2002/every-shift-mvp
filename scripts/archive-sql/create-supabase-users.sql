-- Supabase Auth 사용자 생성 스크립트
-- 이 스크립트는 Supabase Dashboard > SQL Editor에서 실행해주세요

BEGIN;

-- 1. vben@vben.local 사용자 생성
WITH user_data AS (
  SELECT
    gen_random_uuid() AS id,
    '00000000-0000-0000-0000-000000000000'::uuid AS instance_id,
    'authenticated' AS aud,
    'authenticated' AS role,
    'vben@vben.local' AS email,
    crypt('123456', gen_salt('bf')) AS encrypted_password,
    now() AS email_confirmed_at,
    now() AS last_sign_in_at,
    '{"provider":"email","providers":["email"]}'::jsonb AS raw_app_meta_data,
    '{"username":"vben","realName":"Vben"}'::jsonb AS raw_user_meta_data,
    now() AS created_at,
    now() AS updated_at
),
inserted_user AS (
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at
  )
  SELECT * FROM user_data
  RETURNING id, email
)
-- auth.identities 테이블에도 추가
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  inserted_user.id,
  format('{"sub":"%s","email":"%s"}', inserted_user.id::text, inserted_user.email)::jsonb,
  'email',
  now(),
  now(),
  now()
FROM inserted_user;

-- 2. admin@vben.local 사용자 생성
WITH user_data AS (
  SELECT
    gen_random_uuid() AS id,
    '00000000-0000-0000-0000-000000000000'::uuid AS instance_id,
    'authenticated' AS aud,
    'authenticated' AS role,
    'admin@vben.local' AS email,
    crypt('123456', gen_salt('bf')) AS encrypted_password,
    now() AS email_confirmed_at,
    now() AS last_sign_in_at,
    '{"provider":"email","providers":["email"]}'::jsonb AS raw_app_meta_data,
    '{"username":"admin","realName":"Admin"}'::jsonb AS raw_user_meta_data,
    now() AS created_at,
    now() AS updated_at
),
inserted_user AS (
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at
  )
  SELECT * FROM user_data
  RETURNING id, email
)
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  inserted_user.id,
  format('{"sub":"%s","email":"%s"}', inserted_user.id::text, inserted_user.email)::jsonb,
  'email',
  now(),
  now(),
  now()
FROM inserted_user;

-- 3. jack@vben.local 사용자 생성
WITH user_data AS (
  SELECT
    gen_random_uuid() AS id,
    '00000000-0000-0000-0000-000000000000'::uuid AS instance_id,
    'authenticated' AS aud,
    'authenticated' AS role,
    'jack@vben.local' AS email,
    crypt('123456', gen_salt('bf')) AS encrypted_password,
    now() AS email_confirmed_at,
    now() AS last_sign_in_at,
    '{"provider":"email","providers":["email"]}'::jsonb AS raw_app_meta_data,
    '{"username":"jack","realName":"Jack"}'::jsonb AS raw_user_meta_data,
    now() AS created_at,
    now() AS updated_at
),
inserted_user AS (
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at
  )
  SELECT * FROM user_data
  RETURNING id, email
)
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  inserted_user.id,
  format('{"sub":"%s","email":"%s"}', inserted_user.id::text, inserted_user.email)::jsonb,
  'email',
  now(),
  now(),
  now()
FROM inserted_user;

COMMIT;

-- 생성된 사용자 확인
SELECT id, email, encrypted_password IS NOT NULL as has_password, email_confirmed_at, created_at
FROM auth.users
WHERE email IN ('vben@vben.local', 'admin@vben.local', 'jack@vben.local')
ORDER BY created_at DESC;
