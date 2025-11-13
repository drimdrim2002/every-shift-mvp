#!/usr/bin/env node

/**
 * Supabase 연동 통합 테스트 스크립트
 *
 * 사용법:
 * node scripts/test-supabase-integration.js
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

// 환경 변수 로드
const envPath = join(process.cwd(), '.env.local');
const envVars = {};

try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').split('#')[0].trim();
      envVars[key.trim()] = value;
    }
  });
} catch (error) {
  console.error('❌ .env.local 파일을 읽을 수 없습니다:', error.message);
  process.exit(1);
}

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.log('필요한 환경 변수:');
  console.log('- VITE_SUPABASE_URL');
  console.log('- VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🚀 Supabase 연동 테스트 시작\n');

// Supabase 클라이언트 생성
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 테스트 결과 추적
const testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

// 테스트 헬퍼 함수
function logTest(name, success, message = '') {
  const status = success ? '✅' : '❌';
  const fullMessage = `${status} ${name}${message ? `: ${message}` : ''}`;
  console.log(fullMessage);

  testResults.tests.push({ name, success, message });
  if (success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

// 1. 기본 연결 테스트
async function testConnection() {
  console.log('📡 기본 연결 테스트');

  try {
    const { data: _data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      // PGRST116은 데이터가 없음을 의미
      throw error;
    }

    logTest('Supabase 연결', true, 'Database 연결 성공');
    return true;
  } catch (error) {
    logTest('Supabase 연결', false, error.message);
    return false;
  }
}

// 2. 데이터베이스 스키마 테스트
async function testDatabaseSchema() {
  console.log('\n🗄️ 데이터베이스 스키마 테스트');

  const requiredTables = [
    'profiles',
    'permissions',
    'user_roles',
    'role_permissions',
    'menus',
    'products',
    'file_uploads',
  ];

  let allTablesExist = true;

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      logTest(`테이블 ${table}`, true, '존재함');
    } catch (error) {
      logTest(`테이블 ${table}`, false, `없음 또는 오류: ${error.message}`);
      allTablesExist = false;
    }
  }

  return allTablesExist;
}

// 3. RPC 함수 테스트
async function testRPCFunctions() {
  console.log('\n⚙️ RPC 함수 테스트');

  const rpcFunctions = [
    'get_user_roles',
    'user_has_permission',
    'user_has_role',
    'get_user_permissions',
    'get_menu_tree',
    'search_products',
  ];

  let allRPCWork = true;

  for (const func of rpcFunctions) {
    try {
      // 테스트용 더미 ID (존재하지 않아도 함수 호출은 가능해야 함)
      const testId = '00000000-0000-0000-0000-000000000000';

      let result;
      switch (func) {
        case 'get_menu_tree':
        case 'get_user_permissions':
        case 'get_user_roles': {
          result = await supabase.rpc(func, { target_user_id: testId });

          break;
        }
        case 'search_products': {
          result = await supabase.rpc(func, { page_size: 1, page_number: 1 });

          break;
        }
        case 'user_has_permission': {
          result = await supabase.rpc(func, {
            target_user_id: testId,
            permission_name: 'test',
          });

          break;
        }
        case 'user_has_role': {
          result = await supabase.rpc(func, {
            target_user_id: testId,
            role_name: 'test',
          });

          break;
        }
        // No default
      }

      if (result.error) {
        // 일부 오류는 예상됨 (데이터가 없거나 권한 없음)
        if (
          result.error.code === 'PGRST116' ||
          result.error.message.includes('permission')
        ) {
          logTest(`RPC ${func}`, true, '함수 존재 (예상된 결과)');
        } else {
          throw result.error;
        }
      } else {
        logTest(`RPC ${func}`, true, '정상 호출');
      }
    } catch (error) {
      logTest(`RPC ${func}`, false, `오류: ${error.message}`);
      allRPCWork = false;
    }
  }

  return allRPCWork;
}

// 4. Storage 버킷 테스트
async function testStorageBuckets() {
  console.log('\n📁 Storage 버킷 테스트');

  const requiredBuckets = [
    'user-uploads',
    'avatars',
    'product-images',
    'documents',
  ];

  let allBucketsExist = true;

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      throw error;
    }

    const bucketNames = new Set(buckets.map((b) => b.name));

    for (const bucket of requiredBuckets) {
      const exists = bucketNames.has(bucket);
      logTest(`버킷 ${bucket}`, exists, exists ? '존재함' : '없음');
      if (!exists) allBucketsExist = false;
    }

    logTest('Storage 버킷 목록 조회', true, `${buckets.length}개 버킷 발견`);
  } catch (error) {
    logTest('Storage 버킷 테스트', false, error.message);
    allBucketsExist = false;
  }

  return allBucketsExist;
}

// 5. 인증 시스템 테스트 (익명)
async function testAuthSystem() {
  console.log('\n🔐 인증 시스템 테스트');

  try {
    // 현재 세션 확인
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    logTest('세션 조회', true, session ? '활성 세션 있음' : '세션 없음');

    // 사용자 정보 확인 (로그인되어 있다면)
    if (session) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      logTest('사용자 정보 조회', true, `사용자 ID: ${user?.id}`);

      // 프로필 조회 시도
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      logTest('프로필 조회', true, profile ? '프로필 있음' : '프로필 없음');
    }

    return true;
  } catch (error) {
    logTest('인증 시스템', false, error.message);
    return false;
  }
}

// 6. 성능 테스트
async function testPerformance() {
  console.log('\n⚡ 성능 테스트');

  // 간단한 쿼리 성능 측정
  const tests = [
    {
      name: '프로필 조회',
      query: () => supabase.from('profiles').select('*').limit(10),
    },
    {
      name: '메뉴 조회',
      query: () => supabase.from('menus').select('*').limit(10),
    },
    {
      name: '파일 목록 조회',
      query: () => supabase.from('file_uploads').select('*').limit(10),
    },
  ];

  for (const test of tests) {
    try {
      const startTime = Date.now();
      const { error } = await test.query();
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const isGood = duration < 1000; // 1초 이내
      logTest(
        test.name,
        isGood,
        `${duration}ms ${isGood ? '(양호)' : '(느림)'}`,
      );
    } catch (error) {
      logTest(test.name, false, `오류: ${error.message}`);
    }
  }
}

// 메인 테스트 실행
async function runTests() {
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Anon Key: ${SUPABASE_ANON_KEY.slice(0, 20)}...`);
  console.log('='.repeat(60));

  const testFunctions = [
    testConnection,
    testDatabaseSchema,
    testRPCFunctions,
    testStorageBuckets,
    testAuthSystem,
    testPerformance,
  ];

  for (const testFunc of testFunctions) {
    await testFunc();
    await new Promise((resolve) => setTimeout(resolve, 500)); // 0.5초 대기
  }

  // 결과 요약
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 테스트 결과 요약');
  console.log('='.repeat(60));
  console.log(`✅ 성공: ${testResults.passed}개`);
  console.log(`❌ 실패: ${testResults.failed}개`);
  console.log(
    `📈 성공률: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`,
  );

  if (testResults.failed > 0) {
    console.log('\n❌ 실패한 테스트:');
    testResults.tests
      .filter((t) => !t.success)
      .forEach((t) => console.log(`   - ${t.name}: ${t.message}`));
  }

  console.log('\n🎉 테스트 완료!');

  // 종료 코드 설정
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 스크립트 실행
runTests().catch((error) => {
  console.error('❌ 테스트 실행 중 오류:', error);
  process.exit(1);
});
