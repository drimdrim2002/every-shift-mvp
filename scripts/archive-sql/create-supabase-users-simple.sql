-- 간단한 Supabase 사용자 생성 함수 및 실행
-- 이 스크립트는 Supabase Dashboard > SQL Editor에서 실행해주세요

-- 1. 사용자 생성 함수 정의
CREATE OR REPLACE FUNCTION public.create_auth_user(
    user_email text,
    user_password text,
    user_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
    user_id uuid;
    encrypted_pw text;
BEGIN
    -- UUID 생성
    user_id := gen_random_uuid();

    -- 비밀번호 암호화
    encrypted_pw := crypt(user_password, gen_salt('bf'));

    -- auth.users에 사용자 추가
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, last_sign_in_at, raw_app_meta_data,
        raw_user_meta_data, created_at, updated_at
    ) VALUES (
        user_id,
        '00000000-0000-0000-0000-000000000000'::uuid,
        'authenticated',
        'authenticated',
        user_email,
        encrypted_pw,
        now(),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        user_metadata,
        now(),
        now()
    );

    -- auth.identities에 identity 추가
    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        user_id,
        format('{"sub":"%s","email":"%s"}', user_id::text, user_email)::jsonb,
        'email',
        now(),
        now(),
        now()
    );

    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 테스트 사용자들 생성
SELECT public.create_auth_user(
    'vben@vben.local',
    '123456',
    '{"username":"vben","realName":"Vben","department":"super"}'::jsonb
) AS vben_user_id;

SELECT public.create_auth_user(
    'admin@vben.local',
    '123456',
    '{"username":"admin","realName":"Admin","department":"admin"}'::jsonb
) AS admin_user_id;

SELECT public.create_auth_user(
    'jack@vben.local',
    '123456',
    '{"username":"jack","realName":"Jack","department":"user"}'::jsonb
) AS jack_user_id;

-- 3. 생성된 사용자 확인
SELECT
    id,
    email,
    raw_user_meta_data->>'username' as username,
    raw_user_meta_data->>'realName' as real_name,
    raw_user_meta_data->>'department' as department,
    email_confirmed_at IS NOT NULL as email_confirmed,
    created_at
FROM auth.users
WHERE email IN ('vben@vben.local', 'admin@vben.local', 'jack@vben.local')
ORDER BY created_at DESC;

-- 4. 함수 삭제 (선택사항)
-- DROP FUNCTION IF EXISTS public.create_auth_user CASCADE;
