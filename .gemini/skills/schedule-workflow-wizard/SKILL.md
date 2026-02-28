---
name: schedule-workflow-wizard
description: 관리자가 간호사 근무표를 생성하는 5단계 워크플로우를 관리합니다. 각 단계의 UI 수정, 데이터 흐름 제어, 다음 단계 이동 전 유효성 검사, AI Solver 연동 로직을 처리할 때 사용합니다.
---

# Schedule Workflow Wizard

## Overview

EveryShift MVP의 핵심인 근무표 생성 프로세스는 5단계로 구성됩니다. 이 스킬은 각 단계의 일관성을 유지하고 데이터 무결성을 보장하며, 복잡한 비즈니스 로직(AI Solver 연동 등)을 안전하게 구현하는 데 도움을 줍니다.

## Workflow Decision Tree

### Step 1: 기본 정보 (Basic Info)
- **주요 기능:** 생성할 근무표의 연월 선택.
- **연관 파일:** `src/views/schedule/Step1BasicInfo.vue`
- **데이터:** `scheduleStore.basicInfo`

### Step 2: 사이트 정보 (Site Info)
- **주요 기능:** 시프트별(D, E, N 등) 최소 인원 요구사항 설정.
- **연관 파일:** `src/views/schedule/Step2SiteInfo.vue`
- **데이터:** `scheduleStore.siteRequirements`

### Step 3: 직원 정보 (Employee Info)
- **주요 기능:** 해당 부서 직원 목록 확인 및 편집, 엑셀 업로드 지원.
- **연관 파일:** `src/views/schedule/Step3EmployeeInfo.vue`
- **데이터:** `scheduleStore.employees`

### Step 4: 초기 데이터 입력 (Initial Data)
- **주요 기능:** 근무 불가 요청(O), 고정 근무 등 사전 데이터 그리드 입력.
- **연관 파일:** `src/views/schedule/Step4InitialData.vue`
- **데이터:** `scheduleStore.assignments`, `scheduleStore.comments`

### Step 5: 결과 확인 및 AI Solver (Result)
- **주요 기능:** AI Solver를 통한 근무표 자동 생성 및 결과 수정/확정.
- **연관 파일:** `src/views/schedule/Step5Result.vue`
- **데이터:** `scheduleStore.assignments`, `solverStore`

## Guidelines

1. **데이터 정합성:** 다음 단계로 이동하기 전 반드시 현재 단계의 필수 데이터가 `scheduleStore`에 올바르게 저장되었는지 확인하십시오.
2. **UI 일관성:** 모든 단계는 `StepIndicator.vue`를 포함해야 하며, Naive UI의 디자인 가이드를 준수해야 합니다.
3. **API 연동:** 각 단계의 최종 저장 시 `src/api/schedule.ts`의 적절한 함수를 호출하여 Supabase와 동기화하십시오.
4. **Solver 연동:** Step 5에서 Solver를 호출하기 전, Step 1~4에서 수집된 데이터가 `PlanningPayload` 형식에 맞는지 검증하십시오.

## Resources

- **references/workflow_guide.md:** 각 단계별 상세 비즈니스 규칙 및 검증 로직 가이드.
- **references/solver_payload_spec.md:** AI Solver 연동을 위한 JSON 페이로드 상세 규격.
