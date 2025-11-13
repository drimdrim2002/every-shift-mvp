import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = 'https://kkxchntkzopfrpnvzzth.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreGNobnRrem9wZnJwbnZ6enRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMTEyNDgsImV4cCI6MjA2OTc4NzI0OH0.wcRVKBmlsBBXBfOJ8Vypit-b47gRFVvecp1TVxonvmU';

console.log('🔍 Supabase 데이터베이스 상태 확인 중...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabaseDatabase() {
  try {
    // 1. 연결 테스트
    console.log('1️⃣ Supabase 연결 상태 확인...');
    const { data: _connectionTest, error: connectionError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1);

    if (connectionError) {
      console.log('❌ Supabase 연결 실패:', connectionError.message);
      return;
    }
    console.log('✅ Supabase 연결 성공!\n');

    // 2. 공개 테이블 목록 조회
    console.log('2️⃣ 기존 테이블 목록 조회...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.log('❌ 테이블 목록 조회 실패:', tablesError.message);
      return;
    }

    if (tables && tables.length > 0) {
      console.log('📋 기존 테이블 목록:');
      tables.forEach((table, index) => {
        console.log(
          `   ${index + 1}. ${table.table_name} (${table.table_type})`,
        );
      });
      console.log('');

      // 3. 각 테이블의 컬럼 정보 조회
      console.log('3️⃣ 테이블 구조 상세 정보...');
      for (const table of tables) {
        if (table.table_type === 'BASE TABLE') {
          const { data: columns, error: columnsError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_schema', 'public')
            .eq('table_name', table.table_name)
            .order('ordinal_position');

          if (!columnsError && columns) {
            console.log(`📊 ${table.table_name} 테이블:`);
            columns.forEach((col) => {
              const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
              const defaultVal = col.column_default
                ? ` DEFAULT ${col.column_default}`
                : '';
              console.log(
                `   - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`,
              );
            });
            console.log('');
          }
        }
      }
    } else {
      console.log('📋 현재 생성된 테이블이 없습니다.');
    }

    // 4. Auth 사용자 확인
    console.log('4️⃣ Auth 시스템 확인...');
    const {
      data: { users },
      error: authError,
    } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.log(
        '⚠️  Auth 정보 확인 불가 (admin 권한 필요):',
        authError.message,
      );
    } else {
      console.log(`👥 등록된 사용자 수: ${users?.length || 0}명`);
    }

    // 5. Storage 버킷 확인
    console.log('5️⃣ Storage 버킷 확인...');
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      console.log('⚠️  Storage 정보 확인 불가:', bucketsError.message);
    } else {
      console.log(`🗂️  생성된 버킷 수: ${buckets?.length || 0}개`);
      if (buckets && buckets.length > 0) {
        buckets.forEach((bucket) => {
          console.log(
            `   - ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`,
          );
        });
      }
    }
  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error);
  }
}

// 실행
checkSupabaseDatabase().then(() => {
  console.log('\n🎯 데이터베이스 상태 확인 완료!');
  process.exit(0);
});
