#!/bin/bash

# TypeScript 타입 오류 방지 자동화 스크립트
# 개발 중간중간 실행하여 타입 안전성 확보

set -e

echo "🔍 TypeScript 타입 검사 시작..."

# 1단계: TypeScript 컴파일 검사
echo "📋 1단계: TypeScript 컴파일 검사"
pnpm check:type

# 2단계: ESLint 검사 (타입 안전성 규칙 포함)
echo "📋 2단계: ESLint 타입 안전성 검사"
pnpm lint --quiet

# 3단계: 코드 포맷팅 검사
echo "📋 3단계: 코드 포맷팅 검사"
pnpm format

# 4단계: 사용하지 않는 import 제거 확인
echo "📋 4단계: 사용하지 않는 import 확인"
pnpm lint --fix --quiet

echo "✅ 모든 TypeScript 타입 검사 통과!"
echo ""
echo "🎯 추가 권장사항:"
echo "   - API 함수에는 반드시 반환 타입 명시"
echo "   - any 타입 사용 금지"
echo "   - 안전하지 않은 타입 접근 금지"
echo "   - Vue 컴포넌트에서 타입 안전한 ref 사용"
echo ""