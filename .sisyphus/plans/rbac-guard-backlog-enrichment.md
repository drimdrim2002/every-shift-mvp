# Plan: P0-2.4.2 RBAC 가드 요구사항 보강

## TL;DR

> **Summary**: P3~P9 백로그에 RBAC 가드 요구사항 보강 (라우터 meta.roles + 역할별 분기)
> **Deliverables**: P3.json, P5.json, P7.json, P9.json에 RBAC 요구사항 추가 + REMAINING_TASKS_MERGED.md 동기화
> **Effort**: Short
> **Parallel**: NO (순차 의존성)
> **Critical Path**: P3 RBAC 태스크 추가 → P5/P7/P9 보강 → 문서 동기화

## Context

### Original Request (Task 194b66c3-288f-4b89-bf46-b97496d4e62d)

> 작성된 RBAC 매트릭스 문서를 기준으로 향후 구현할 기존 Phase 태스크(todo/P3~P9)의 description 및 implementationGuide에 Vue Router 가드(meta.roles) 및 UI 제어 요구사항을 구체적으로 보강한다.

### Implementation Guide (from task)

1. **P3(인증/권한)**: Vue Router 전역 가드(`beforeEach`)에서 `meta.roles`를 확인하여 403 처리 및 역할별 홈 리다이렉트 로직 구현 요구사항 추가
2. **P5(조직/직원)**: 조직 및 직원 관리 페이지에 `[super, admin]` 전용 라우터 가드 요구사항 추가
3. **P7(근무표 생성)**: 스케줄 생성/편집 라우트에 admin/super 전용 접근 가드 요구사항 추가
4. **P9(대시보드)**: 로그인 후 역할에 따라 관리자 대시보드 또는 개인 대시보드로 자동 라우팅되는 분기 처리 요구사항 추가

### RBAC Matrix Reference

`docs/migration/RBAC_MATRIX.md` 기준:
- **super**: 전체 권한
- **admin**: 소속 조직 관리 권한
- **user**: 허용된 메뉴만 접근

| 라우트 | super | admin | user |
|--------|-------|-------|------|
| /onboarding | O | O (필수) | X |
| /admin/accounts | O | O | X |
| /admin/organizations | O | O | X |
| /admin/employees | O | O |他自己 |
| /schedule/step1~3 | O | O | X |
| /dashboard/admin | O | O | X |
| /dashboard/employee | O | O | O |

## Work Objectives

### Core Objective

기존 P3~P9 백로그 태스크에 RBAC 가드 요구사항을 보강하여 후속 구현 시 보안 및 접근 제어 무결성 확보

### Deliverables

1. **P3.json**: RBAC 가드 관련 新태스크 2개 추가 (P3-4.1, P3-4.2)
2. **P5.json**: 기존 태스크 description/implementationGuide에 RBAC 요구사항 보강
3. **P7.json**: 기존 태스크 description/implementationGuide에 RBAC 요구사항 보강
4. **P9.json**: 기존 태스크 description/implementationGuide에 RBAC 요구사항 보강
5. **REMAINING_TASKS_MERGED.md**: 변경 사항 동기화
6. **tasks.json**: 의존성 검증

### Definition of Done (verifiable conditions)

- [ ] P3에 RBAC 가드 新태스크 2개 추가 완료
- [ ] P5의 조직/직원 관리 관련 태스크에 RBAC 요구사항 보강 완료
- [ ] P7의 스케줄 관련 태스크에 RBAC 요구사항 보강 완료
- [ ] P9의 대시보드 관련 태스크에 RBAC 요구사항 보강 완료
- [ ] REMAINING_TASKS_MERGED.md 동기화 완료
- [ ] 의존성 검증 통과 (missing_targets=0)

### Must Have

- RBAC_MATRIX.md 기준 정확히 적용
- implementationGuide에 구체적인 구현 요구사항 명시
- relatedFiles에 RBAC_MATRIX.md REFERENCE로 추가

### Must NOT Have

- 코드 구현 (문서 보강만)
- 기존 의존성 구조破坏
- 기존 태스크 ID 변경

## Verification Strategy

- Dependency graph check: `python - <<'PY' ...` (missing_targets=0)
- Parent-child coverage check: 부모-자식 의존성 무결성
- 문서 sync check: 변경된 모든 태스크 ID가 REMAINING_TASKS_MERGED.md에 반영

## Execution Strategy

### Phase 1: P3 RBAC 태스크 추가

**Files**: `.shrimp-data/todo/P3.json`

1. P3-4.1: 전역 RBAC 라우터 가드 구현 (meta.roles + 403 처리)
   - ID: `10000000-0000-4000-8000-000000000076`
   - 의존성: P3-3.3 + RBAC 매트릭스 task (21d4bb02)
   - implementationGuide: 매트릭스 기반 meta.roles 설정, 403 리다이렉트

2. P3-4.2: 역할별 홈 리다이렉트 로직 구현
   - ID: `10000000-0000-4000-8000-000000000077`
   - 의존성: P3-4.1
   - implementationGuide: / → 역할별 대시보드 자동 라우팅

