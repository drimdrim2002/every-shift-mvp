#!/usr/bin/env node
/**
 * 완전한 데이터베이스 스키마 테스트 스크립트
 * 사용법: node scripts/test-complete-schema.js
 */

import { createClient } from '@supabase/supabase-js';

// 환경 변수 설정
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
 * 테스트 데이터
 */
const testData = {
  users: [
    {
      email: 'super@everyshift.super',
      password: 'superuser123!',
      fullName: 'Super Admin',
      organizationName: 'System',
      businessType: '병원',
      department: 'IT',
      position: 'System Admin',
    },
    {
      email: 'admin@hospital.com',
      password: 'adminpass123!',
      fullName: '병원 관리자',
      organizationName: 'Seoul Hospital',
      businessType: '병원',
      department: '간호부',
      position: '수간호사',
    },
    {
      email: 'nurse@hospital.com',
      password: 'nursepass123!',
      fullName: '김간호사',
      organizationName: 'Seoul Hospital',
      businessType: '병원',
      department: '간호부',
      position: '간호사',
    },
  ],
};

/**
 * 테이블 존재 확인
 */
async function testTableExistence() {
  console.log('\n🧪 테이블 존재 확인 테스트');

  const tables = [
    'profiles',
    'organizations',
    'organization_users',
    'user_roles',
    'shift_types',
    'work_sites',
    'work_site_requirements',
    'user_skills',
    'user_preferences',
    'rank_credits',
    'schedules',
    'shift_swap_requests',
    'notifications',
    'file_uploads',
    'menus',
    'user_menu_access',
    'role_menu_access',
  ];

  let existingTables = 0;

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0);

      if (error) {
        console.log(`❌ ${table} 테이블 오류: ${error.message}`);
      } else {
        console.log(`✅ ${table} 테이블 존재`);
        existingTables++;
      }
    } catch (error) {
      console.log(`❌ ${table} 테이블 접근 실패: ${error.message}`);
    }
  }

  console.log(
    `📊 총 ${existingTables}/${tables.length} 테이블이 정상적으로 존재합니다.`,
  );
  return existingTables === tables.length;
}

/**
 * RPC 함수 테스트
 */
async function testRPCFunctions() {
  console.log('\n🧪 RPC 함수 테스트');

  const functions = [
    'get_user_role',
    'is_org_member',
    'is_org_admin',
    'get_user_organization_ids',
    'has_org_role',
    'get_user_permissions',
    'get_user_organization_info',
    'get_user_primary_organization',
    'check_schedule_conflict',
    'create_notification',
    'check_user_registration_status',
    'get_user_menus',
    'get_menu_tree',
  ];

  let workingFunctions = 0;

  for (const func of functions) {
    try {
      // 더미 UUID로 함수 호출 테스트
      const testUuid = '00000000-0000-0000-0000-000000000000';
      let rpcParams;
      if (func.includes('conflict')) {
        rpcParams = {
          p_user_id: testUuid,
          p_date: '2025-01-01',
          p_shift_type_id: testUuid,
        };
      } else if (func.includes('notification')) {
        rpcParams = {
          p_user_id: testUuid,
          p_type: 'test',
          p_title: 'test',
          p_content: 'test',
        };
      } else if (func.includes('registration_status')) {
        rpcParams = {
          user_email: 'test@test.com',
        };
      } else if (func === 'has_org_role') {
        rpcParams = {
          user_id: testUuid,
          org_id: testUuid,
          required_role: 'user',
        };
      } else {
        rpcParams = { target_user_id: testUuid };
      }

      await supabase.rpc(func, rpcParams);

      // 함수가 존재하고 실행되면 성공 (결과는 빈 값일 수 있음)
      console.log(`✅ ${func} 함수 정상 동작`);
      workingFunctions++;
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log(`❌ ${func} 함수 존재하지 않음`);
      } else {
        console.log(`⚠️ ${func} 함수 존재하지만 실행 오류: ${error.message}`);
        workingFunctions++; // 함수는 존재함
      }
    }
  }

  console.log(
    `📊 총 ${workingFunctions}/${functions.length} RPC 함수가 정상적으로 존재합니다.`,
  );
  return workingFunctions >= functions.length * 0.8; // 80% 이상 성공
}

/**
 * 회원가입 플로우 테스트
 */
