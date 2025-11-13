#!/usr/bin/env node
/**
 * Supabase 회원가입 플로우 테스트 스크립트
 * 사용법: node scripts/test-registration-flow.js
 */

import { createClient } from '@supabase/supabase-js';

// 환경 변수 설정 (실제 환경에서는 .env 파일 사용)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

if (
  !SUPABASE_URL.includes('localhost') &&
  !SUPABASE_URL.includes('supabase.co')
) {
  console.error('❌ SUPABASE_URL이 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 테스트 사용자 데이터
 */
const testUsers = [
  {
    email: 'test-admin@example.com',
    password: 'testpass123',
    fullName: '테스트 관리자',
    organizationName: 'Test Hospital',
    businessType: '병원',
    department: 'IT부',
    position: '시스템 관리자',
  },
  {
    email: 'test-user@example.com',
    password: 'testpass123',
    fullName: '테스트 사용자',
    organizationName: 'Test Hospital',
    businessType: '병원',
    department: '간호부',
    position: '간호사',
  },
];

/**
 * 사용자 등록 테스트
 */
async function testUserRegistration(userData) {
  console.log(`\n🔄 사용자 등록 테스트: ${userData.email}`);

  try {
    // 1. 회원가입
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName,
          organization_name: userData.organizationName,
          business_type: userData.businessType,
          department: userData.department,
          position: userData.position,
          username: userData.fullName.replaceAll(/\s+/g, '').toLowerCase(),
        },
      },
    });

    if (error) {
      console.error(`❌ 회원가입 실패: ${error.message}`);
      return false;
    }

    if (!data.user) {
      console.error('❌ 사용자 데이터가 없습니다.');
      return false;
    }

    console.log(`✅ 회원가입 성공: ${data.user.id}`);

    // 2. 잠시 기다린 후 데이터베이스 확인 (트리거 실행 시간)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. 프로필 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error(`❌ 프로필 조회 실패: ${profileError.message}`);
    } else if (profile) {
      console.log(`✅ 프로필 생성됨: ${profile.full_name}`);
    } else {
      console.error('❌ 프로필이 생성되지 않았습니다.');
    }

    // 4. 조직-사용자 관계 확인
    const { data: orgUser, error: orgUserError } = await supabase
      .from('organization_users')
      .select(
        `
        *,
        organizations(name, business_type)
      `,
      )
      .eq('user_id', data.user.id)
      .single();

    if (orgUserError) {
      console.error(`❌ 조직-사용자 관계 조회 실패: ${orgUserError.message}`);
    } else if (orgUser) {
      console.log(
        `✅ 조직 관계 생성됨: ${orgUser.organizations.name}, 역할: ${orgUser.role}`,
      );
    } else {
      console.error('❌ 조직-사용자 관계가 생성되지 않았습니다.');
    }

    // 5. 권한 확인
    try {
      const { data: permissions, error: permError } = await supabase.rpc(
        'get_user_permissions',
        {
          target_user_id: data.user.id,
        },
      );

      if (permError) {
        console.warn(`⚠️ 권한 조회 실패: ${permError.message}`);
      } else if (permissions && permissions.length > 0) {
        console.log(`✅ 권한 확인됨: ${permissions.length}개 권한`);
      } else {
        console.warn('⚠️ 권한이 없습니다.');
      }
    } catch (error_) {
      console.warn(`⚠️ 권한 RPC 함수 호출 실패: ${error_.message}`);
    }

    return true;
  } catch (error) {
    console.error(`❌ 전체 테스트 실패: ${error.message}`);
    return false;
  }
}

/**
 * 로그인 테스트
 */
async function testUserLogin(email, password) {
  console.log(`\n🔄 로그인 테스트: ${email}`);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(`❌ 로그인 실패: ${error.message}`);
      return false;
    }

    console.log(`✅ 로그인 성공: ${data.user.email}`);

    // 사용자 정보 조회 테스트
    const { data: userInfo, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error(`❌ 사용자 정보 조회 실패: ${userError.message}`);
    } else {
      console.log(`✅ 사용자 정보 조회 성공: ${userInfo.user.email}`);
    }

    return true;
  } catch (error) {
    console.error(`❌ 로그인 테스트 실패: ${error.message}`);
    return false;
  }
}

/**
 * 데이터 정리
 */
async function cleanupTestData() {
  console.log('\n🧹 테스트 데이터 정리 중...');

  for (const userData of testUsers) {
    try {
      // 사용자 삭제는 Supabase Dashboard에서 수동으로 해야 함
      console.log(`⚠️ ${userData.email} 사용자는 수동으로 삭제해주세요.`);
    } catch (error) {
      console.warn(`⚠️ ${userData.email} 정리 중 오류: ${error.message}`);
    }
  }
}

/**
 * 메인 테스트 실행
 */
async function runTests() {
  console.log('🧪 Supabase 회원가입 플로우 테스트 시작\n');

  let successCount = 0;
  const totalTests = testUsers.length;

  // 각 사용자별 등록 테스트
  for (const userData of testUsers) {
    const success = await testUserRegistration(userData);
    if (success) successCount++;

    // 테스트 간 간격
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 로그인 테스트
  for (const userData of testUsers) {
    const success = await testUserLogin(userData.email, userData.password);
    if (success) {
      // 로그인 후 로그아웃
      await supabase.auth.signOut();
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 결과 요약
  console.log('\n📊 테스트 결과 요약:');
  console.log(`✅ 성공: ${successCount}/${totalTests}`);
  console.log(`❌ 실패: ${totalTests - successCount}/${totalTests}`);

  if (successCount === totalTests) {
    console.log('\n🎉 모든 테스트가 성공했습니다!');
  } else {
    console.log('\n⚠️ 일부 테스트가 실패했습니다. 로그를 확인해주세요.');
  }

  // 정리 안내
  await cleanupTestData();
}

// 테스트 실행
runTests().catch(console.error);

export { testUserLogin, testUserRegistration };
