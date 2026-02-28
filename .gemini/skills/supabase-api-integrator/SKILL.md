---
name: supabase-api-integrator
description: Supabase DB와 프론트엔드 간의 데이터 동기화를 담당합니다. API 함수 작성, DB 스키마(DDL) 분석, 페이지네이션 처리, 데이터 타입 변환 로직을 구현할 때 사용합니다.
---

# Supabase API Integrator

## Overview

이 스킬은 Supabase 클라이언트를 사용하여 데이터베이스와 통신하는 API 레이어를 관리합니다. 효율적인 쿼리 작성과 프론트엔드-백엔드 데이터 모델 간의 정합성을 보장하는 데 중점을 둡니다.

## Core Capabilities

### 1. API 함수 구현
- `src/api/` 디렉토리 내의 각 도메인별(employee, organization, schedule 등) API 함수 작성.
- Supabase의 JS SDK를 사용한 CRUD 작업 및 복합 필터링 구현.

### 2. 데이터 정규화 (Normalization)
- DB에서 반환된 원시 데이터(Snake Case 등)를 프론트엔드 인터페이스(Camel Case 또는 비즈니스 모델)로 변환.
- `AssignmentMap` 등 복잡한 맵 구조로의 데이터 가공.

### 3. 대량 데이터 및 페이지네이션 처리
- Supabase의 기본 1000개 제한을 극복하기 위한 재귀적 또는 루프 기반 `range()` 쿼리 구현.
- `getScheduleAssignments`와 같은 함수에서 성능 최적화.

### 4. 스키마 동기화
- `ddl/*.sql` 파일을 분석하여 실제 DB 구조와 API 로직 간의 불일치 방지.
- 외래 키 관계를 고려한 `select('*, shifts(code)')` 형태의 조인 쿼리 작성.

## Guidelines

1. **에러 핸들링:** 모든 API 함수는 `error` 발생 시 적절한 메시지와 함께 예외를 던지거나 반환해야 합니다.
2. **타입 안전성:** `src/types/`에 정의된 TypeScript 인터페이스를 적극 활용하여 반환 타입을 명시하십시오.
3. **불필요한 호출 최소화:** 캐싱 로직이 필요한 경우 Pinia 스토어와 연동하여 불필요한 네트워크 호출을 줄이십시오.
4. **보안:** RLS(Row Level Security) 정책을 고려하여 사용자의 조직 ID(`organization_id`)를 항상 필터링 조건에 포함하십시오.

## Resources

- **references/api_implementation_patterns.md:** 자주 사용되는 Supabase 쿼리 패턴 및 페이지네이션 예제.
- **references/db_schema_summary.md:** 주요 테이블 간의 관계 및 제약 조건 요약 가이드.
