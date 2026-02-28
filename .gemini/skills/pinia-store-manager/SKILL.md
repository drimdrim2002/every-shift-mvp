---
name: pinia-store-manager
description: Pinia를 사용한 전역 상태 관리를 최적화합니다. 스토어의 상태(ref), 계산된 속성(computed), 액션(actions)의 구조를 설계하고 최적화할 때 사용합니다.
---

# Pinia Store Manager

## Overview

이 스킬은 복잡한 도메인 데이터(근무표, 직원 정보 등)를 효과적으로 관리하기 위한 Pinia 스토어 설계를 담당합니다.

## Core Capabilities

### 1. 스토어 구조 설계
- `<script setup>` 스타일의 Composition API 스토어 정의.
- `state`, `getters(computed)`, `actions`의 명확한 역할 분담.

### 2. 복합 상태 관리
- `AssignmentMap`, `ConstraintMap`과 같은 중첩된 객체 구조를 효율적으로 업데이트하는 로직 구현.
- `reset()` 함수 등을 통한 단계별 상태 초기화 보장.

### 3. 스토어 간 상호작용
- `authStore`, `orgStore`, `scheduleStore` 등 여러 스토어 간의 의존성 관리 및 데이터 동기화.

### 4. 반응형 데이터 처리
- `ref`와 `reactive` 중 적절한 선택을 통한 반응성 보장.
- 대용량 데이터 업데이트 시의 성능 고려.

## Guidelines

1. **단일 진실 공급원(SSO):** 중복된 상태를 피하고 계산 가능한 데이터는 `computed`를 활용하십시오.
2. **명확한 액션 명명:** 상태를 직접 수정하기보다 의미 있는 이름의 `action` 함수를 통해 변경하십시오.
3. **타입 정의:** 스토어 내부에서 사용되는 모든 데이터 타입은 `src/types/`에서 가져와 명시하십시오.

## Resources

- **references/store_best_practices.md:** Vue 3 Composition API 기반 Pinia 스토어 설계 가이드 및 예시.