### Phase 2: P5 RBAC 요구사항 보강

**Files**: `.shrimp-data/todo/P5.json`

보강 대상:
- P5-1.1 (조직 관리): super 전체, admin 자기조직만
- P5-1.2 (조직 관리 화면): [super, admin] 전용 라우터 가드
- P5-2.1~2.5 (마스터 데이터): admin만 접근
- P5-3.1~3.5 (사이트/요구인원): admin만 접근

### Phase 3: P7 RBAC 요구사항 보강

**Files**: `.shrimp-data/todo/P7.json`

보강 대상:
- P7-1.1~1.4 (Step1~2): admin/super 전용
- P7-2.1~2.3 (Solver): admin/super 전용
- P7-3.1~3.4 (회귀 테스트): admin/super 전용

### Phase 4: P9 RBAC 요구사항 보강

**Files**: `.shrimp-data/todo/P9.json`

보강 대상:
- P9-1.1~1.4 (대시보드 지표/데이터): 역할별 접근 제어
- P9-2.1 (관리자 대시보드): admin/super 전용
- P9-2.2 (직원 대시보드): 전체 접근 (역할별视图不同)
- P9-3.1~3.4 (Export): admin/super 전용

### Phase 5: 문서 동기화

**Files**: `docs/migration/REMAINING_TASKS_MERGED.md`

- Phase 1~4에서 변경된 모든 태스크 ID 반영
- RBAC_MATRIX.md 참조 추가

### Phase 6: 검증

- tasks.json 의존성 검증
- 문서 동기화 검증

## TODOs

- [ ] 1. P3.json에 RBAC 가드 新태스크 2개 추가 (P3-4.1, P3-4.2)

  **What to do**: P3-4.1 (전역 RBAC 라우터 가드), P3-4.2 (역할별 홈 리다이렉트) 태스크 추가

  **Must NOT do**: 기존 P3-3.x 의존성 구조 변경

  **References**:
  - Pattern: 기존 P3 태스크 구조 (id, name, description, status, phase, dependencies, estimatedMinutes, relatedFiles, implementationGuide, verificationCriteria, createdAt, updatedAt)
  - RBAC: `docs/migration/RBAC_MATRIX.md` - 라우트 권한 매트릭스

  **Acceptance Criteria**:
  - [ ] P3-4.1, P3-4.2 태스크가 P3.json에 추가됨
  - [ ] P3-4.1의 의존성에 21d4bb02 (RBAC 매트릭스) 포함

- [ ] 2. P5.json에 RBAC 요구사항 보강

  **What to do**: 조직/직원/마스터 관리 관련 태스크에 RBAC 요구사항 추가

  **Must NOT do**: 기존 description 의미 변경

  **References**:
  - RBAC: `docs/migration/RBAC_MATRIX.md` - 마스터 관리 섹션

  **Acceptance Criteria**:
  - [ ] P5-1.1, P5-1.2에 RBAC 요구사항 보강
  - [ ] P5-2.x, P5-3.x에 RBAC 요구사항 보강

- [ ] 3. P7.json에 RBAC 요구사항 보강

  **What to do**: 스케줄 생성 관련 태스크에 RBAC 요구사항 추가

  **References**:
  - RBAC: `docs/migration/RBAC_MATRIX.md` - 근무표 생성 섹션

  **Acceptance Criteria**:
  - [ ] P7-1.x, P7-2.x에 RBAC 요구사항 보강
  - [ ] admin/super 전용 접근 가드 요구사항 명시

- [ ] 4. P9.json에 RBAC 요구사항 보강

  **What to do**: 대시보드 관련 태스크에 RBAC 요구사항 추가

  **References**:
  - RBAC: `docs/migration/RBAC_MATRIX.md` - 대시보드 섹션

  **Acceptance Criteria**:
  - [ ] P9-2.1 (관리자 대시보드)에 admin/super 전용 명시
  - [ ] P9-2.2 (직원 대시보드)에 역할별视图차이 명시

- [ ] 5. REMAINING_TASKS_MERGED.md 동기화

  **What to do**: Phase 1~4에서 추가/변경된 태스크 ID를 문서에 반영

  **References**:
  - Pattern: 기존 문서 구조 유지

  **Acceptance Criteria**:
  - [ ] 新태스크 (P3-4.1, P3-4.2) 문서에 추가
  - [ ] 보강된 태스크 설명 업데이트

- [ ] 6. tasks.json 의존성 검증

  **What to do**: python 스크립트로 의존성 무결성 검증

  **References**:
  - Validation: shrimp-task-manager skill의 검증 명령어

  **Acceptance Criteria**:
  - [ ] missing_targets=0
  - [ ] cyclic_dependency=false

## Success Criteria

1. P3~P9 백로그에 RBAC 요구사항이 정확히 보강됨
2. 후속 구현 시 RBAC_MATRIX.md 기반 라우터 가드 구현 가능
3. 문서 동기화 완료로 마이그레이션 진행 시 참조 자료 완비