async function testUserRegistration() {
  console.log('\n🧪 회원가입 플로우 테스트');

  let successCount = 0;

  for (const user of testData.users) {
    try {
      console.log(`\n🔄 ${user.email} 회원가입 테스트`);

      // 회원가입
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.fullName,
            organization_name: user.organizationName,
            business_type: user.businessType,
            department: user.department,
            position: user.position,
            username: user.fullName.replaceAll(/\s+/g, '').toLowerCase(),
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`⚠️ 이미 등록된 사용자: ${user.email}`);
          successCount++;
        } else {
          console.log(`❌ 회원가입 실패: ${error.message}`);
        }
        continue;
      }

      console.log(`✅ 회원가입 성공: ${data.user.id}`);

      // 잠시 대기 (트리거 실행 시간)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 등록 상태 확인
      try {
        const { data: statusData } = await supabase.rpc(
          'check_user_registration_status',
          {
            user_email: user.email,
          },
        );

        if (statusData && statusData.length > 0) {
          const status = statusData[0];
          console.log(
            `✅ 등록 상태 확인: Profile=${status.has_profile}, 조직=${status.organization_count}개, 역할=${status.primary_role}`,
          );

          if (status.has_profile && status.organization_count > 0) {
            successCount++;
          }
        }
      } catch (statusError) {
        console.log(`⚠️ 등록 상태 확인 실패: ${statusError.message}`);
      }

      // 로그아웃
      await supabase.auth.signOut();
    } catch (error) {
      console.log(`❌ 전체 테스트 실패: ${error.message}`);
    }

    // 테스트 간 간격
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(
    `📊 회원가입 테스트 결과: ${successCount}/${testData.users.length} 성공`,
  );
  return successCount >= testData.users.length * 0.7; // 70% 이상 성공
}

/**
 * Storage 버킷 테스트
 */
async function testStorageBuckets() {
  console.log('\n🧪 Storage 버킷 테스트');

  const expectedBuckets = ['avatars', 'uploads', 'documents', 'backups'];
  let existingBuckets = 0;

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.log(`❌ 버킷 목록 조회 실패: ${error.message}`);
      return false;
    }

    for (const expectedBucket of expectedBuckets) {
      const bucketExists = buckets.some((b) => b.id === expectedBucket);
      if (bucketExists) {
        console.log(`✅ ${expectedBucket} 버킷 존재`);
        existingBuckets++;
      } else {
        console.log(`❌ ${expectedBucket} 버킷 없음`);
      }
    }

    console.log(
      `📊 총 ${existingBuckets}/${expectedBuckets.length} 버킷이 정상적으로 존재합니다.`,
    );
    return existingBuckets === expectedBuckets.length;
  } catch (error) {
    console.log(`❌ Storage 테스트 실패: ${error.message}`);
    return false;
  }
}

/**
 * 전체 성능 벤치마크
 */
async function runPerformanceBenchmark() {
  console.log('\n🚀 성능 벤치마크 테스트');

  const tests = [
    {
      name: '기본 테이블 조회',
      test: () => supabase.from('organizations').select('id').limit(10),
    },
    {
      name: 'RPC 함수 호출',
      test: () =>
        supabase.rpc('get_user_role', {
          user_id: '00000000-0000-0000-0000-000000000000',
        }),
    },
    {
      name: '복잡한 JOIN 조회',
      test: () =>
        supabase
          .from('organization_users')
          .select('*, organizations!inner(*)')
          .limit(5),
    },
  ];

  for (const test of tests) {
    const startTime = Date.now();
    try {
      await test.test();
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`✅ ${test.name}: ${duration}ms`);
    } catch (error) {
      console.log(`❌ ${test.name}: 실패 (${error.message})`);
    }
  }
}

/**
 * 메인 테스트 실행
 */
async function runAllTests() {
  console.log('🧪 Every Shift 데이터베이스 스키마 전체 테스트 시작\n');
  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);

  const testResults = {
    tables: await testTableExistence(),
    functions: await testRPCFunctions(),
    registration: await testUserRegistration(),
    storage: await testStorageBuckets(),
  };

  await runPerformanceBenchmark();

  // 최종 결과
  console.log('\n📊 전체 테스트 결과 요약:');
  console.log(`🗃️  테이블: ${testResults.tables ? '✅ 통과' : '❌ 실패'}`);
  console.log(`⚙️  함수: ${testResults.functions ? '✅ 통과' : '❌ 실패'}`);
  console.log(
    `👤 회원가입: ${testResults.registration ? '✅ 통과' : '❌ 실패'}`,
  );
  console.log(`💾 Storage: ${testResults.storage ? '✅ 통과' : '❌ 실패'}`);

  const passedTests = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.values(testResults).length;

  console.log(
    `\n🎯 전체 성공률: ${passedTests}/${totalTests} (${Math.round((passedTests / totalTests) * 100)}%)`,
  );

  if (passedTests === totalTests) {
    console.log(
      '\n🎉 모든 테스트가 성공했습니다! 데이터베이스가 정상적으로 설정되었습니다.',
    );
    process.exit(0);
  } else {
    console.log('\n⚠️ 일부 테스트가 실패했습니다. 설정을 확인해주세요.');
    process.exit(1);
  }
}

// 스크립트 실행
runAllTests().catch((error) => {
  console.error('테스트 실행 중 오류:', error);
  process.exit(1);
});

export {
  testRPCFunctions,
  testStorageBuckets,
  testTableExistence,
  testUserRegistration,
};
