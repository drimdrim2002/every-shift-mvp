#!/usr/bin/env node
import { existsSync } from 'fs';
import { resolve } from 'path';

const envFile = resolve(process.cwd(), '.env.local');

if (!existsSync(envFile)) {
  console.error('❌ .env.local 파일이 없습니다!');
  console.log('📝 다음 명령어를 실행하세요:');
  console.log('   cp .env.example .env.local');
  console.log('   # .env.local 파일을 열어 Supabase 정보를 입력하세요');
  process.exit(1);
}

console.log('✅ .env.local 파일 확인 완료');
