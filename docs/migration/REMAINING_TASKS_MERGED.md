# 통합 남은 태스크 목록 (Combined Remaining Tasks)

이 문서는 `REMAINING_TASKS.md`의 요약 테이블과 `REMAINING_TASKS_DETAILED.md`의 상세 설명을 통합하고, 시스템의 Task ID를 매핑한 결과입니다.

## 최근 반영 내역 (2026-02-28 기준)

- 기준 소스: `.shrimp-data/tasks.json` (canonical)
- P0-2.2(`10000000-0000-4000-8000-000000000038`) 완료 상태 반영
- P1~P10 하위 태스크 canonical 병합 결과 반영
- DAG 정합성 반영: missing dependency 0건, cycle false
- P1-1.4(`00726cae-2c8e-4f81-af12-4bb55e494203`) 예상 소요 시간 120분 반영
- P1-2.1(`10000000-0000-4000-8000-000000000046`) 선행 조건 정정
  - 기존: P1-1.3, P1-1.4, P1-2.3, P7-3.4
  - 변경: P1-1.3, P1-1.4
- P0-2.4(`a59d8e0e-df2b-4f1d-9002-6f0b8825441b`) 상태 `in_progress` 반영
- P0-2.4.2(`194b66c3-288f-4b89-bf46-b97496d4e62d`) 상태 `completed` 반영
- `docs/migration/RBAC_MATRIX.md`에 PRD 메뉴/라우트 ↔ phase 태스크 추적 매트릭스 및 강화 후보 목록 반영

## P0 (예상 시간: 8시간 0분)

### 요약 (Summary)

| Task ID                                | 태스크 명                                                              | 상태      | 선행 태스크(Dependencies)                              | 예상 시간 |
| -------------------------------------- | ---------------------------------------------------------------------- | --------- | ------------------------------------------------------ | --------- |
| `10000000-0000-4000-8000-000000000034` | **P0-1.1 운영 규칙/DoD 문서 초안 작성**                                | completed | -                                                      | 90m       |
| `10000000-0000-4000-8000-000000000035` | **P0-1.2 품질 게이트(릴리스 전 체크) 기준 확정**                       | completed | P0-1.1                                                 | 120m      |
| `10000000-0000-4000-8000-000000000036` | **P0-1.3 Shrimp 태스크 작성 규칙(템플릿) 확정**                        | completed | P0-1.2                                                 | 90m       |
| `10000000-0000-4000-8000-000000000037` | **P0-2.1 PRD→Phase 매핑 점검(누락/중복) 정리**                         | completed | P0-1.3                                                 | 60m       |
| `10000000-0000-4000-8000-000000000038` | **P0-2.2 에픽별 하위 태스크 분해(1~3h) + 의존성 그래프 작성**          | completed | P0-2.1                                                 | 180m      |
| `10000000-0000-4000-8000-000000000039` | **P0-2.3 태스크 품질 표준화(검증기준/relatedFiles/추정치) 정리**       | completed | P0-2.2<br>P0-2.3.1<br>P0-2.3.2<br>P0-2.3.3<br>P0-2.3.4 | 90m       |
| `9578fcaa-fff0-431c-9884-ab167cfd6b52` | **P0-2.3.1 requiredFields 누락 13건 보정(estimatedMinutes 중심)**      | completed | -                                                      | 60m       |
| `90f21096-9495-4ab6-83d3-253ccf24b15c` | **P0-2.3.2 relatedFiles.type 표준 위반(TO_CREATE) 정규화**             | completed | P0-2.3.1                                               | 60m       |
| `24b9304c-ee93-4908-9f78-c0fd145b7b2e` | **P0-2.3.3 네이밍 규칙/검증기준 문구 표준화**                          | completed | P0-2.3.2                                               | 120m      |
| `3750ea45-f661-494c-b858-747cf94656f9` | **P0-2.3.4 태스크 정합성 자동검증 명령/스크립트 정리**                 | completed | P0-2.3.3                                               | 90m       |
| `b17e29b8-877d-48bc-8742-e54b82498cb7` | **P0-2.3.5 namePattern 위반 태스크 리네이밍**                          | completed | -                                                      | 60m       |
| `bd363acc-f675-4dd5-8a1b-d536c94f8e96` | **P0-2.3.6 verificationCriteria 3요소 형태로 개편**                    | completed | P0-2.3.5                                               | 90m       |
| `014e3ec4-3769-4af4-8815-0512223a3a1c` | **P0-2.3.7 규칙 준수율 측정 및 기록**                                  | completed | P0-2.3.6                                               | 60m       |
| `a59d8e0e-df2b-4f1d-9002-6f0b8825441b` | **P0-2.4 전역 RBAC 메뉴/라우트 매트릭스 누락 보강**                    | completed | P0-2.1<br>P0-2.4.1<br>P0-2.4.2                         | 90m       |
| `21d4bb02-23fe-4055-9fae-4123143f91a9` | **P0-2.4.1 전역 RBAC 라우트/메뉴 권한 매트릭스 문서 작성**             | completed | P0-2.1                                                 | 120m      |
| `194b66c3-288f-4b89-bf46-b97496d4e62d` | **P0-2.4.2 기존 Phase 태스크(P3~P9)에 RBAC 가드 요구사항 보강**        | completed | P0-2.4.1                                               | 120m      |
| `c189da56-e1d2-4f5c-b7ca-8c0928d11fb3` | **P0-2.5 가입-조직생성(6.2 재사용) 요구 백로그 연결**                  | pending   | P0-2.4                                                 | 90m       |
| `92faa6b4-20db-404d-a5d9-9b24760168fc` | **P0-2.6 Solver 완료 알림 이벤트 경계 보강**                           | pending   | P0-2.5                                                 | 90m       |
| `634b3991-aa06-4b2f-9e39-2e14bf89fba5` | **P0-2.7 P1~P2 하위 태스크 canonical 병합**                            | pending   | P0-2.2                                                 | 120m      |
| `c227e7ec-7a5e-4d8b-b838-b308af62fd63` | **P0-2.8 P3~P4 하위 태스크 canonical 병합**                            | pending   | P0-2.7                                                 | 120m      |
| `d2cb1c5e-adda-4649-b59f-9985432fb377` | **P0-2.9 P5~P6 하위 태스크 canonical 병합**                            | pending   | P0-2.8                                                 | 120m      |
| `56e8a782-25c0-4aea-be2e-24da11e4918f` | **P0-2.10 P7~P8 하위 태스크 canonical 병합**                           | pending   | P0-2.9                                                 | 120m      |
| `db6ead17-422c-4e1b-a994-2171fb5b913a` | **P0-2.11 P9~P10 하위 태스크 canonical 병합**                          | completed | P0-2.10                                                | 120m      |
| `4f954f47-cf4b-44ca-81eb-7e3f6c28b34a` | **P0-2.12 의존성 그래프 무결성 자동 점검 스크립트 정리**               | completed | P0-2.11                                                | 120m      |
| `0ea4c78a-4916-43db-885b-126553d59343` | **P0-2.13 taskTemplate 정합성 보정(phase/estimatedMinutes 누락 해소)** | completed | P0-2.12                                                | 120m      |

| `9a83c8aa-8482-4075-80dd-62c420de2a9b` | **P0-2.14 P0~P10 크리티컬 패스 문서화 및 완료 판정** | pending | P0-2.12<br>P0-2.13 | 180m |
| `10000000-0000-4000-8000-000000000040` | **P0-3.1 Phase KPI/릴리스 준비도(Ready) 정의** | pending | P0-2.3 | 90m |
| `10000000-0000-4000-8000-000000000041` | **P0-3.2 마이그레이션 대시보드(문서) 구조 설계** | pending | P0-3.1 | 90m |
| `10000000-0000-4000-8000-000000000042` | **P0-3.3 Shrimp 상태 조회 표준(쿼리/리포트) 정의** | pending | P0-3.2 | 120m |

### 상세 (Details)

### P0-1.1 운영 규칙/DoD 문서 초안 작성

- **Task ID**: `10000000-0000-4000-8000-000000000034`
- **설명(Description)**: REFINED_PRD 서비스 전환을 위한 운영 원칙(Definition of Done, 브랜치 전략, 태스크 상태 규칙, 리뷰/테스트 기준)을 문서화한다.
- **구현 가이드(Guide)**: 1) DoD(코드/테스트/문서/보안) 항목 정의. 2) 브랜치/PR/리뷰 규칙 정의. 3) 태스크 상태 전이 규칙(pending/in_progress/completed) 정의.
- **검증 기준(Verification)**: 문서에 DoD와 브랜치/PR 규칙이 포함되어 있고, 팀이 그대로 따라할 수 있다.
- **선행 조건(Dependencies)**: 없음
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/REFINED_PRD.md`, `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P0-1.2 품질 게이트(릴리스 전 체크) 기준 확정

- **Task ID**: `10000000-0000-4000-8000-000000000035`
- **설명(Description)**: Private Beta 릴리스를 위한 품질 게이트(필수 실행 명령/통과 기준/실패 시 대응)를 확정한다.
- **구현 가이드(Guide)**: 1) 필수 명령(pnpm lint/test:unit/build)과 실행 순서 정의. 2) E2E 포함 조건(권한/가입/온보딩 변경 시 등) 정의. 3) 실패 시 triage/rollback 규칙 정의.
- **검증 기준(Verification)**: 게이트 체크리스트가 문서화되어 있고, 각 항목의 실행 명령과 통과 기준이 명확하다.
- **선행 조건(Dependencies)**: P0-1.1
- **예상 소요 시간**: 120분
- **관련 파일**: `package.json`, `scripts/quality-gate.sh`

### P0-1.3 Shrimp 태스크 작성 규칙(템플릿) 확정

- **Task ID**: `10000000-0000-4000-8000-000000000036`
- **설명(Description)**: Shrimp Task Manager에서 사용할 태스크 템플릿(필수 필드, relatedFiles 표준, 의존성 표기, 예상 시간 기준)을 확정한다.
- **구현 가이드(Guide)**: 1) 태스크 필수 항목(description/implementationGuide/verificationCriteria) 템플릿 정의. 2) 1~3시간 단위 기준(estimatedMinutes) 정의. 3) 이름 규칙(Px-y.z + 태그) 정의.
- **검증 기준(Verification)**: 템플릿이 합의되어 있고, 새 태스크를 추가할 때 일관된 형태로 작성할 수 있다.
- **선행 조건(Dependencies)**: P0-1.2
- **예상 소요 시간**: 90분
- **관련 파일**: `.shrimp-data/tasks.json`, `.shrimp-data/tasks.metadata.json`

### P0-2.1 PRD→Phase 매핑 점검(누락/중복) 정리

- **Task ID**: `10000000-0000-4000-8000-000000000037`
- **설명(Description)**: REFINED_PRD의 요구사항을 P0~P10 Phase에 매핑하고, 누락/중복 범위를 체크하여 백로그에 반영한다.
- **구현 가이드(Guide)**: 1) PRD 섹션(권한/가입/온보딩/관리/알림/대시보드)을 Phase로 매핑. 2) 누락 요구를 하위 태스크로 추가. 3) 중복/범위 충돌은 notes로 정리.
- **검증 기준(Verification)**: PRD 주요 섹션이 모두 Phase에 연결되어 있고, 누락된 공통 기능이 없다.
- **선행 조건(Dependencies)**: P0-1.3
- **예상 소요 시간**: 60분
- **관련 파일**: `docs/REFINED_PRD.md`, `.shrimp-data/tasks.json`

### P0-2.2 에픽별 하위 태스크 분해(1~3h) + 의존성 그래프 작성

- **Task ID**: `10000000-0000-4000-8000-000000000038`
- **현재 상태(Status)**: completed (2026-02-28)
- **설명(Description)**: P0~P10 에픽을 실행 가능한 1~3시간 단위 하위 태스크로 쪼개고, 태스크 간 의존성(critical path)을 명확히 연결한다.
- **구현 가이드(Guide)**: 1) 각 에픽을 설계/구현/검증 단계로 분해. 2) 선행 조건은 dependencies로 연결. 3) 실행 순서가 모호하면 notes에 결정사항 기록.
- **검증 기준(Verification)**: 모든 에픽에 1~3시간 단위 하위 태스크가 존재하고, 의존성 그래프가 끊기지 않는다.
- **선행 조건(Dependencies)**: P0-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `.shrimp-data/tasks.json`

### P0-2.3 태스크 품질 표준화(검증기준/relatedFiles/추정치) 정리

- **Task ID**: `10000000-0000-4000-8000-000000000039`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: backlog 전체 태스크에 대해 verificationCriteria(Deliverable/Method/Pass), relatedFiles, estimatedMinutes 표준화를 100% 완료함. 특히 P0-2.3.1~4 하위 태스크를 통해 데이터 무결성을 검증함.
- **설명(Description)**: 백로그 태스크의 verificationCriteria, relatedFiles, estimatedMinutes를 표준화하여 실행/검증 가능 상태로 만든다.
- **구현 가이드(Guide)**: 1) 각 태스크에 체크리스트형 검증기준 추가. 2) 수정/생성 파일을 relatedFiles에 명시. 3) 1~3시간 범위 벗어나는 태스크는 재분해.
- **검증 기준(Verification)**: 대부분의 태스크가 '실행 방법 + 검증 방법'을 포함하고, 추정치가 일관되다.
- **선행 조건(Dependencies)**: P0-2.2, P0-2.3.1, P0-2.3.2, P0-2.3.3, P0-2.3.4
- **예상 소요 시간**: 90분
- **관련 파일**: `.shrimp-data/tasks.json`

### P0-3.1 Phase KPI/릴리스 준비도(Ready) 정의

- **Task ID**: `10000000-0000-4000-8000-000000000040`
- **설명(Description)**: 각 Phase의 완료 정의(산출물/테스트/보안)와 Private Beta 릴리스 준비도 지표를 정의한다.
- **구현 가이드(Guide)**: 1) Phase별 산출물 목록 정의. 2) 필수 테스트/보안 체크 항목 정의. 3) Ready/Not Ready 판정 기준 정의.
- **검증 기준(Verification)**: 각 Phase에 대해 '완료' 판정이 가능한 지표/체크리스트가 문서화되어 있다.
- **선행 조건(Dependencies)**: P0-2.3
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P0-3.2 마이그레이션 대시보드(문서) 구조 설계

- **Task ID**: `10000000-0000-4000-8000-000000000041`
- **설명(Description)**: Phase별 진행률/블로커/리스크/릴리스 체크를 한 페이지에서 추적할 수 있는 문서 대시보드 구조를 설계한다.
- **구현 가이드(Guide)**: 1) Phase 테이블(상태/완료조건/담당) 레이아웃 정의. 2) Risk/Blocker 등록 포맷 정의. 3) 릴리스 체크리스트 섹션 정의.
- **검증 기준(Verification)**: 문서 대시보드 목차/섹션이 정의되어 있고, 팀이 동일 포맷으로 업데이트할 수 있다.
- **선행 조건(Dependencies)**: P0-3.1
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/README.md`

### P0-3.3 Shrimp 상태 조회 표준(쿼리/리포트) 정의

- **Task ID**: `10000000-0000-4000-8000-000000000042`
- **설명(Description)**: Shrimp list/query를 사용해 진행상태를 추적하는 표준 명령/보고 방식(수동 또는 스크립트)을 정의한다.
- **구현 가이드(Guide)**: 1) Phase별 조회 기준(이름 prefix/phase 필드) 정의. 2) weekly 리포트 템플릿 정의. 3) 필요 시 간단한 export 방식(수동 복사) 정의.
- **검증 기준(Verification)**: 누구나 동일 명령/포맷으로 현재 상태를 보고할 수 있다.
- **선행 조건(Dependencies)**: P0-3.2
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/setup/MCP_INSTALLATION.md`

### P0-2.10 P7~P8 하위 태스크 canonical 병합

- **Task ID**: `56e8a782-25c0-4aea-be2e-24da11e4918f`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: P7/P8 소스 태스크가 canonical tasks.json에 반영되어 있으며, solver 완료 이벤트 생산자(P7-2.1)에서 소비자 체인(P8-1.1→P8-1.2→P8-1.3→P8-1.4→P8-1.5)으로 이어지는 의존선이 단절 없이 연결됨을 확인했다. 또한 P2-3.4를 이벤트 트리거 정책 범위로 축소하고 계약 필드는 P8-1.1 canonical을 참조하도록 정리해 중복 이벤트 정의를 제거했다.
- **설명(Description)**: P7/P8 스케줄링·알림 태스크를 병합하고 solver 완료 이벤트 생산-소비 경계를 연결한다.
- **구현 가이드(Guide)**: 1) P7/P8 태스크를 병합한다. 2) solver 완료 이벤트와 알림 소비 의존선을 연결한다. 3) 중복 이벤트 정의를 제거한다.
- **검증 기준(Verification)**: P7/P8 반영 후 solver 완료 이벤트→알림 소비 의존선이 그래프에서 단절 없이 확인된다.
- **선행 조건(Dependencies)**: P0-2.9
- **예상 소요 시간**: 120분
- **관련 파일**: `.shrimp-data/todo/P7.json`, `.shrimp-data/todo/P8.json`, `.shrimp-data/tasks.json`

### P0-2.11 P9~P10 하위 태스크 canonical 병합

- **Task ID**: `db6ead17-422c-4e1b-a994-2171fb5b913a`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: P9/P10 소스 대비 canonical 병합 누락 0건을 확인했고, P10 보안·릴리스 고위험 태스크(147,150,155)의 검증기준을 릴리스 차단 조건까지 포함하도록 보강했다. 또한 P10-1.1 및 P10-3.1에 P0-1.2 품질 게이트 선행 의존선을 추가해 후반 릴리스 경로를 명시적으로 고정했다.
- **설명(Description)**: P9/P10 대시보드·보안 태스크를 병합하고 릴리스 후반 품질 게이트 의존선을 확정한다.
- **구현 가이드(Guide)**: 1) P9/P10 태스크를 병합한다. 2) 보안 감사 태스크와 품질게이트 선행조건을 연결한다. 3) 고위험 태스크 검증 기준을 보강한다.
- **검증 기준(Verification)**: P9/P10 반영 후 보안/대시보드 핵심 경로가 그래프에서 단절 없이 이어진다.
- **선행 조건(Dependencies)**: P0-2.10
- **예상 소요 시간**: 120분
- **관련 파일**: `.shrimp-data/todo/P9.json`, `.shrimp-data/todo/P10.json`, `.shrimp-data/tasks.json`

### P0-2.12 의존성 그래프 무결성 자동 점검 스크립트 정리

- **Task ID**: `4f954f47-cf4b-44ca-81eb-7e3f6c28b34a`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: scripts/shrimp/validate-graph.sh를 생성하여 missing targets, cycles, orphan roots 검증 로직을 구현하고, 이를 scripts/task-quality-check.sh에 통합하여 자동 점검 게이트로 설정했다. 또한 docs/migration/REFINED_PRD_SERVICE_TRANSITION.md에 해당 절차와 수동 검증 명령을 문서화했다.
- **설명(Description)**: canonical tasks.json에서 missing target/cycle/orphan root를 반복 검증할 자동 점검 절차를 정리한다.
- **구현 가이드(Guide)**: 1) dependency edge 추출 명령을 정의한다. 2) missing target/cycle/orphan root 검출 로직을 문서화한다. 3) 배치 병합마다 실행 게이트로 고정한다.
- **검증 기준(Verification)**: 검증 명령이 문서화되고 배치 병합 단위로 cycle=false, missing target=0, orphan root 점검 결과를 재현할 수 있다.
- **선행 조건(Dependencies)**: P0-2.11
- **예상 소요 시간**: 120분
- **관련 파일**: `.shrimp-data/tasks.json`, `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P0-2.13 taskTemplate 정합성 보정(phase/estimatedMinutes 누락 해소)

- **Task ID**: `0ea4c78a-4916-43db-885b-126553d59343`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: 152개 전체 태스크에 대해 tasks.metadata.json의 taskTemplate 기준으로 정합성 검증을 수행했다. requiredFields 누락=0, 이름 패턴 위반=0, estimatedMinutes 허용값 외 사용=0으로 모든 검증 기준을 통과했다. 이는 선행 태스크(P0-2.8~P0-2.12)에서 수행한 정규화 작업이 완료되었음을 확인한다.
- **설명(Description)**: 병합된 태스크를 metadata 기준으로 정규화해 requiredFields 누락을 제거한다.
- **구현 가이드(Guide)**: 1) requiredFields 누락 태스크를 식별한다. 2) phase/estimatedMinutes/relatedFiles/type/namePattern을 보정한다. 3) 보정 결과를 리포트한다.
- **검증 기준(Verification)**: requiredFields 누락=0, 이름 패턴 위반=0, estimatedMinutes 허용값 외 사용=0을 확인한다.
- **선행 조건(Dependencies)**: P0-2.12
- **예상 소요 시간**: 120분
- **관련 파일**: `.shrimp-data/tasks.metadata.json`, `.shrimp-data/tasks.json`

### P0-2.14 P0~P10 크리티컬 패스 문서화 및 완료 판정

- **Task ID**: `9a83c8aa-8482-4075-80dd-62c420de2a9b`
- **설명(Description)**: 병합+정규화가 끝난 그래프에서 크리티컬 패스를 문서화하고 P0-2.2 완료 판정을 기록한다.
- **구현 가이드(Guide)**: 1) phase별 루트/종료 노드를 식별한다. 2) 핵심 경로를 문서화한다. 3) P0-2.2 verificationCriteria 충족 여부를 체크리스트로 판정한다.
- **검증 기준(Verification)**: P0~P10 모든 에픽의 1~3시간 하위 태스크 존재가 확인되고, 크리티컬 패스 문서와 완료 판정 기록이 남아 있다.
- **선행 조건(Dependencies)**: P0-2.12, P0-2.13
- **예상 소요 시간**: 180분
- **관련 파일**: `.shrimp-data/tasks.json`, `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P0-2.3.1 requiredFields 누락 13건 보정(estimatedMinutes 중심)

- **Task ID**: `9578fcaa-fff0-431c-9884-ab167cfd6b52`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: jq 스크립트를 사용하여 .shrimp-data/tasks.json 내의 모든 태스크를 검증했습니다. - estimatedMinutes 누락 태스크: 0건 - 허용값(60, 90, 120, 180) 외의 값을 사용하는 태스크: 0건 모든 데이터가 완벽하게 보정되어 있으므로 작업 완료 처리합니다.
- **설명(Description)**: .shrimp-data/tasks.json에서 requiredFields 누락 태스크를 식별하고 estimatedMinutes를 taskTemplate 허용값(60/90/120/180)으로 채워 requiredFields 누락을 0으로 만든다.
- **구현 가이드(Guide)**: 1) jq로 estimatedMinutes 누락 태스크 ID 목록 추출. 2) 각 태스크 난이도/범위를 기준으로 60/90/120/180 중 하나를 할당. 3) requiredFields 재검증 명령으로 누락 0 확인. 4) 변경 diff를 점검해 의도치 않은 필드 변형이 없는지 확인.
- **검증 기준(Verification)**: Deliverable: estimatedMinutes 누락 13건이 모두 보정된 tasks.json. Method: jq로 requiredFields 및 estimatedMinutes 누락 카운트를 재측정. Pass: requiredFields 누락=0, estimatedMinutes 누락=0, 허용값 외 사용=0.
- **선행 조건(Dependencies)**: 없음
- **예상 소요 시간**: 60분
- **관련 파일**: `.shrimp-data/tasks.json`, `.shrimp-data/tasks.metadata.json`

### P0-2.3.2 relatedFiles.type 표준 위반(TO_CREATE) 정규화

- **Task ID**: `90f21096-9495-4ab6-83d3-253ccf24b15c`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: Task Completed. Successfully normalized 26 occurrences of 'TO_CREATE' to 'CREATE' in the relatedFiles.type arrays across all relevant .shrimp-data/todo/\*.json files. Verified that no other invalid types exist. The changes were validated and successfully committed to git.
- **설명(Description)**: relatedFiles.type에서 비표준 값 TO_CREATE를 표준 CREATE로 일괄 정규화하고 기타 위반값이 없는지 검증한다.
- **구현 가이드(Guide)**: 1) TO_CREATE 사용 항목을 전수 추출. 2) tasks.json에서 type 값을 CREATE로 치환. 3) relatedFileTypes 허용 집합(TO_MODIFY/REFERENCE/CREATE/DEPENDENCY/OTHER) 기준으로 재검증. 4) 치환 전후 건수 비교 리포트 작성.
- **검증 기준(Verification)**: Deliverable: relatedFiles.type 정규화가 반영된 tasks.json. Method: jq로 허용 타입 외 항목 수를 집계. Pass: relatedFiles.type 위반=0, 기존 path/description 값 손실=0.
- **선행 조건(Dependencies)**: P0-2.3.1
- **예상 소요 시간**: 60분
- **관련 파일**: `.shrimp-data/tasks.json`, `.shrimp-data/tasks.metadata.json`

### P0-2.3.3 네이밍 규칙/검증기준 문구 표준화

- **Task ID**: `24b9304c-ee93-4908-9f78-c0fd145b7b2e`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: namePattern 위반 0건, verificationCriteria 3요소(Deliverable/Method/Pass) 포함률 100% 확인. 전체 146개 태스크 검증 완료.
- **설명(Description)**: namePattern 위반 태스크를 규칙에 맞게 보정하고 verificationCriteria를 Deliverable/Method/Pass 3요소 형태로 통일한다.
- **구현 가이드(Guide)**: 1) namePattern 위반 태스크 2건을 규칙(^P\d+-\d+\.\d+\s+.+$)에 맞게 리네이밍. 2) verificationCriteria가 단문인 태스크를 우선순위별로 Deliverable/Method/Pass 형태로 개편. 3) 규칙 준수율을 수치로 기록.
- **검증 기준(Verification)**: Deliverable: namePattern 위반 보정 및 3요소형 verificationCriteria 반영본. Method: 정규식 매칭 카운트와 verificationCriteria 패턴(Deliverable/Method/Pass) 포함 여부를 집계. Pass: namePattern 위반=0, verificationCriteria 3요소 포함률이 목표치 이상(예: 90% 이상).
- **선행 조건(Dependencies)**: P0-2.3.2
- **예상 소요 시간**: 120분
- **관련 파일**: `.shrimp-data/tasks.json`, `.shrimp-data/tasks.metadata.json`

### P0-2.3.4 태스크 정합성 자동검증 명령/스크립트 정리

- **Task ID**: `3750ea45-f661-494c-b858-747cf94656f9`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: 정합성 검증 스크립트 scripts/task-quality-check.sh 생성 및 .shrimp-data/tasks/README.md에 검증 섹션 추가. 4개 핵심 지표(requiredFields/estimatedMinutes/namePattern/relatedFiles.type) 자동 검증 가능.
- **설명(Description)**: 반복 가능한 정합성 검증 루틴을 문서 또는 스크립트로 정리해 이후 병합 시 품질 회귀를 방지한다.
- **구현 가이드(Guide)**: 1) requiredFields/estimatedMinutes/namePattern/relatedFiles.type 검증 jq 명령 세트를 정리. 2) 필요 시 scripts/task-quality-check.sh 생성. 3) 실행 순서와 기대 출력 형식을 문서화. 4) 샘플 실행 로그로 재현성 확인.
- **검증 기준(Verification)**: Deliverable: 재사용 가능한 품질 검증 절차(문서 또는 스크립트). Method: 정의된 명령을 클린 상태에서 재실행. Pass: 동일 입력에서 동일 카운트 결과가 재현되고, 핵심 4개 지표(requiredFields/estimatedMinutes/namePattern/relatedFiles.type)가 모두 보고된다.
- **선행 조건(Dependencies)**: P0-2.3.3
- **예상 소요 시간**: 90분
- **관련 파일**: `.shrimp-data/tasks/README.md`, `.shrimp-data/tasks.json`, `scripts/task-quality-check.sh`

### P0-2.3.5 namePattern 위반 태스크 리네이밍

- **Task ID**: `b17e29b8-877d-48bc-8742-e54b82498cb7`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: `tasks.json` 및 각 Phase별 JSON 파일에서 `namePattern`(`^P\d+-\d+\.\d+\s+.+$`)을 위반하는 모든 태스크를 식별하고 규칙에 맞게 이름을 수정 완료함.
- **설명(Description)**: metadata에 정의된 namePattern을 위반하는 태스크들의 이름을 표준 형식으로 수정한다.
- **구현 가이드(Guide)**: 1) namePattern 정규식으로 위반 사례 추출. 2) Px-y.z 형식 준수 확인. 3) tasks.json에 반영.
- **검증 기준(Verification)**: Deliverable: 이름이 보정된 tasks.json. Method: 정규식 매칭 카운트 재측정. Pass: namePattern 위반=0.
- **선행 조건(Dependencies)**: 없음
- **예상 소요 시간**: 60분
- **관련 파일**: `.shrimp-data/tasks.json`, `.shrimp-data/tasks.metadata.json`

### P0-2.3.6 verificationCriteria 3요소 형태로 개편

- **Task ID**: `bd363acc-f675-4dd5-8a1b-d536c94f8e96`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: 전체 태스크의 `verificationCriteria`를 Deliverable, Method, Pass 3요소를 포함한 구조적 텍스트로 일괄 개편 완료함.
- **설명(Description)**: 모든 태스크의 검증 기준을 Deliverable/Method/Pass 3요소 체계로 구조화한다.
- **구현 가이드(Guide)**: 1) 기존 단문형 검증 기준 추출. 2) 3요소 템플릿 적용. 3) tasks.json 일괄 업데이트.
- **검증 기준(Verification)**: Deliverable: 3요소 체계가 적용된 tasks.json. Method: 텍스트 내 키워드(Deliverable, Method, Pass) 포함 여부 검사. Pass: 개편 대상 태스크의 100% 반영.
- **선행 조건(Dependencies)**: P0-2.3.5
- **예상 소요 시간**: 90분
- **관련 파일**: `.shrimp-data/tasks.json`

### P0-2.3.7 규칙 준수율 측정 및 기록

- **Task ID**: `014e3ec4-3769-4af4-8815-0512223a3a1c`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: `scripts/shrimp/measure-compliance.js`를 통해 최종 준수율을 측정한 결과, namePattern 준수율 100%, verificationCriteria 3요소 준수율 100%를 달성했음을 확인하고 리포트를 생성함.
- **설명(Description)**: 정규화 작업 후 최종적인 규칙 준수율을 측정하고 그 결과를 문서로 기록한다.
- **구현 가이드(Guide)**: 1) 측정 스크립트 실행. 2) 준수율 통계 추출. 3) .shrimp-data/compliance_report.txt 생성.
- **검증 기준(Verification)**: Deliverable: compliance_report.txt. Method: 리포트 내 수치 확인. Pass: 주요 지표 100% 달성 기록.
- **선행 조건(Dependencies)**: P0-2.3.6
- **예상 소요 시간**: 60분
- **관련 파일**: `.shrimp-data/compliance_report.txt`

### P0-2.4 전역 RBAC 메뉴/라우트 매트릭스 누락 보강

- **Task ID**: `a59d8e0e-df2b-4f1d-9002-6f0b8825441b`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: `docs/migration/RBAC_MATRIX.md`에 전역 메뉴/라우트 권한 매트릭스, PRD↔Phase 추적 매트릭스, P1/P2/P3/P4/P9 누락 점검 결과, 후속 강화 후보 목록을 문서화했다. 또한 `docs/migration/REMAINING_TASKS_MERGED.md`의 P0-2.4/P0-2.4.2 상태 스냅샷을 canonical 기준으로 정합화해 계정 모듈 외 메뉴 권한 미추적 누락 0건을 명시했다.
- **설명(Description)**: 계정 모듈 외 전체 메뉴/라우트 기준으로 super/admin/user 권한 매트릭스 요구를 백로그에 명시하고 관련 phase 태스크로 연결한다.
- **구현 가이드(Guide)**: 1) REFINED_PRD의 권한 요구를 메뉴/라우트 단위로 재정리한다. 2) 기존 P1/P2/P3/P4/P9 태스크 중 RBAC 누락 구간을 식별해 연결한다. 3) 누락 항목을 후속 phase 태스크로 등록할 추가 목록을 확정한다.
- **검증 기준(Verification)**: Deliverable: 전역 RBAC 메뉴/라우트 매트릭스와 누락 태스크 후보 목록이 문서화된다. Method: REFINED_PRD 권한 섹션과 phase 태스크를 대조 검토한다. Pass: 계정 모듈 외 메뉴 권한 누락이 0건으로 표시된다.
- **선행 조건(Dependencies)**: P0-2.1, P0-2.4.1, P0-2.4.2
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/REFINED_PRD.md`, `docs/migration/REMAINING_TASKS_MERGED.md`, `.shrimp-data/tasks.json`

### P0-2.4.1 전역 RBAC 라우트/메뉴 권한 매트릭스 문서 작성

- **Task ID**: `21d4bb02-23fe-4055-9fae-4123143f91a9`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: docs/migration/RBAC_MATRIX.md 문서를 생성하여 전체 메뉴(인증/온보딩, 조직, 직원, 계정 관리, 근무표 생성, 대시보드, 알림 시스템)에 대한 super, admin, user 권한 매트릭스를 누락 없이 명세 완료함.
- **설명(Description)**: REFINED_PRD.md의 요구사항을 분석하여 모든 메뉴(계정, 조직, 직원, 근무표 생성, 알림, 대시보드) 및 라우트에 대한 super/admin/user 역할별 접근 권한(조회/생성/수정/삭제) 매트릭스를 마크다운 문서로 명문화한다.
- **구현 가이드(Guide)**: 1. `docs/migration/RBAC_MATRIX.md` (또는 기존 관련 문서) 파일을 생성하거나 수정한다.\n2. 각 메뉴별로 3가지 역할(super, admin, user)의 라우트 접근 가능 여부 및 CRUD 권한을 표 형태로 정리한다.\n3. 예: 조직 관리(super: 전체, admin: 소속 조직, user: 불가), 개인 대시보드(user: 접근 가능, admin: 접근 불가 등 명확한 기준 확립).
- **검증 기준(Verification)**: 문서 내에 계정 모듈 외 모든 메뉴(조직, 직원, 근무표, 알림, 대시보드)에 대한 super/admin/user 접근 권한 표가 누락 없이 작성되었는지 확인한다.
- **선행 조건(Dependencies)**: P0-2.1
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`, `docs/migration/RBAC_MATRIX.md`

### P0-2.4.2 기존 Phase 태스크(P3~P9)에 RBAC 가드 요구사항 보강

- **Task ID**: `194b66c3-288f-4b89-bf46-b97496d4e62d`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: RBAC 매트릭스를 기준으로 P3/P5/P7/P9 phase 태스크에 `meta.roles`, `beforeEach`, 역할별 홈 분기 및 UI 노출 제어 요구사항을 연결해 라우트 가드 요구를 보강했다.
- **설명(Description)**: 작성된 RBAC 매트릭스 문서를 기준으로 향후 구현할 기존 Phase 태스크(todo/P3~P9)의 description 및 implementationGuide에 Vue Router 가드(meta.roles) 및 UI 제어 요구사항을 구체적으로 보강한다.
- **구현 가이드(Guide)**: 1. P3(인증/권한): Vue Router 전역 가드(`beforeEach`)에서 `meta.roles`를 확인하여 403 처리 및 역할별 홈 리다이렉트 로직 구현 요구사항 추가.\n2. P5(조직/직원): 조직 및 직원 관리 페이지에 `[super, admin]` 전용 라우터 가드 요구사항 추가.\n3. P7(근무표 생성): 스케줄 생성/편집 라우트에 admin/super 전용 접근 가드 요구사항 추가.\n4. P9(대시보드): 로그인 후 역할에 따라 관리자 대시보드 또는 개인 대시보드로 자동 라우팅되는 분기 처리 요구사항 추가.\n5. `.shrimp-data/todo/` 또는 `tasks.json`의 해당 태스크 항목을 업데이트한다.
- **검증 기준(Verification)**: 기존 P3, P5, P7, P9 관련 백로그 태스크의 설명이나 구현 가이드에 RBAC(라우터 가드 및 역할별 분기) 요구사항이 명확히 추가되었는지 확인한다.
- **선행 조건(Dependencies)**: P0-2.4.1
- **예상 소요 시간**: 120분
- **관련 파일**: `.shrimp-data/todo/`, `docs/migration/REMAINING_TASKS_MERGED.md`

### P0-2.5 가입-조직생성(6.2 재사용) 요구 백로그 연결

- **Task ID**: `c189da56-e1d2-4f5c-b7ca-8c0928d11fb3`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: PRD 5.1/6.2 연결 플로우를 `docs/migration/SIGNUP_ORG_REUSE_BRIDGE.md`에 상태 다이어그램과 라우트/API/권한 계약으로 문서화했고, 누락 구현 항목을 P2/P5 phase 태스크 5건으로 백로그에 추가하여 재사용 요구의 구현 경계와 책임 phase를 명확히 확정했다.
- **설명(Description)**: 회원가입에서 조직 정보가 없을 때 6.2 Organization Management 화면을 재사용하는 요구를 구현 가능한 태스크 경계로 명시한다.
- **구현 가이드(Guide)**: 1) PRD 5.1과 6.2의 연결 플로우를 상태 다이어그램으로 정리한다. 2) P2(가입)와 P5(조직관리) 사이 인터페이스 계약(라우트/API/권한)을 명시한다. 3) 누락된 구현 태스크를 phase별로 추가한다.
- **검증 기준(Verification)**: Deliverable: 가입→조직생성(6.2 재사용) 연결 플로우와 구현 태스크 목록이 추가된다. Method: P2/P5 태스크와 PRD 5.1/6.2를 교차 검토한다. Pass: 조직생성 재사용 요구가 구현 백로그에 명시되고 책임 phase가 지정된다.
- **선행 조건(Dependencies)**: P0-2.4
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/REFINED_PRD.md`, `.shrimp-data/todo/P2.json`, `.shrimp-data/todo/P5.json`, `docs/migration/SIGNUP_ORG_REUSE_BRIDGE.md`, `.shrimp-data/tasks.json`

### P0-2.6 Solver 완료 알림 이벤트 경계 보강

- **Task ID**: `92faa6b4-20db-404d-a5d9-9b24760168fc`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: P7-2.1에 solver 완료 이벤트 생산자 책임과 eventType/payload/idempotencyKey 계약 필드를 명시하고, P8-1.1~1.3에 소비 계약 및 교차 의존성을 연결했습니다. 또한 P8-1.5 경계 검증 태스크를 추가하고 P8-2.1 선행 의존성에 반영해 생산→소비 파이프라인이 백로그에서 단절 없이 이어지도록 정리했습니다.
- **설명(Description)**: AI 엔진 실행 완료 알림 요구를 충족하도록 solver 완료 이벤트 생산자(P7)와 알림 파이프라인 소비자(P8) 경계를 태스크로 명확히 반영한다.
- **구현 가이드(Guide)**: 1) P7 solver 완료 시점의 이벤트 생성 책임을 정의한다. 2) P8 알림 이벤트 스키마와 연결되는 계약 필드(eventType/payload/idempotencyKey)를 확정한다. 3) 경계 검증 테스트 태스크를 추가한다.
- **검증 기준(Verification)**: Deliverable: solver 완료 이벤트 생산-소비 경계와 검증 태스크가 정의된다. Method: P7/P8 태스크와 PRD 알림 요구를 대조한다. Pass: AI 완료 알림 요구가 이벤트 생산부터 소비까지 백로그에서 단절 없이 연결된다.
- **선행 조건(Dependencies)**: P0-2.5
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/REFINED_PRD.md`, `.shrimp-data/todo/P7.json`, `.shrimp-data/todo/P8.json`, `.shrimp-data/tasks.json`

### P0-2.7 P1~P2 하위 태스크 canonical 병합

- **Task ID**: `634b3991-aa06-4b2f-9e39-2e14bf89fba5`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: P1/P2 todo 소스(총 23개)를 canonical tasks.json과 대조한 결과, 누락 병합 대상 0건으로 이미 반영 완료 상태를 확인했다. 또한 병합 직후 기준으로 중복 ID 0건, namePattern 위반 0건, 누락 dependency target 0건을 스크립트로 검증해 요구된 무결성 조건을 모두 충족했다.
- **설명(Description)**: P1/P2 하위 태스크를 todo 소스에서 canonical tasks.json으로 병합하고, 병합 직후 ID/이름/의존성 target 유효성을 점검한다.
- **구현 가이드(Guide)**: 1) .shrimp-data/todo/P1.json, P2.json에서 태스크를 추출한다. 2) tasks.json에 병합한다. 3) 중복 ID/이름 패턴/누락 dependency target을 즉시 점검한다.
- **검증 기준(Verification)**: P1/P2 태스크가 canonical에 반영되고, 중복 ID=0/이름 패턴 위반=0/누락 dependency target=0을 확인한다.
- **선행 조건(Dependencies)**: P0-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `.shrimp-data/todo/P1.json`, `.shrimp-data/todo/P2.json`, `.shrimp-data/tasks.json`

### P0-2.8 P3~P4 하위 태스크 canonical 병합

- **Task ID**: `c227e7ec-7a5e-4d8b-b838-b308af62fd63`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: P3/P4 todo와 canonical 매핑을 점검해 누락 병합 0건을 확인했고, 인증→온보딩→관리 의존선(P2-2.4→P3-1.1, P3-3.3→P4-1.1)을 추가했다. 또한 P2 승인 UI와 P4 계정관리 UI의 책임 경계 충돌을 양쪽 notes에 명시했으며 dependency target 누락 0, cycle 0을 검증했다.
- **설명(Description)**: P3/P4 태스크를 병합하고 인증-온보딩-관리 흐름의 선후행 의존선을 명시한다.
- **구현 가이드(Guide)**: 1) P3/P4 todo를 병합한다. 2) 승인 상태와 온보딩 선행조건 의존선을 연결한다. 3) 병합 직후 그래프 누락 target 점검을 반복한다.
- **검증 기준(Verification)**: P3/P4 태스크가 canonical에 반영되고, 인증→온보딩→관리 핵심 의존선이 추적 가능하다.
- **선행 조건(Dependencies)**: P0-2.7
- **예상 소요 시간**: 120분
- **관련 파일**: `.shrimp-data/todo/P3.json`, `.shrimp-data/todo/P4.json`, `.shrimp-data/tasks.json`

### P0-2.9 P5~P6 하위 태스크 canonical 병합

- **Task ID**: `d2cb1c5e-adda-4649-b59f-9985432fb377`
- **현재 상태(Status)**: completed (2026-02-28)
- **완료 요약(Summary)**: P5/P6 소스 태스크가 canonical tasks.json에 모두 반영됨을 ID 집합 비교로 확인했고, 누락되었던 브리지 태스크 5건의 phase/estimatedMinutes를 정규화하여 requiredFields 누락 0건, estimatedMinutes 허용값(60/90/120/180) 위반 0건, relatedFiles.type 위반 0건을 달성했습니다. 또한 P5/P6 경계 점검에서 조직관리/직원관리 키워드 교차 혼선이 없음을 확인했습니다.
- **설명(Description)**: P5/P6 조직·직원 관리 태스크를 병합하고 taskTemplate 정합성을 동시 점검한다.
- **구현 가이드(Guide)**: 1) P5/P6 태스크를 병합한다. 2) relatedFiles.type/estimatedMinutes 허용값을 점검한다. 3) 경계(조직관리 vs 직원관리)를 유지한다.
- **검증 기준(Verification)**: P5/P6 반영 후 requiredFields 누락=0, estimatedMinutes는 60/90/120/180만 사용된다.
- **선행 조건(Dependencies)**: P0-2.8
- **예상 소요 시간**: 120분
- **관련 파일**: `.shrimp-data/todo/P5.json`, `.shrimp-data/todo/P6.json`, `.shrimp-data/tasks.metadata.json`, `.shrimp-data/tasks.json`

---

---

## P1 (예상 시간: 25시간 0분)

### 요약 (Summary)

| Task ID                                | 태스크 명                                                                      | 상태    | 선행 태스크(Dependencies) | 예상 시간 |
| -------------------------------------- | ------------------------------------------------------------------------------ | ------- | ------------------------- | --------- |
| `10000000-0000-4000-8000-000000000043` | **P1-1.1 멀티테넌트/RBAC 데이터 모델 확정(ERD 수준)**                          | pending | P0-1.3                    | 180m      |
| `10000000-0000-4000-8000-000000000044` | **P1-1.2 마이그레이션 007 설계/DDL 초안 작성**                                 | pending | P1-1.1                    | 180m      |
| `10000000-0000-4000-8000-000000000045` | **P1-1.3 Seed/Backfill 기준 정의(기존 MVP 호환)**                              | pending | P1-1.2                    | 120m      |
| `00726cae-2c8e-4f81-af12-4bb55e494203` | **P1-1.4 Harden 007 migration for legacy site_requirements multitenant scope** | pending | -                         | 120m      |
| `10000000-0000-4000-8000-000000000046` | **P1-2.1 RBAC 판별 로직/헬퍼 함수 설계(정책 기준)**                            | pending | P1-1.3<br>P1-1.4          | 180m      |
| `10000000-0000-4000-8000-000000000047` | **P1-2.2 테이블별 RLS 매트릭스 작성 + 적용 순서 결정**                         | pending | P1-2.1                    | 180m      |
| `10000000-0000-4000-8000-000000000048` | **P1-2.3 RLS 검증 시나리오/테스트 설계(테넌트 침범 방지)**                     | pending | P1-2.2                    | 120m      |
| `10000000-0000-4000-8000-000000000049` | **P1-3.1 백필 대상/매핑 정의 + 검증 쿼리 목록화**                              | pending | P1-1.3<br>P1-1.4          | 120m      |
| `10000000-0000-4000-8000-000000000050` | **P1-3.2 백필 SQL/절차 초안 작성(멱등/재실행 가능)**                           | pending | P1-3.1                    | 180m      |
| `10000000-0000-4000-8000-000000000051` | **P1-3.3 백필 후 검증(무결성/샘플 플로우) 체크리스트**                         | pending | P1-3.2                    | 120m      |

### 상세 (Details)

### P1-1.1 멀티테넌트/RBAC 데이터 모델 확정(ERD 수준)

- **Task ID**: `10000000-0000-4000-8000-000000000043`
- **설명(Description)**: profiles, organization_memberships, signup_requests, approval_logs, organization_settings, sites/skills/ranks 등 서비스 전환에 필요한 테이블/관계/키를 확정한다.
- **구현 가이드(Guide)**: 1) 테이블 목록/필드/PK/FK 확정. 2) 멀티테넌트 기준 컬럼(organization_id) 적용 범위 정의. 3) 인덱스/유니크 키 초안 작성.
- **검증 기준(Verification)**: PRD 기능을 지원하는 최소 테이블/관계가 정의되어 있고, 테넌트 격리 기준이 명확하다.
- **선행 조건(Dependencies)**: P0-1.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/REFINED_PRD.md`, `docs/prd/02-database-migration.md`

### P1-1.2 마이그레이션 007 설계/DDL 초안 작성

- **Task ID**: `10000000-0000-4000-8000-000000000044`
- **설명(Description)**: 서비스 전환용 마이그레이션 파일(007_service_transition_rbac_multitenant.sql)의 DDL 초안을 작성하고 적용 순서를 확정한다.
- **구현 가이드(Guide)**: 1) 기존 테이블 확장(비파괴)과 신규 테이블 생성 순서 정의. 2) 인덱스/제약조건 추가. 3) 마이그레이션 주석/롤백 노트 초안 작성.
- **검증 기준(Verification)**: 007 마이그레이션 초안이 존재하고, PRD의 공통 기능 테이블이 포함된다.
- **선행 조건(Dependencies)**: P1-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`

### P1-1.3 Seed/Backfill 기준 정의(기존 MVP 호환)

- **Task ID**: `10000000-0000-4000-8000-000000000045`
- **설명(Description)**: 기존 MVP seed.sql 및 운영 데이터가 새 스키마로 자연스럽게 확장되도록 seed/backfill 원칙을 정의한다.
- **구현 가이드(Guide)**: 1) 기본 조직/시프트/직원 seed 유지 원칙 정의. 2) memberships/profiles 기본 생성 규칙 정의. 3) 백필이 필요한 컬럼/테이블 목록화.
- **검증 기준(Verification)**: 기존 MVP 데이터가 서비스 스키마로 확장되는 경로가 문서화되어 있다.
- **선행 조건(Dependencies)**: P1-1.2
- **예상 소요 시간**: 120분
- **관련 파일**: `supabase/seed.sql`

### P1-1.4 Harden 007 migration for legacy site_requirements multitenant scope

- **Task ID**: `00726cae-2c8e-4f81-af12-4bb55e494203`
- **설명(Description)**: Refine migrations/007_service_transition_rbac_multitenant.sql so it remains idempotent, preserves existing data, and resolves uniqueness-scope conflicts between legacy site_requirements and multitenant expansion fields.
- **구현 가이드(Guide)**: 1) Keep existing ADD COLUMN IF NOT EXISTS strategy for core tables. 2) In site_requirements block: add service columns first, then drop old unique constraint site_requirements_organization_id_shift_id_day_of_week_key using IF EXISTS, then create new UNIQUE index scoped by organization/site/shift/day/skill/rank with COALESCE for nullable columns. 3) Clarify table roles by documenting site_staffing_requirements as service-native and site_requirements as legacy compatibility table.
- **검증 기준(Verification)**: 기존 데이터 row count가 유지되고, site_requirements_organization_id_shift_id_day_of_week_key 제약이 제거되며, organization/site/shift/day/skill/rank 스코프의 UNIQUE 인덱스가 생성되고, 마이그레이션 재실행 시 중복 객체 오류가 발생하지 않는다.
- **선행 조건(Dependencies)**: 없음
- **예상 소요 시간**: 120분
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`

### P1-2.1 RBAC 판별 로직/헬퍼 함수 설계(정책 기준)

- **Task ID**: `10000000-0000-4000-8000-000000000046`
- **설명(Description)**: super/admin/user 역할과 membership 상태(pending/approved 등)를 기반으로 접근 제어를 판별하는 DB 헬퍼/정책 기준을 설계한다.
- **구현 가이드(Guide)**: 1) 역할 판별 기준(우선순위/복수 조직 소속 시) 정의. 2) approved membership만 접근 허용 원칙 정의. 3) 헬퍼 함수/뷰 형태(SQL) 초안 작성.
- **검증 기준(Verification)**: 역할/상태별 접근 허용 규칙이 문서화되어 있고, SQL 구현 형태가 결정되어 있다.
- **선행 조건(Dependencies)**: P1-1.3, P1-1.4
- **예상 소요 시간**: 180분
- **관련 파일**: `migrations/008_rls_progressive_rollout.sql`

### P1-2.2 테이블별 RLS 매트릭스 작성 + 적용 순서 결정

- **Task ID**: `10000000-0000-4000-8000-000000000047`
- **설명(Description)**: 핵심 테이블(organizations, employees, schedules 등)에 대해 테넌트 격리 RLS 정책 매트릭스를 작성하고 적용 순서를 결정한다.
- **구현 가이드(Guide)**: 1) 테이블별 SELECT/INSERT/UPDATE/DELETE 허용자 정의. 2) super/admin/user 차이를 표로 정리. 3) 적용 순서(테이블 생성→RLS enable→정책) 결정.
- **검증 기준(Verification)**: RLS 정책 표가 존재하고, 모든 핵심 테이블이 누락 없이 포함된다.
- **선행 조건(Dependencies)**: P1-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/prd/02-database-migration.md`

### P1-2.3 RLS 검증 시나리오/테스트 설계(테넌트 침범 방지)

- **Task ID**: `10000000-0000-4000-8000-000000000048`
- **설명(Description)**: 타조직 데이터 접근 차단, role escalation, IDOR 등을 포함한 RLS 검증 시나리오와 테스트 전략을 설계한다.
- **구현 가이드(Guide)**: 1) 공격/오용 시나리오 목록화. 2) 최소 e2e 또는 통합테스트 접근 결정. 3) 각 시나리오의 기대 결과(403/빈 결과) 정의.
- **검증 기준(Verification)**: 테넌트 격리/권한 상승 방지에 대한 테스트 케이스 목록이 확정되어 있다.
- **선행 조건(Dependencies)**: P1-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P1-3.1 백필 대상/매핑 정의 + 검증 쿼리 목록화

- **Task ID**: `10000000-0000-4000-8000-000000000049`
- **설명(Description)**: 새 스키마 도입 후 기존 MVP 데이터(조직/직원/스케줄)를 백필할 대상과 매핑 규칙을 정의하고 검증 쿼리를 준비한다.
- **구현 가이드(Guide)**: 1) 백필 필요 컬럼/테이블 목록화. 2) org/code/timezone 등 기본값 정책 정의. 3) 백필 후 검증 쿼리(카운트/무결성) 목록 작성.
- **검증 기준(Verification)**: 백필 매핑과 검증 쿼리가 문서로 정리되어 있다.
- **선행 조건(Dependencies)**: P1-1.3, P1-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/prd/02-database-migration.md`

### P1-3.2 백필 SQL/절차 초안 작성(멱등/재실행 가능)

- **Task ID**: `10000000-0000-4000-8000-000000000050`
- **설명(Description)**: 백필을 위한 SQL/절차를 작성하고, 재실행 시 안전(멱등성)하게 동작하도록 전략을 확정한다.
- **구현 가이드(Guide)**: 1) upsert/insert-ignore 전략 결정. 2) membership/profiles 기본 생성 규칙 적용. 3) 실패 시 롤백/재시도 절차 문서화.
- **검증 기준(Verification)**: 백필 절차가 단계별로 정의되어 있고, 재실행 시 중복/오염 위험이 낮다.
- **선행 조건(Dependencies)**: P1-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `migrations/008_backfill_service_fields.sql`

### P1-3.3 백필 후 검증(무결성/샘플 플로우) 체크리스트

- **Task ID**: `10000000-0000-4000-8000-000000000051`
- **설명(Description)**: 백필 적용 후 데이터 무결성(참조, 카운트)과 핵심 샘플 플로우(로그인/조직 조회 등) 검증 체크리스트를 확정한다.
- **구현 가이드(Guide)**: 1) 레코드 수/참조 무결성 체크 항목 작성. 2) 샘플 계정/조직으로 조회/편집 플로우 정의. 3) 이슈 발생 시 복구 절차 연결.
- **검증 기준(Verification)**: 검증 체크리스트가 존재하고, 백필 성공/실패를 객관적으로 판단할 수 있다.
- **선행 조건(Dependencies)**: P1-3.2
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/final-verification-report.md`

---

---

## P2 (예상 시간: 38시간 30분)

### 요약 (Summary)

| Task ID                                | 태스크 명                                                               | 상태    | 선행 태스크(Dependencies) | 예상 시간 |
| -------------------------------------- | ----------------------------------------------------------------------- | ------- | ------------------------- | --------- |
| `10000000-0000-4000-8000-000000000052` | **P2-1.1 회원가입 UX/필드/상태(승인대기/반려) 스펙 확정**               | pending | P1-1.4                    | 120m      |
| `10000000-0000-4000-8000-000000000053` | **P2-1.2 DB 규칙: signup_requests 생성 및 membership 생성 타이밍 정의** | pending | P2-1.1                    | 120m      |
| `10000000-0000-4000-8000-000000000054` | **P2-1.3 가입 제출 API 설계(Edge Function/RPC) + 입력 검증**            | pending | P2-1.2                    | 180m      |
| `10000000-0000-4000-8000-000000000055` | **P2-1.4 UI: 회원가입 페이지 구현(제출/검증/결과)**                     | pending | P2-1.3                    | 180m      |
| `10000000-0000-4000-8000-000000000056` | **P2-1.5 가입 제출 스모크 테스트 시나리오 정의**                        | pending | P2-1.4                    | 120m      |
| `10000000-0000-4000-8000-000000000057` | **P2-2.1 승인 상태 모델링: membership/status 기반 접근 제어 설계**      | pending | P2-1.5                    | 120m      |
| `10000000-0000-4000-8000-000000000058` | **P2-2.2 Route guard 설계: 미승인 사용자 차단 + 전용 라우팅**           | pending | P2-2.1                    | 180m      |
| `10000000-0000-4000-8000-000000000059` | **P2-2.3 UI: 승인대기/반려 화면 스펙 및 컴포넌트 정의**                 | pending | P2-2.2                    | 120m      |
| `10000000-0000-4000-8000-000000000060` | **P2-2.4 승인 상태별 라우팅 테스트 시나리오 정의**                      | pending | P2-2.3                    | 120m      |
| `10000000-0000-4000-8000-000000000061` | **P2-3.1 승인/반려 워크플로우 정책 확정(권한/감사로그)**                | pending | P2-1.5                    | 120m      |
| `10000000-0000-4000-8000-000000000062` | **P2-3.2 승인 결정 API 계약 정의(approve/reject/withdraw)**             | pending | P2-3.1                    | 180m      |
| `10000000-0000-4000-8000-000000000063` | **P2-3.3 UI: 승인 대기 목록/필터/상세 화면 스펙**                       | pending | P2-3.2                    | 180m      |
| `10000000-0000-4000-8000-000000000064` | **P2-3.4 승인 결과 알림 이벤트 생성 정책 정의**                         | pending | P2-3.2                    | 90m       |
| `10000000-0000-4000-8000-000000000065` | **P2-3.5 End-to-End 승인 플로우 테스트 시나리오 정의**                  | pending | P2-3.3<br>P2-3.4          | 180m      |

### 상세 (Details)

### P2-1.1 회원가입 UX/필드/상태(승인대기/반려) 스펙 확정

- **Task ID**: `10000000-0000-4000-8000-000000000052`
- **설명(Description)**: admin/user 가입 UX를 확정하고 필수/선택 필드, 성공/실패/승인대기 상태 UI를 정의한다. 기존 로그인 화면과 라우팅 구조를 기준으로 /signup 진입 및 제출 후 상태 안내 흐름을 확정한다.
- **구현 가이드(Guide)**: 1) 공통 필드(name,email,password,requestedRole,organizationId)와 role별 선택 필드(workType,shiftType,requestedSiteName,requestedSkillSummary,requestedRankCode,requestedCredit)를 정의한다. 2) 성공 시 pending 안내 메시지/상태 카드 UX를 정의한다. 3) Login 페이지에서 signup 진입 CTA를 정의한다.
- **검증 기준(Verification)**: 회원가입 화면의 입력 필드/상태별 UX(성공/실패/승인대기)가 명확히 문서화되고, 구현 대상 경로와 라우팅 흐름이 확정된다.
- **선행 조건(Dependencies)**: P1-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`, `src/views/auth/Login.vue`, `src/views/auth/Signup.vue`, `src/router/index.ts`

### P2-1.2 DB 규칙: signup_requests 생성 및 membership 생성 타이밍 정의

- **Task ID**: `10000000-0000-4000-8000-000000000053`
- **설명(Description)**: 가입 제출 시 signup_requests 생성 규칙과 승인 시 membership 반영 타이밍을 상태 전이 관점으로 확정한다.
- **구현 가이드(Guide)**: 1) signup_requests.status 전이(pending->approved/rejected/withdrawn)와 중복 신청 정책을 정의한다. 2) approved 시 organization_memberships 생성/갱신 규칙(role,status,approved_by,approved_at)을 정의한다. 3) requester_user_id 및 organization_id 참조 무결성 조건을 명시한다.
- **검증 기준(Verification)**: 가입 제출 전후 DB 기대 상태와 승인 이후 membership 반영 타이밍이 문서화되어 상태 전이가 모호하지 않다.
- **선행 조건(Dependencies)**: P2-1.1
- **예상 소요 시간**: 120분
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`, `docs/API_SPEC.md`

### P2-1.3 가입 제출 API 설계(Edge Function/RPC) + 입력 검증

- **Task ID**: `10000000-0000-4000-8000-000000000054`
- **설명(Description)**: Signup 제출 서버 경계를 명확히 하고 production edge-function 우선 정책 및 dev-only fallback 정책을 포함한 API 계약을 정의한다.
- **구현 가이드(Guide)**: 1) 요청/응답 DTO를 정의한다. 2) 클라이언트 API 래퍼 `src/api/signup.ts`에서 `supabase.functions.invoke('signup-submit')`를 기본 경로로 설계한다. 3) function 미구현 시 dev 환경에서만 제한적 fallback 경로를 허용한다. 4) 에러 코드를 UI 친화 메시지로 매핑한다.
- **검증 기준(Verification)**: 가입 제출 API의 요청/응답/에러 계약이 확정되고, production/dev 경계 정책이 명시된다.
- **선행 조건(Dependencies)**: P2-1.2
- **예상 소요 시간**: 180분
- **관련 파일**: `supabase/functions/signup-submit/index.ts`, `src/api/signup.ts`, `src/api/supabase.ts`, `docs/API_SPEC.md`

### P2-1.4 UI: 회원가입 페이지 구현(제출/검증/결과)

- **Task ID**: `10000000-0000-4000-8000-000000000055`
- **설명(Description)**: 회원가입 페이지를 구현하고, store/API를 통해 가입 요청을 전송한 뒤 승인대기 안내까지 연결한다.
- **구현 가이드(Guide)**: 1) `src/views/auth/Signup.vue`에 Naive UI 기반 폼과 검증 규칙을 구현한다. 2) `src/stores/auth.ts`에 `signup` action을 추가해 `src/api/signup.ts`를 호출한다. 3) `src/router/index.ts`에 `/signup` 공개 라우트를 추가하고 Login에서 이동 링크를 제공한다. 4) 성공/실패/로딩 상태를 UI에 반영한다.
- **검증 기준(Verification)**: 가입 제출 시 요청이 전송되고, 성공/실패/로딩 상태가 화면에 올바르게 표시되며 성공 시 승인대기 안내가 노출된다.
- **선행 조건(Dependencies)**: P2-1.3
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/auth/Signup.vue`, `src/stores/auth.ts`, `src/router/index.ts`, `src/views/auth/Login.vue`, `src/utils/message.ts`

### P2-1.5 가입 제출 스모크 테스트 시나리오 정의

- **Task ID**: `10000000-0000-4000-8000-000000000056`
- **설명(Description)**: 가입 제출 플로우의 최소 검증 시나리오를 문서화해 기능 회귀를 방지한다.
- **구현 가이드(Guide)**: 1) Happy path: 폼 입력->제출->signup_requests 생성->승인대기 메시지 표시 시나리오 정의. 2) Fail path: 필수값 누락/이메일 형식 오류/중복 신청/함수 실패 케이스 정의. 3) 기대 결과(상태 코드, 메시지, DB 상태)를 명시한다.
- **검증 기준(Verification)**: 가입 기능의 happy/fail 최소 시나리오가 문서화되고, 각 시나리오별 기대 결과(UI/DB/에러)가 명확히 정의된다.
- **선행 조건(Dependencies)**: P2-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`, `src/views/auth/Signup.vue`, `src/api/signup.ts`

### P2-2.1 승인 상태 모델링: membership/status 기반 접근 제어 설계

- **Task ID**: `10000000-0000-4000-8000-000000000057`
- **설명(Description)**: 로그인 후 현재 사용자의 승인 상태(approved/pending/rejected)를 식별하고, 앱 접근 정책을 설계한다.
- **구현 가이드(Guide)**: 1) 승인 상태별 허용 라우트 정의. 2) membership 조회 방법(테이블/뷰) 결정. 3) 상태 전이 시 UX(재로그인/새로고침) 정의.
- **검증 기준(Verification)**: 승인 상태별 접근 정책이 명확하고, 스토어/라우터 변경 범위가 결정되어 있다.
- **선행 조건(Dependencies)**: P2-1.5
- **예상 소요 시간**: 120분
- **관련 파일**: `src/stores/auth.ts`, `src/stores/rbac.ts`

### P2-2.2 Route guard 설계: 미승인 사용자 차단 + 전용 라우팅

- **Task ID**: `10000000-0000-4000-8000-000000000058`
- **설명(Description)**: 승인되지 않은 사용자가 서비스 화면에 접근하지 못하도록 라우터 가드 규칙과 전용 페이지 경로를 설계한다.
- **구현 가이드(Guide)**: 1) 승인 전용 라우트(/access/pending 등) 결정. 2) requiresAuth 이후 승인 체크 순서 결정. 3) 예외 라우트(login/signup) 정의.
- **검증 기준(Verification)**: 승인되지 않은 계정은 보호된 라우트에 접근 시 전용 화면으로 리다이렉트된다.
- **선행 조건(Dependencies)**: P2-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/router/index.ts`, `src/router/guards.ts`

### P2-2.3 UI: 승인대기/반려 화면 스펙 및 컴포넌트 정의

- **Task ID**: `10000000-0000-4000-8000-000000000059`
- **설명(Description)**: 승인 대기/반려 상태의 사용자에게 보여줄 화면(메시지, 다음 행동, 문의/재신청)을 정의한다.
- **구현 가이드(Guide)**: 1) pending/rejected 상태별 콘텐츠 결정. 2) 재신청/로그아웃 버튼 등 CTA 정의. 3) 공지/알림 연계 여부 결정(P8 연계).
- **검증 기준(Verification)**: 상태별 화면 요구사항이 정의되어 있고, 구현할 컴포넌트 경로가 결정되어 있다.
- **선행 조건(Dependencies)**: P2-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/auth/AccessState.vue`

### P2-2.4 승인 상태별 라우팅 테스트 시나리오 정의

- **Task ID**: `10000000-0000-4000-8000-000000000060`
- **설명(Description)**: approved/pending/rejected 사용자 각각에 대해 라우팅/메뉴 접근이 올바른지 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 상태별 허용 라우트 목록화. 2) 기대 리다이렉트/메시지 정의. 3) 최소 E2E 1개 시나리오 포함 여부 결정.
- **검증 기준(Verification)**: 승인 상태별 테스트 케이스가 문서화되어 있다.
- **선행 조건(Dependencies)**: P2-2.3
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P2-3.1 승인/반려 워크플로우 정책 확정(권한/감사로그)

- **Task ID**: `10000000-0000-4000-8000-000000000061`
- **설명(Description)**: super/admin의 승인/반려 권한 범위, 결정 사유 기록, 감사 로그(approval_logs) 기록 정책을 확정한다.
- **구현 가이드(Guide)**: 1) 승인 주체(super vs admin)와 범위(전조직 vs 자기조직) 정의. 2) decision_note 필수 여부 결정. 3) 감사로그 최소 필드 정의.
- **검증 기준(Verification)**: 승인/반려 정책이 문서화되어 있고, 데이터 모델에 매핑된다.
- **선행 조건(Dependencies)**: P2-1.5
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P2-3.2 승인 결정 API 계약 정의(approve/reject/withdraw)

- **Task ID**: `10000000-0000-4000-8000-000000000062`
- **설명(Description)**: 승인/반려/철회 결정을 수행하는 서버 API(Edge Function 또는 RPC)의 요청/응답/오류 계약을 정의한다.
- **구현 가이드(Guide)**: 1) 입력(requestId, decision, note) 스키마 정의. 2) 멱등 처리(중복 승인/반려) 정책 정의. 3) 성공 시 memberships/로그 업데이트 규칙 정의.
- **검증 기준(Verification)**: 승인 결정 API 계약이 문서화되어 있고, 멱등/권한 체크가 포함된다.
- **선행 조건(Dependencies)**: P2-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `supabase/functions/approval-decision/index.ts`, `docs/API_SPEC.md`

### P2-3.3 UI: 승인 대기 목록/필터/상세 화면 스펙

- **Task ID**: `10000000-0000-4000-8000-000000000063`
- **설명(Description)**: 관리자(슈퍼/어드민)가 가입 신청을 조회/필터/상세 확인할 수 있는 UI 요구사항을 정의한다.
- **구현 가이드(Guide)**: 1) 목록 컬럼/필터(status, role, org) 정의. 2) 상세 패널/모달 구성 정의. 3) approve/reject CTA 위치/확인 다이얼로그 정의.
- **검증 기준(Verification)**: 승인 관리 UI의 화면 구성/필터/액션이 문서화되어 있다.
- **선행 조건(Dependencies)**: P2-3.2
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/management/AccountManagement.vue`

### P2-3.4 승인 결과 알림 이벤트 생성 정책 정의

- **Task ID**: `10000000-0000-4000-8000-000000000064`
- **설명(Description)**: 승인/반려 시 앱내/이메일 알림을 위한 이벤트(notification_events) 생성 시점과 페이로드를 정의한다(발송은 P8).
- **구현 가이드(Guide)**: 1) 이벤트 타입(signup_approved/signup_rejected) 정의. 2) 제목/메시지 템플릿 초안 작성. 3) 중복 방지/재발송 정책 초안 작성.
- **검증 기준(Verification)**: 승인 알림 이벤트 생성 규칙과 페이로드가 정의되어 있다.
- **선행 조건(Dependencies)**: P2-3.2
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/REFINED_PRD.md`

### P2-3.5 End-to-End 승인 플로우 테스트 시나리오 정의

- **Task ID**: `10000000-0000-4000-8000-000000000065`
- **설명(Description)**: 가입→승인→로그인 허용→권한별 메뉴 노출까지의 E2E 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 계정 생성/승인/로그인 단계를 단계별로 기술. 2) 기대 라우팅/메뉴/데이터 접근 정의. 3) 최소 실패 케이스 1개 포함.
- **검증 기준(Verification)**: 승인 플로우의 E2E 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P2-3.3, P2-3.4
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

---

---

## P3 (예상 시간: 21시간 30분)

### 요약 (Summary)

| Task ID                                | 태스크 명                                                       | 상태    | 선행 태스크(Dependencies) | 예상 시간 |
| -------------------------------------- | --------------------------------------------------------------- | ------- | ------------------------- | --------- |
| `10000000-0000-4000-8000-000000000066` | **P3-1.1 온보딩 상태 머신(3단계) + 저장 범위 확정**             | pending | P1-1.3<br>P1-1.4          | 120m      |
| `10000000-0000-4000-8000-000000000067` | **P3-1.2 온보딩 진행 API 계약 정의(get/update)**                | pending | P3-1.1                    | 180m      |
| `10000000-0000-4000-8000-000000000068` | **P3-1.3 프론트 스토어/캐시 전략 정의(온보딩)**                 | pending | P3-1.2                    | 90m       |
| `10000000-0000-4000-8000-000000000069` | **P3-2.1 온보딩 위저드 UI 플로우/콘텐츠 확정**                  | pending | P3-1.3                    | 120m      |
| `10000000-0000-4000-8000-000000000070` | **P3-2.2 온보딩 페이지 구현 계획(컴포넌트/라우트/스토어)**      | pending | P3-2.1                    | 180m      |
| `10000000-0000-4000-8000-000000000071` | **P3-2.3 메뉴 하이라이트/딥링크 UX 설계(직원관리/엑셀 업로드)** | pending | P3-2.2                    | 120m      |
| `10000000-0000-4000-8000-000000000072` | **P3-2.4 온보딩 E2E 테스트 시나리오 정의**                      | pending | P3-2.3                    | 180m      |
| `10000000-0000-4000-8000-000000000073` | **P3-3.1 온보딩 강제 가드 규칙 정의(예외 포함)**                | pending | P3-2.4                    | 60m       |
| `10000000-0000-4000-8000-000000000074` | **P3-3.2 온보딩 가드 구현 계획(라우터 beforeEach 흐름)**        | pending | P3-3.1                    | 120m      |
| `10000000-0000-4000-8000-000000000075` | **P3-3.3 온보딩 가드 테스트 시나리오 정의(우회 방지)**          | pending | P3-3.2                    | 120m      |

### 상세 (Details)

### P3-1.1 온보딩 상태 머신(3단계) + 저장 범위 확정

- **Task ID**: `10000000-0000-4000-8000-000000000066`
- **설명(Description)**: admin 최초 로그인 온보딩의 단계(조직정보 확인→직원 등록→스케줄 요청)와 저장 범위(조직/사용자)를 확정한다. RBAC 요구사항: /onboarding 라우트는 meta.roles: ['admin']으로 설정하여 user 역할은 접근할 수 없다. 전역 가드에서 onboarding_required 상태를 체크하여 미완료 admin은 온보딩 페이지로 강제 이동시킨다.
- **구현 가이드(Guide)**: 1. 온보딩 진행 API의 GET/POST/PUT 계약 정의(요청/응답/에러)

2. 보안: admin 역할만 호출 가능하도록 RLS 또는 Edge Function에서 검증
3. onboarding_progress 테이블의 organization_id 범위 제한
4. RBAC: 라우트 /onboarding → meta.roles: ['admin'], API는 admin만 접근 가능
5. 진행 상태 저장 시 사용자의 organization_id 검증 로직 포함

- **검증 기준(Verification)**: 온보딩 단계/완료 조건이 확정되어 있고, 저장 모델이 결정되어 있다.
- **선행 조건(Dependencies)**: P1-1.3, P1-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P3-1.2 온보딩 진행 API 계약 정의(get/update)

- **Task ID**: `10000000-0000-4000-8000-000000000067`
- **설명(Description)**: 온보딩 진행 상태를 프론트에서 어떻게 로딩/캐시/동기화할지 전략을 정의한다(리프레시/다중탭 고려).
- **구현 가이드(Guide)**: 1. 프론트 스토어(useOnboarding) 구조 정의(상태/게터/액션)

2. 캐시 전략: localStorage에 진행 상태 저장, 리프레시 시 복구
3. 다중 탭 동기화: storage event listener 또는 polling 고려
4. RBAC: onboarding 상태는 admin만 조회/수정 가능, user는 접근 불가
5. authStore의 역할 정보와 연동하여 온보딩 완료 여부 판별 로직 설계

- **검증 기준(Verification)**: 온보딩 진행 API 계약이 문서화되어 있고, 권한/보안 기준이 포함된다.
- **선행 조건(Dependencies)**: P3-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `supabase/functions/onboarding-progress/index.ts`

### P3-1.3 프론트 스토어/캐시 전략 정의(온보딩)

- **Task ID**: `10000000-0000-4000-8000-000000000068`
- **설명(Description)**: 온보딩 위저드 화면 구성(단계별 설명, CTA, 하이라이트 대상 메뉴)을 확정한다.
- **구현 가이드(Guide)**: 1. 위저드 단계별 화면 구성(Step1: 조직정보, Step2: 직원등록, Step3: 스케줄요청)

2. 단계별 CTA 버튼(다음/건너뛰기/완료) 정의
3. 하이라이트 대상 메뉴(직원 관리, 근무표 생성) 딥링크 제공
4. RBAC: 위저드 진입 전 역할 확인(admin만 허용), user는 403 또는 안내 페이지로 이동
5. 완료 후 역할별 대시보드(/dashboard/admin)로 자동 리다이렉트

- **검증 기준(Verification)**: 온보딩 상태의 로딩/저장/초기화 규칙이 명확히 정의되어 있다.
- **선행 조건(Dependencies)**: P3-1.2
- **예상 소요 시간**: 90분
- **관련 파일**: `src/stores/onboarding.ts`

### P3-2.1 온보딩 위저드 UI 플로우/콘텐츠 확정

- **Task ID**: `10000000-0000-4000-8000-000000000069`
- **설명(Description)**: 온보딩 페이지를 추가하기 위한 구현 계획(라우트, 스토어 연동, 진행 저장)을 수립한다.
- **구현 가이드(Guide)**: 1. 라우트 추가: /onboarding (component: OnboardingWizard.vue)

2. 스토어 연동: useOnboarding, useAuth 스토어와 통합
3. 진행 저장 API 호출 시점(단계 이동 시/완료 시)
4. RBAC: router meta.roles: ['admin'] 설정, 전역 가드에서 검증
5. 온보딩 완료 전 다른 페이지 접근 시 beforeEnter 가드로 차단 후 /onboarding으로 리다이렉트

- **검증 기준(Verification)**: 온보딩 UI가 단계별로 어떤 행동을 유도하는지 문서화되어 있다.
- **선행 조건(Dependencies)**: P3-1.3
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/Onboarding.vue`

### P3-2.2 온보딩 페이지 구현 계획(컴포넌트/라우트/스토어)

- **Task ID**: `10000000-0000-4000-8000-000000000070`
- **설명(Description)**: 온보딩 단계에서 특정 메뉴로 유도하는 하이라이트/딥링크 UX를 설계한다.
- **구현 가이드(Guide)**: 1. 메뉴 하이라이트 구현: 해당 메뉴 아이템에 애니메이션/배경색 추가

2. 딥링크 제공: 위저드에서 버튼 클릭 시 /admin/employees 등으로 이동 후 돌아올 수 있는 처리
3. 사이드바 자동 확장: 온보딩 중인 메뉴가 펼쳐진 상태 유지
4. RBAC: 딥링크 대상 페이지도 meta.roles 확인 필요
5. user 역할이 딥링크로 접근 시도하면 403 처리

- **검증 기준(Verification)**: 온보딩 구현 범위(라우트/스토어/API)가 명확히 정의되어 있다.
- **선행 조건(Dependencies)**: P3-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/router/index.ts`, `src/views/Onboarding.vue`

### P3-2.3 메뉴 하이라이트/딥링크 UX 설계(직원관리/엑셀 업로드)

- **Task ID**: `10000000-0000-4000-8000-000000000071`
- **설명(Description)**: admin 최초 로그인→온보딩 강제→완료→대시보드 이동까지의 E2E 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: E2E 테스트 시나리오:

1. admin 최초 로그인 → /onboarding 강제 진입 확인
2. 온보딩 단계 완료 → DB 상태 업데이트 확인
3. 완료 후 /dashboard/admin 이동 확인
4. 로그아웃 → 재로그인 시 온보딩 스킵 확인
5. user 역할로 로그인 시 /onboarding 접근 불가(403) 확인
6. URL 직접 입력 시 가드 동작 확인
7. 온보딩 미완료 상태에서 다른 페이지 접근 차단 확인

- **검증 기준(Verification)**: 온보딩 단계에서 사용자가 다음 행동을 쉽게 찾을 수 있는 UX가 정의되어 있다.
- **선행 조건(Dependencies)**: P3-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/components/layout/Sidebar.vue`

### P3-2.4 온보딩 E2E 테스트 시나리오 정의

- **Task ID**: `10000000-0000-4000-8000-000000000072`
- **설명(Description)**: 온보딩 미완료 admin을 /onboarding으로 강제하는 규칙과 예외(로그인/가입/승인대기)를 정의한다.
- **구현 가이드(Guide)**: 1. 대상: admin 역할 + onboarding_required 상태인 사용자

2. 강제 규칙: router.beforeEach에서 상태 체크 후 /onboarding으로 리다이렉트
3. 예외 경로: /login, /register, /onboarding 자체는 가드 스킵
4. user 역할: 온보딩 상태와 무관하게 /dashboard/employee로 이동
5. 승인 대기(pending) 상태: 온보딩 가드보다 승인 가드 우선 적용
6. 가드 실행 순서: 인증 → 승인 상태 → 온보딩 상태 → 역별 라우팅

- **검증 기준(Verification)**: 온보딩의 성공/실패/재접속 케이스가 테스트 시나리오로 문서화되어 있다.
- **선행 조건(Dependencies)**: P3-2.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P3-3.1 온보딩 강제 가드 규칙 정의(예외 포함)

- **Task ID**: `10000000-0000-4000-8000-000000000073`
- **설명(Description)**: 현재 인증/Step 가드 구조에 온보딩 가드를 어떻게 삽입할지 구현 계획을 수립한다.
- **구현 가이드(Guide)**: 1. src/router/guards.ts에 onboardingGuard 함수 추가

2. 실행 순서: authGuard → approvalGuard → onboardingGuard → roleBasedRedirect
3. onboardingGuard:
   - authStore에서 onboarding_required 확인
   - meta.roles에 'admin' 포함 여부 체크
   - 조건 충족 시 /onboarding으로 리다이렉트
4. 기존 Step 가드와의 충돌 방지: 온보딩 완료 전 Step 접근 허용 안 함
5. 가드 테스트: 각 역할/상태 조합별 라우팅 동작 검증

- **검증 기준(Verification)**: 온보딩 강제 규칙이 명확히 정의되어 있고, 예외 케이스가 포함된다.
- **선행 조건(Dependencies)**: P3-2.4
- **예상 소요 시간**: 60분
- **관련 파일**: `src/router/guards.ts`

### P3-3.2 온보딩 가드 구현 계획(라우터 beforeEach 흐름)

- **Task ID**: `10000000-0000-4000-8000-000000000074`
- **설명(Description)**: URL 직접 접근, 새로고침, 로그아웃 등에서 온보딩 가드가 우회되지 않는지 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 테스트 시나리오:

1. URL 직접 입력(/schedule/step1 등): 온보딩 미완료 admin은 /onboarding으로 리다이렉트
2. 새로고침: 온보딩 페이지 유지, 진행 상태 복구
3. 로그아웃/재로그인: 온보딩 미완료 시 다시 /onboarding 진입
4. 브라우저 뒤로가기: 온보딩 페이지에서 벗어나지 않도록 처리
5. user 역할: /onboarding 접근 시 403 또는 /dashboard/employee로 리다이렉트
6. 개발자 도구로 meta.roles 조작 시도 방지(서버측 검증 병행)

- **검증 기준(Verification)**: 온보딩 가드가 기존 가드들과 충돌 없이 동작하도록 설계되어 있다.
- **선행 조건(Dependencies)**: P3-3.1
- **예상 소요 시간**: 120분
- **관련 파일**: `src/router/index.ts`

### P3-3.3 온보딩 가드 테스트 시나리오 정의(우회 방지)

- **Task ID**: `10000000-0000-4000-8000-000000000075`
- **설명(Description)**: URL 직접 접근, 새로고침, 로그아웃 등에서 온보딩 가드가 우회되지 않는지 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 우회 시나리오(직접 링크/뒤로가기/탭) 목록화. 2) 기대 결과 정의. 3) 최소 자동화 범위(E2E/유닛) 결정.
- **검증 기준(Verification)**: 온보딩 가드 우회 방지 테스트 케이스가 문서화되어 있다.
- **선행 조건(Dependencies)**: P3-3.2
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

---

---

## P4 (예상 시간: 24시간 30분)

### 요약 (Summary)

| Task ID                                | 태스크 명                                                         | 상태    | 선행 태스크(Dependencies) | 예상 시간 |
| -------------------------------------- | ----------------------------------------------------------------- | ------- | ------------------------- | --------- |
| `10000000-0000-4000-8000-000000000076` | **P4-1.1 계정 관리 리스트/필터 요구사항 확정**                    | pending | P2-3.5                    | 120m      |
| `10000000-0000-4000-8000-000000000077` | **P4-1.2 계정 관리 조회 쿼리/API 설계(테넌트 스코프)**            | pending | P4-1.1                    | 180m      |
| `10000000-0000-4000-8000-000000000078` | **P4-1.3 UI: 계정 관리 리스트 화면 구현 계획**                    | pending | P4-1.2                    | 180m      |
| `10000000-0000-4000-8000-000000000079` | **P4-1.4 계정 관리 기본 테스트 시나리오 정의**                    | pending | P4-1.3                    | 120m      |
| `10000000-0000-4000-8000-000000000080` | **P4-2.1 계정 액션 정책(approve/reject/withdraw) + 확인 UX 확정** | pending | P4-1.4                    | 90m       |
| `10000000-0000-4000-8000-000000000081` | **P4-2.2 승인 결정 API 연동 계획(재사용/에러 처리)**              | pending | P4-2.1                    | 120m      |
| `10000000-0000-4000-8000-000000000082` | **P4-2.3 감사로그/알림 이벤트 연동 확인 항목 정의**               | pending | P4-2.2                    | 90m       |
| `10000000-0000-4000-8000-000000000083` | **P4-2.4 계정 액션 E2E 테스트 시나리오 정의**                     | pending | P4-2.3                    | 180m      |
| `10000000-0000-4000-8000-000000000084` | **P4-3.1 계정 모듈 RBAC 매트릭스(화면/액션/데이터) 작성**         | pending | P4-2.4                    | 90m       |
| `10000000-0000-4000-8000-000000000085` | **P4-3.2 RBAC 테스트 전략 정의(유닛/E2E 분리)**                   | pending | P4-3.1                    | 120m      |
| `10000000-0000-4000-8000-000000000086` | **P4-3.3 RBAC E2E 케이스 최소 세트 정의(super/admin/user)**       | pending | P4-3.2                    | 180m      |

### 상세 (Details)

### P4-1.1 계정 관리 리스트/필터 요구사항 확정

- **Task ID**: `10000000-0000-4000-8000-000000000076`
- **설명(Description)**: super/admin 계정 관리 화면에서 필요한 목록 컬럼과 필터(상태/역할/조직)를 확정한다.
- **구현 가이드(Guide)**: 1) 목록 컬럼(이메일, 조직, 요청역할, 상태, 생성일) 정의. 2) 필터/정렬 요구 정의. 3) 접근 권한(super/admin) 범위 정의.
- **검증 기준(Verification)**: 계정 관리 리스트/필터 요구사항이 화면 기준으로 정의되어 있다.
- **선행 조건(Dependencies)**: P2-3.5
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P4-1.2 계정 관리 조회 쿼리/API 설계(테넌트 스코프)

- **Task ID**: `10000000-0000-4000-8000-000000000077`
- **설명(Description)**: signup_requests/organization_memberships 조회를 위한 쿼리/API 경계를 설계하고, 테넌트 스코프(super vs admin)를 반영한다.
- **구현 가이드(Guide)**: 1) super/admin의 조회 범위 규칙을 쿼리에 반영. 2) 페이지네이션/필터 파라미터 정의. 3) RLS에 의해 누락되는 데이터에 대한 UX 고려.
- **검증 기준(Verification)**: 조회 API 설계가 완료되고, 권한별 스코프가 명확하다.
- **선행 조건(Dependencies)**: P4-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/api/approval.ts`

### P4-1.3 UI: 계정 관리 리스트 화면 구현 계획

- **Task ID**: `10000000-0000-4000-8000-000000000078`
- **설명(Description)**: 계정 관리 리스트 화면(테이블, 필터 UI, 로딩/에러)을 구현하기 위한 상세 계획을 수립한다.
- **구현 가이드(Guide)**: 1) 테이블 컬럼/필터 컴포넌트 설계. 2) API 호출/디바운스/페이지네이션 처리 계획. 3) 상세 보기(모달/패널) 처리 계획.
- **검증 기준(Verification)**: 계정 관리 UI 구현 범위가 명확하고, 컴포넌트 구조가 결정되어 있다.
- **선행 조건(Dependencies)**: P4-1.2
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/management/AccountManagement.vue`

### P4-1.4 계정 관리 기본 테스트 시나리오 정의

- **Task ID**: `10000000-0000-4000-8000-000000000079`
- **설명(Description)**: 계정 관리 리스트의 권한별 접근, 필터 동작, 기본 조회 성공/실패 케이스를 테스트 시나리오로 정의한다.
- **구현 가이드(Guide)**: 1) super/admin/user 접근 가능 여부 정의. 2) 필터 조건별 기대 결과 정의. 3) 최소 자동화(E2E) 범위 정의.
- **검증 기준(Verification)**: 계정 관리 기능의 기본 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P4-1.3
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P4-2.1 계정 액션 정책(approve/reject/withdraw) + 확인 UX 확정

- **Task ID**: `10000000-0000-4000-8000-000000000080`
- **설명(Description)**: 계정 관리 화면에서 제공할 approve/reject/withdraw 액션과 확인 다이얼로그/사유 입력 UX를 확정한다.
- **구현 가이드(Guide)**: 1) 액션별 confirmation 문구/사유 입력 필수 여부 정의. 2) 성공/실패 토스트/알림 UX 정의. 3) 되돌리기(undo) 가능 여부 결정.
- **검증 기준(Verification)**: 계정 액션 UX가 확정되어 있고, 구현 시 필요한 입력/검증이 명확하다.
- **선행 조건(Dependencies)**: P4-1.4
- **예상 소요 시간**: 90분
- **관련 파일**: `src/views/management/AccountManagement.vue`

### P4-2.2 승인 결정 API 연동 계획(재사용/에러 처리)

- **Task ID**: `10000000-0000-4000-8000-000000000081`
- **설명(Description)**: P2-3에서 정의한 승인 결정 API를 계정 관리 화면에서 재사용하는 연동 계획을 수립한다.
- **구현 가이드(Guide)**: 1) 액션별 API 호출/파라미터 매핑 정의. 2) 실패 유형(RLS/중복)별 메시지 정의. 3) optimistic update 여부 결정.
- **검증 기준(Verification)**: 계정 액션과 승인 결정 API의 연결 방식이 명확히 정의되어 있다.
- **선행 조건(Dependencies)**: P4-2.1
- **예상 소요 시간**: 120분
- **관련 파일**: `src/api/approval.ts`

### P4-2.3 감사로그/알림 이벤트 연동 확인 항목 정의

- **Task ID**: `10000000-0000-4000-8000-000000000082`
- **설명(Description)**: 승인/반려 시 approval_logs 기록과 notification_events 생성이 누락되지 않도록 검증 항목을 정의한다.
- **구현 가이드(Guide)**: 1) 승인 후 기대 DB 변경(membership/status) 정의. 2) approval_logs 생성 확인 항목 추가. 3) 알림 이벤트 생성 확인 항목 추가.
- **검증 기준(Verification)**: 승인 액션의 부수효과(로그/알림) 검증 체크리스트가 존재한다.
- **선행 조건(Dependencies)**: P4-2.2
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P4-2.4 계정 액션 E2E 테스트 시나리오 정의

- **Task ID**: `10000000-0000-4000-8000-000000000083`
- **설명(Description)**: 승인/반려/철회 액션이 UI에서 정상 동작하는지 E2E 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 승인 성공 케이스 정의. 2) 반려 케이스(사유 포함) 정의. 3) 권한 없음/중복 처리 실패 케이스 정의.
- **검증 기준(Verification)**: 계정 액션 E2E 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P4-2.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P4-3.1 계정 모듈 RBAC 매트릭스(화면/액션/데이터) 작성

- **Task ID**: `10000000-0000-4000-8000-000000000084`
- **설명(Description)**: Account module의 RBAC 매트릭스를 작성하여, 역할별로 어떤 화면/액션/데이터가 허용되는지 명확히 한다.
- **구현 가이드(Guide)**: 1) super/admin/user 권한 표 작성. 2) 테넌트 범위(전체 vs 자기조직) 표기. 3) 예외/특이 케이스를 notes로 기록.
- **검증 기준(Verification)**: 계정 모듈 RBAC 매트릭스가 문서화되어 있다.
- **선행 조건(Dependencies)**: P4-2.4
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P4-3.2 RBAC 테스트 전략 정의(유닛/E2E 분리)

- **Task ID**: `10000000-0000-4000-8000-000000000085`
- **설명(Description)**: RBAC 매트릭스를 검증하기 위한 유닛 테스트/라우터 가드 테스트/E2E 테스트 범위를 정의한다.
- **구현 가이드(Guide)**: 1) store/guard 로직은 유닛 테스트로 검증. 2) 주요 플로우는 E2E 1~2개로 검증. 3) 데이터 격리는 RLS 검증 케이스로 연결.
- **검증 기준(Verification)**: RBAC 테스트가 어떤 레벨에서 어떻게 검증되는지 합의되어 있다.
- **선행 조건(Dependencies)**: P4-3.1
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P4-3.3 RBAC E2E 케이스 최소 세트 정의(super/admin/user)

- **Task ID**: `10000000-0000-4000-8000-000000000086`
- **설명(Description)**: 역할별 접근 차단/허용을 검증하는 최소 E2E 케이스 세트를 정의한다.
- **구현 가이드(Guide)**: 1) super: 전체 조직 조회 가능 케이스. 2) admin: 자기조직만 조회 케이스. 3) user: 계정관리 접근 차단 케이스.
- **검증 기준(Verification)**: RBAC 최소 E2E 케이스가 정의되어 있다.
- **선행 조건(Dependencies)**: P4-3.2
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

---

---

## P5 (예상 시간: 42시간 30분)

### 요약 (Summary)

| Task ID                                | 태스크 명                                                          | 상태    | 선행 태스크(Dependencies) | 예상 시간 |
| -------------------------------------- | ------------------------------------------------------------------ | ------- | ------------------------- | --------- |
| `10000000-0000-4000-8000-000000000087` | **P5-1.1 조직 관리 범위/권한/필드 스펙 확정**                      | pending | P1-1.3<br>P1-1.4          | 120m      |
| `10000000-0000-4000-8000-000000000088` | **P5-1.2 조직 관리 화면 IA/라우트 설계**                           | pending | P5-1.1                    | 180m      |
| `10000000-0000-4000-8000-000000000089` | **P5-1.3 조직/설정 데이터 저장 API 경계 설계**                     | pending | P5-1.2                    | 180m      |
| `10000000-0000-4000-8000-000000000090` | **P5-1.4 조직 관리 테스트 시나리오 정의(테넌트 격리 포함)**        | pending | P5-1.3                    | 180m      |
| `10000000-0000-4000-8000-000000000091` | **P5-2.1 시프트/제약/스킬/직급 마스터 UX 설계**                    | pending | P5-1.4                    | 120m      |
| `10000000-0000-4000-8000-000000000092` | **P5-2.2 시프트 관리 요구사항 확정(시간/코드/표시)**               | pending | P5-2.1                    | 180m      |
| `10000000-0000-4000-8000-000000000093` | **P5-2.3 근무 제약 설정 요구사항 확정(연속N/주40/주52/휴무/휴식)** | pending | P5-2.2                    | 180m      |
| `10000000-0000-4000-8000-000000000094` | **P5-2.4 스킬/직급 마스터 요구사항 확정(코드/이름/크레딧)**        | pending | P5-2.3                    | 180m      |
| `10000000-0000-4000-8000-000000000095` | **P5-2.5 마스터 데이터 CRUD 테스트 시나리오 정의**                 | pending | P5-2.4                    | 180m      |
| `10000000-0000-4000-8000-000000000096` | **P5-3.1 사이트/요일별 요구인원 도메인 스펙 확정**                 | pending | P5-2.5                    | 120m      |
| `10000000-0000-4000-8000-000000000097` | **P5-3.2 사이트 CRUD 화면/UX 설계**                                | pending | P5-3.1                    | 180m      |
| `10000000-0000-4000-8000-000000000098` | **P5-3.3 요일별 요구인원 편집 UI(테이블/그리드) 설계**             | pending | P5-3.2                    | 180m      |
| `10000000-0000-4000-8000-000000000099` | **P5-3.4 DB 저장 모델/인덱스(요구인원) 확정 + 마이그레이션 계획**  | pending | P5-3.3                    | 180m      |
| `10000000-0000-4000-8000-000000000100` | **P5-3.5 월별 적용(7.2) 테스트 시나리오 정의(요일→월)**            | pending | P5-3.4                    | 180m      |

### 상세 (Details)

### P5-1.1 조직 관리 범위/권한/필드 스펙 확정

- **Task ID**: `10000000-0000-4000-8000-000000000087`
- **설명(Description)**: 조직 정보 CRUD(슈퍼: 전체, 어드민: 자기조직) 범위와 필드(유형/근무패턴/제약)를 확정한다. RBAC 요구사항: /admin/organizations 라우트는 meta.roles: ['super', 'admin']으로 설정하여 user 역할은 접근할 수 없다. super는 모든 조직을 조회/수정 가능하고, admin은 자신의 조직만 접근 가능하도록 데이터 필터링을 구현해야 한다.
- **구현 가이드(Guide)**: 1. 메뉴 구조: 사이드바 LNB에 '조직 관리' 항목 추가

2. 라우트 설계: /admin/organizations (meta.roles: ['super', 'admin'])
3. 화면 구성: 조직 목록/상세/편집 탭
4. RBAC: 역할별 접근 제어 - super는 전체 조직 조회, admin은 본인 조직만 조회
5. user 역할: 메뉴 노출 안 함, 접근 시 403 처리
6. 데이터 필터링: API 요청 시 organization_id 기반 자동 필터링 적용

- **검증 기준(Verification)**: 조직 관리 스펙(필드/권한/UX)이 확정되어 있다.
- **선행 조건(Dependencies)**: P1-1.3, P1-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P5-1.2 조직 관리 화면 IA/라우트 설계

- **Task ID**: `10000000-0000-4000-8000-000000000088`
- **설명(Description)**: organizations 및 organization_settings 저장/조회 방식을 설계한다(직접 테이블 접근 vs RPC/함수).
- **구현 가이드(Guide)**: 1. API 경계 선택: Supabase RLS + RPC 함수 조합

2. organizations 테이블: RLS로 super/admin 접근 제어
3. organization_settings: RPC 함수로 CRUD 처리, organization_id 검증
4. RBAC:
   - super: 모든 조직 데이터 접근 가능
   - admin: 자신의 organization_id와 일치하는 데이터만 접근
   - user: API 호출 시 403 반환
5. CRUD 요청 시 사용자의 역할과 organization_id 검증 로직 포함

- **검증 기준(Verification)**: 조직 관리 화면 구조/라우트/메뉴가 결정되어 있다.
- **선행 조건(Dependencies)**: P5-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/management/OrganizationManagement.vue`, `src/components/layout/Sidebar.vue`

### P5-1.3 조직/설정 데이터 저장 API 경계 설계

- **Task ID**: `10000000-0000-4000-8000-000000000089`
- **설명(Description)**: 조직 관리의 권한/테넌트 격리/필드 검증 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 테스트 시나리오:

1. super 역할: 전체 조직 목록 조회/수정 확인
2. admin 역할: 본인 조직만 조회, 타 조직 접근 시 403 확인
3. user 역할: /admin/organizations 접근 시 403 또는 메뉴 미노출 확인
4. 테넌트 격리: admin이 타 조직 데이터를 URL 조작으로 접근 시도 차단 확인
5. 필드 검증: 유형/근무패턴/제약 필드 CRUD 정상 동작 확인
6. API 무결성: organization_id 위조/변조 시도 시 서버측 검증으로 거부 확인

- **검증 기준(Verification)**: 조직 관리 저장 경계가 결정되어 있고, API 인터페이스가 정의되어 있다.
- **선행 조건(Dependencies)**: P5-1.2
- **예상 소요 시간**: 180분
- **관련 파일**: `src/api/organization.ts`

### P5-1.4 조직 관리 테스트 시나리오 정의(테넌트 격리 포함)

- **Task ID**: `10000000-0000-4000-8000-000000000090`
- **설명(Description)**: 조직 관리의 권한/테넌트 격리/필드 검증 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) super: 조직 전환 조회 케이스. 2) admin: 자기조직만 수정 케이스. 3) user: 접근 차단 케이스.
- **검증 기준(Verification)**: 조직 관리 기능 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P5-1.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P5-2.1 시프트/제약/스킬/직급 마스터 UX 설계

- **Task ID**: `10000000-0000-4000-8000-000000000091`
- **설명(Description)**: 조직 단위 마스터 데이터(시프트, 제약, 스킬, 직급/크레딧) 관리 UX를 설계한다.
- **구현 가이드(Guide)**: 1) 탭/섹션 구분(shift/constraint/skill/rank) 결정. 2) 활성/비활성 정책 결정. 3) 기본값(3교대, LV1~4) 제공 방식 결정.
- **검증 기준(Verification)**: 마스터 데이터 관리 UX가 결정되어 있다.
- **선행 조건(Dependencies)**: P5-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/management/OrganizationManagement.vue`

### P5-2.2 시프트 관리 요구사항 확정(시간/코드/표시)

- **Task ID**: `10000000-0000-4000-8000-000000000092`
- **설명(Description)**: 시프트를 자유롭게 등록(예: 3교대)하는 요구사항과 검증 규칙(중복 코드, 시간 범위)을 확정한다.
- **구현 가이드(Guide)**: 1) shift_code/시작-종료/색상 등 필드 정의. 2) 중복/겹침 검증 규칙 정의. 3) 기존 D/E/N/O 고정 로직 제거 범위 정의.
- **검증 기준(Verification)**: 시프트 마스터의 필드/검증 규칙이 확정되어 있다.
- **선행 조건(Dependencies)**: P5-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/components/schedule/ShiftManager.vue`

### P5-2.3 근무 제약 설정 요구사항 확정(연속N/주40/주52/휴무/휴식)

- **Task ID**: `10000000-0000-4000-8000-000000000093`
- **설명(Description)**: 근무 제약(최대 연속 N, 주 목표/최대, 휴무일, 시프트 변경 최소 휴식)을 저장/표시하는 요구사항을 확정한다.
- **구현 가이드(Guide)**: 1) 제약 필드 목록과 단위(분/시간) 결정. 2) shift_change_rest_rules JSON 스키마 결정. 3) UI 입력 폼/검증 규칙 정의.
- **검증 기준(Verification)**: 근무 제약 설정의 저장 모델과 UI 요구가 확정되어 있다.
- **선행 조건(Dependencies)**: P5-2.2
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/REFINED_PRD.md`

### P5-2.4 스킬/직급 마스터 요구사항 확정(코드/이름/크레딧)

- **Task ID**: `10000000-0000-4000-8000-000000000094`
- **설명(Description)**: 조직 스킬/직급 마스터(코드/이름/크레딧) 저장 규칙과 UI 요구사항을 확정한다.
- **구현 가이드(Guide)**: 1) code 유니크 정책 정의. 2) rank credit 기본값 정책 정의. 3) 비활성 처리 및 참조 무결성 정책 정의.
- **검증 기준(Verification)**: 스킬/직급 마스터의 저장 규칙과 UI 요구사항이 확정되어 있다.
- **선행 조건(Dependencies)**: P5-2.3
- **예상 소요 시간**: 180분
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`

### P5-2.5 마스터 데이터 CRUD 테스트 시나리오 정의

- **Task ID**: `10000000-0000-4000-8000-000000000095`
- **설명(Description)**: 시프트/제약/스킬/직급 CRUD의 기본 동작과 스케줄 화면 반영에 대한 스모크 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) CRUD happy-path 정의. 2) 중복 code/참조중 삭제 실패 케이스 정의. 3) 스케줄 step에서 반영 확인 항목 정의.
- **검증 기준(Verification)**: 마스터 데이터 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P5-2.4
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P5-3.1 사이트/요일별 요구인원 도메인 스펙 확정

- **Task ID**: `10000000-0000-4000-8000-000000000096`
- **설명(Description)**: 사이트 목록, 요일별 필요 인력, skill/rank 옵션 필터를 포함한 요구인원 도메인 스펙을 확정한다.
- **구현 가이드(Guide)**: 1) site_code/site_name 필드 확정. 2) 요일(0~6) 기준과 shift 연결 규칙 확정. 3) skill/rank 선택적 요구의 저장 모델 확정.
- **검증 기준(Verification)**: 사이트/요구인원 스펙이 확정되어 있고, DB/UI 구현 범위가 결정되어 있다.
- **선행 조건(Dependencies)**: P5-2.5
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P5-3.2 사이트 CRUD 화면/UX 설계

- **Task ID**: `10000000-0000-4000-8000-000000000097`
- **설명(Description)**: 사이트 등록/수정/비활성/삭제 UI 흐름과 검증 규칙을 설계한다.
- **구현 가이드(Guide)**: 1) CRUD 액션과 모달/폼 구조 정의. 2) site_code 유니크/검증 규칙 정의. 3) 삭제 대신 비활성 정책 결정.
- **검증 기준(Verification)**: 사이트 CRUD UX와 검증 규칙이 정의되어 있다.
- **선행 조건(Dependencies)**: P5-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/management/SiteManagement.vue`

### P5-3.3 요일별 요구인원 편집 UI(테이블/그리드) 설계

- **Task ID**: `10000000-0000-4000-8000-000000000098`
- **설명(Description)**: 사이트별로 요일별 요구인원을 편집하는 UI(테이블/그리드) 요구사항을 설계한다.
- **구현 가이드(Guide)**: 1) 표시 단위(사이트/시프트/요일) 결정. 2) skill/rank 옵션 필터 UX 결정. 3) 저장 단위(일괄 저장/자동 저장) 결정.
- **검증 기준(Verification)**: 요구인원 편집 UI가 사용자가 이해할 수 있는 형태로 설계되어 있다.
- **선행 조건(Dependencies)**: P5-3.2
- **예상 소요 시간**: 180분
- **관련 파일**: `src/components/requirements/SiteStaffRequirementsEditor.vue`

### P5-3.4 DB 저장 모델/인덱스(요구인원) 확정 + 마이그레이션 계획

- **Task ID**: `10000000-0000-4000-8000-000000000099`
- **설명(Description)**: site_staff_requirements 저장 모델(유니크 키, 인덱스)을 확정하고 마이그레이션 반영 계획을 수립한다.
- **구현 가이드(Guide)**: 1) unique key 정의(site+shift+dow+skill?+rank?). 2) 쿼리 패턴 기반 인덱스 정의. 3) 기존 site_requirements와의 관계(대체/호환) 정의.
- **검증 기준(Verification)**: 요구인원 저장 모델과 인덱스가 확정되어 있다.
- **선행 조건(Dependencies)**: P5-3.3
- **예상 소요 시간**: 180분
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`

### P5-3.5 월별 적용(7.2) 테스트 시나리오 정의(요일→월)

- **Task ID**: `10000000-0000-4000-8000-000000000100`
- **설명(Description)**: 요일별 요구인원을 계획 월에 적용하여 월별 요구인원 테이블을 생성/수정하는(7.2) 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 계획 월/요일 계산 규칙 정의. 2) 편집/저장 플로우 정의. 3) 엣지케이스(윤년/월 시작 요일) 포함.
- **검증 기준(Verification)**: 요일 요구인원→월 적용 기능의 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P5-3.4
- **예상 소요 시간**: 180분
- **관련 파일**: `src/composables/useSiteRequirements.ts`

---

---

## P6 (예상 시간: 26시간 0분)

### 요약 (Summary)

| Task ID                                | 태스크 명                                                             | 상태    | 선행 태스크(Dependencies)  | 예상 시간 |
| -------------------------------------- | --------------------------------------------------------------------- | ------- | -------------------------- | --------- |
| `10000000-0000-4000-8000-000000000101` | **P6-1.1 직원 관리 권한/스코프 정의**                                 | pending | P2-3.1<br>P2-3.5<br>P5-3.5 | 90m       |
| `10000000-0000-4000-8000-000000000102` | **P6-1.2 직원 목록/상세 화면 요구사항 확정(필터 포함)**               | pending | P6-1.1                     | 120m      |
| `10000000-0000-4000-8000-000000000103` | **P6-1.3 직원 관리 구현 구조 설계(API/컴포넌트/상태)**                | pending | P6-1.2                     | 90m       |
| `10000000-0000-4000-8000-000000000104` | **P6-2.1 직원 스키마 확장 설계(site/rank/skill/credit/user_id)**      | pending | P6-1.3                     | 120m      |
| `10000000-0000-4000-8000-000000000105` | **P6-2.2 직원 CRUD UX 확정(매핑 선택 포함)**                          | pending | P6-2.1                     | 180m      |
| `10000000-0000-4000-8000-000000000106` | **P6-2.3 직원 데이터 검증 규칙 정의(근무 가능 시프트/사이트 일관성)** | pending | P6-2.2                     | 120m      |
| `10000000-0000-4000-8000-000000000107` | **P6-2.4 직원 CRUD 테스트 시나리오 정의(RLS 포함)**                   | pending | P6-2.3                     | 180m      |
| `10000000-0000-4000-8000-000000000108` | **P6-3.1 직원 엑셀 템플릿(필드 매핑) 확정**                           | pending | P6-2.4                     | 120m      |
| `10000000-0000-4000-8000-000000000109` | **P6-3.2 엑셀 파서/검증/미리보기 UX 설계**                            | pending | P6-3.1                     | 180m      |
| `10000000-0000-4000-8000-000000000110` | **P6-3.3 커밋(배치 upsert) 및 실패 리포트 정책 정의**                 | pending | P6-3.2                     | 180m      |
| `10000000-0000-4000-8000-000000000111` | **P6-3.4 엑셀 업로드 테스트 시나리오 정의(오류/중복/권한)**           | pending | P6-3.3                     | 180m      |

### 상세 (Details)

### P6-1.1 직원 관리 권한/스코프 정의

- **Task ID**: `10000000-0000-4000-8000-000000000101`
- **설명(Description)**: 직원 관리(조회/수정/삭제/업로드)의 권한 범위(super/admin/user)를 확정한다.
- **구현 가이드(Guide)**: 1) admin: CRUD/업로드 허용. 2) super: 교차 조직 조회/수정 허용 여부 결정. 3) user: 본인 정보만 허용 범위 정의.
- **검증 기준(Verification)**: 직원 관리 권한이 명확히 정의되어 있다.
- **선행 조건(Dependencies)**: P2-3.1, P2-3.5, P5-3.5
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/REFINED_PRD.md`

### P6-1.2 직원 목록/상세 화면 요구사항 확정(필터 포함)

- **Task ID**: `10000000-0000-4000-8000-000000000102`
- **설명(Description)**: 직원 목록(사이트/직급/스킬 필터)과 상세 편집 화면의 컬럼/필드/검증을 확정한다.
- **구현 가이드(Guide)**: 1) 컬럼(이름/ID/직급/스킬/사이트/근무가능 시프트) 확정. 2) 필터/검색 요구 확정. 3) 검증(필수/유니크) 정의.
- **검증 기준(Verification)**: 직원 관리 화면의 요구사항(필드/필터/검증)이 확정되어 있다.
- **선행 조건(Dependencies)**: P6-1.1
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/management/EmployeeManagement.vue`

### P6-1.3 직원 관리 구현 구조 설계(API/컴포넌트/상태)

- **Task ID**: `10000000-0000-4000-8000-000000000103`
- **설명(Description)**: 직원 관리 구현을 위한 API 래퍼, 컴포넌트 구조, 상태 관리(스토어) 범위를 설계한다.
- **구현 가이드(Guide)**: 1) 조회/저장 API 시그니처 정의. 2) 목록/상세 컴포넌트 분리 결정. 3) 대량 업로드와 CRUD의 연결 방식 결정.
- **검증 기준(Verification)**: 직원 관리 구현 구조가 결정되어 있고, 파일/컴포넌트 경로가 정의되어 있다.
- **선행 조건(Dependencies)**: P6-1.2
- **예상 소요 시간**: 90분
- **관련 파일**: `src/api/employee.ts`

### P6-2.1 직원 스키마 확장 설계(site/rank/skill/credit/user_id)

- **Task ID**: `10000000-0000-4000-8000-000000000104`
- **설명(Description)**: 직원 엔티티에 사이트/직급/스킬/크레딧/auth user 연결을 추가하는 스키마 확장을 설계한다.
- **구현 가이드(Guide)**: 1) site_id/skill_id/rank_id/credit/user_id 컬럼 정의. 2) nullable 정책/삭제 정책 정의. 3) 기존 그리드/엑셀 로직 영향 분석.
- **검증 기준(Verification)**: 직원 확장 스키마가 확정되어 있고, 프론트 타입/영향 범위가 정리되어 있다.
- **선행 조건(Dependencies)**: P6-1.3
- **예상 소요 시간**: 120분
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`, `src/types/employee.ts`

### P6-2.2 직원 CRUD UX 확정(매핑 선택 포함)

- **Task ID**: `10000000-0000-4000-8000-000000000105`
- **설명(Description)**: 직원 생성/수정/삭제 UX(사이트/직급/스킬 선택)와 검증 규칙을 확정한다.
- **구현 가이드(Guide)**: 1) 폼 필드/초기값(직급 크레딧) 정의. 2) 매핑 선택 컴포넌트(셀렉트) 설계. 3) 삭제 정책(soft delete vs inactive) 결정.
- **검증 기준(Verification)**: 직원 CRUD UX와 매핑 선택 방식이 확정되어 있다.
- **선행 조건(Dependencies)**: P6-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/management/EmployeeManagement.vue`

### P6-2.3 직원 데이터 검증 규칙 정의(근무 가능 시프트/사이트 일관성)

- **Task ID**: `10000000-0000-4000-8000-000000000106`
- **설명(Description)**: 직원 데이터의 일관성 검증(근무 가능 시프트, 사이트 배정, 직급/크레딧)을 정의한다.
- **구현 가이드(Guide)**: 1) 필수 필드/유니크(ID) 규칙 정의. 2) shift/rank/site 참조 무결성 규칙 정의. 3) UI 에러 메시지 표준 정의.
- **검증 기준(Verification)**: 직원 데이터 검증 규칙과 에러 메시지 정책이 정의되어 있다.
- **선행 조건(Dependencies)**: P6-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/utils/validation.ts`

### P6-2.4 직원 CRUD 테스트 시나리오 정의(RLS 포함)

- **Task ID**: `10000000-0000-4000-8000-000000000107`
- **설명(Description)**: 직원 CRUD의 정상/실패 케이스와 테넌트 격리(RLS) 검증을 포함한 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) CRUD happy-path 정의. 2) 권한 없음/타조직 접근 실패 케이스 정의. 3) 검증 실패(필수/중복) 케이스 정의.
- **검증 기준(Verification)**: 직원 CRUD 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P6-2.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P6-3.1 직원 엑셀 템플릿(필드 매핑) 확정

- **Task ID**: `10000000-0000-4000-8000-000000000108`
- **설명(Description)**: 직원 엑셀 업로드 템플릿(컬럼, 필수/선택, 값 제약)을 확정하고 샘플 파일 기준을 정의한다.
- **구현 가이드(Guide)**: 1) 컬럼(이름/ID/직급/스킬/사이트/시프트) 확정. 2) 코드 매핑(직급코드/스킬코드) 규칙 정의. 3) 템플릿 다운로드 UX 결정.
- **검증 기준(Verification)**: 엑셀 템플릿이 어떤 필드를 담는지 확정되어 있고, 매핑 규칙이 명확하다.
- **선행 조건(Dependencies)**: P6-2.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/임직원_등록_73.xlsx`, `src/utils/excelTemplate.ts`

### P6-3.2 엑셀 파서/검증/미리보기 UX 설계

- **Task ID**: `10000000-0000-4000-8000-000000000109`
- **설명(Description)**: 업로드된 엑셀을 파싱하고 오류를 표시하며, 커밋 전 미리보기를 제공하는 UX/구현 계획을 수립한다.
- **구현 가이드(Guide)**: 1) 파싱 단계(헤더 검증/행 검증) 정의. 2) 오류 표시(행/컬럼) UX 정의. 3) 미리보기 테이블/수정 허용 여부 결정.
- **검증 기준(Verification)**: 엑셀 업로드의 파싱/검증/미리보기 플로우가 정의되어 있다.
- **선행 조건(Dependencies)**: P6-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/components/schedule/EmployeeExcelUpload.vue`

### P6-3.3 커밋(배치 upsert) 및 실패 리포트 정책 정의

- **Task ID**: `10000000-0000-4000-8000-000000000110`
- **설명(Description)**: 엑셀 업로드 결과를 DB에 배치 upsert로 반영하고, 실패 행 리포트를 제공하는 정책을 정의한다.
- **구현 가이드(Guide)**: 1) upsert 기준키(id or employee_code) 정의. 2) 부분 실패 시 처리(전체 롤백 vs 부분 반영) 결정. 3) 실패 리포트 형식(CSV/JSON) 결정.
- **검증 기준(Verification)**: 배치 커밋 정책과 실패 리포트 정책이 확정되어 있다.
- **선행 조건(Dependencies)**: P6-3.2
- **예상 소요 시간**: 180분
- **관련 파일**: `src/api/employee.ts`

### P6-3.4 엑셀 업로드 테스트 시나리오 정의(오류/중복/권한)

- **Task ID**: `10000000-0000-4000-8000-000000000111`
- **설명(Description)**: 엑셀 업로드의 오류(형식/값), 중복, 권한(RLS) 실패를 포함한 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 잘못된 헤더/값 케이스 정의. 2) 중복 ID 케이스 정의. 3) 권한 없음/타조직 업로드 차단 케이스 정의.
- **검증 기준(Verification)**: 엑셀 업로드 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P6-3.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

---

---

## P7 (예상 시간: 26시간 30분)

### 요약 (Summary)

| Task ID                                | 태스크 명                                                          | 상태    | 선행 태스크(Dependencies) | 예상 시간 |
| -------------------------------------- | ------------------------------------------------------------------ | ------- | ------------------------- | --------- |
| `10000000-0000-4000-8000-000000000112` | **P7-1.1 Step1 조직 마스터 데이터 연결 계획(시프트/제약)**         | pending | P5-3.5                    | 120m      |
| `10000000-0000-4000-8000-000000000113` | **P7-1.2 Step2 요일 요구→월 요구 계산/편집/저장 플로우 설계**      | pending | P7-1.1                    | 180m      |
| `10000000-0000-4000-8000-000000000114` | **P7-1.3 구 스키마(site_requirements)와 신 스키마 호환 전략 정의** | pending | P7-1.2                    | 120m      |
| `10000000-0000-4000-8000-000000000115` | **P7-1.4 스케줄 플로우 회귀 방지 체크리스트(그리드/엑셀/solver)**  | pending | P7-1.3                    | 180m      |
| `10000000-0000-4000-8000-000000000116` | **P7-2.1 Solver 계약(API) 문서화 + 버전 정책 확정**                | pending | P7-1.4                    | 120m      |
| `10000000-0000-4000-8000-000000000117` | **P7-2.2 Mapper/Validator 고정 전략 정의 + 테스트 케이스 목록화**  | pending | P7-2.1                    | 180m      |
| `10000000-0000-4000-8000-000000000118` | **P7-2.3 에러/타임아웃/재시도 UX 정책 정의**                       | pending | P7-2.2                    | 120m      |
| `10000000-0000-4000-8000-000000000119` | **P7-3.1 스케줄 워크플로우 회귀 E2E 시나리오 정의(Step1→5)**       | pending | P7-2.3                    | 120m      |
| `10000000-0000-4000-8000-000000000120` | **P7-3.2 Playwright 회귀 테스트 구현 범위/전략 결정**              | pending | P7-3.1                    | 180m      |
| `10000000-0000-4000-8000-000000000121` | **P7-3.3 유닛 테스트 보강 대상 선정(스토어/유틸/매퍼)**            | pending | P7-3.1                    | 180m      |
| `10000000-0000-4000-8000-000000000122` | **P7-3.4 회귀 테스트를 품질 게이트에 포함하는 기준 확정**          | pending | P7-3.2                    | 90m       |

### 상세 (Details)

### P7-1.1 Step1 조직 마스터 데이터 연결 계획(시프트/제약)

- **Task ID**: `10000000-0000-4000-8000-000000000112`
- **설명(Description)**: Step2에서 사이트별 요일 요구인원을 계획 월에 적용해 월별 요구인원으로 계산/편집/저장하는 플로우를 설계한다.
- **구현 가이드(Guide)**: 1. 요일 요구→월 요구 계산 로직: site_staffing_templates 기반으로 날짜별 요구인원 생성

2. 편집 UI: 그리드/테이블 형태로 사이트/날짜/시프트별 요구인원 편집
3. 저장 API: POST /schedules/{id}/staffing-requirements (admin만 호출 가능)
4. RBAC:
   - /schedule/step2 라우트 → meta.roles: ['super', 'admin']
   - user 역할 접근 시 403
   - admin은 자신의 organization_id 기반 데이터만 저장
5. 데이터 검증: 요구인원 변경 시 solver 입력 데이터 무결성 확인

- **검증 기준(Verification)**: Step1이 조직 마스터 데이터를 기반으로 동작하도록 변경 범위가 정리되어 있다.
- **선행 조건(Dependencies)**: P5-3.5
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/schedule/Step1BasicInfo.vue`

### P7-1.2 Step2 요일 요구→월 요구 계산/편집/저장 플로우 설계

- **Task ID**: `10000000-0000-4000-8000-000000000113`
- **설명(Description)**: 기존 site_requirements와 신규 site_staff_requirements 간의 호환/마이그레이션 전략(대체 시점, 데이터 변환)을 정의한다.
- **구현 가이드(Guide)**: 1. 구 스키마: site_requirements (day_of_week 기반) - MVP에서 사용

2. 신 스키마: site_staffing_requirements (날짜 기반) - 서비스 전환 후 사용
3. 호환 전략:
   - 마이그레이션 기간: 두 스키마 모두 유지
   - 데이터 변환: site_requirements → site_staffing_requirements 변환 함수
   - API 호환: Step2는 신 스키마 사용, legacy는 구 스키마 참조
4. RBAC: 두 스키마 모두 organization_id 기반 RLS 적용
5. 전환 시점: P7 완료 후 구 스키마 deprecate 계획 수립

- **검증 기준(Verification)**: Step2의 월별 요구인원 계산/편집/저장 플로우가 정의되어 있다.
- **선행 조건(Dependencies)**: P7-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/schedule/Step2SiteInfo.vue`

### P7-1.3 구 스키마(site_requirements)와 신 스키마 호환 전략 정의

- **Task ID**: `10000000-0000-4000-8000-000000000114`
- **설명(Description)**: Step1/2 변경이 Step3~5(직원/초기데이터/solver/결과)에 영향을 주지 않도록 회귀 방지 체크리스트를 만든다.
- **구현 가이드(Guide)**: 회귀 방지 체크리스트:

1. 그리드 렌더링: Step1/2 변경 후 Step3 그리드 정상 표시 확인
2. 엑셀 import/export: 기존 엑셀 템플릿 호환성 확인
3. solver 연동: solver 입력 포맷 변경 시 API 계약 호환성 확인
4. RBAC 검증: Step1~Step4 접근 제어(user 차단) 동작 확인
5. 데이터 무결성: Step1/2 변경 후 기존 스케줄 데이터 영향 없음 확인
6. E2E 플로우: Step1→Step2→Step3→Step4 전체 플로우 정상 동작 확인
7. 사용자 시나리오: admin이 스케줄 생성/수정/삭제하는 전체 과정 검증

- **검증 기준(Verification)**: 호환 전략이 문서화되어 있고, 단계적 전환 경로가 명확하다.
- **선행 조건(Dependencies)**: P7-1.2
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/prd/02-database-migration.md`

### P7-1.4 스케줄 플로우 회귀 방지 체크리스트(그리드/엑셀/solver)

- **Task ID**: `10000000-0000-4000-8000-000000000115`
- **설명(Description)**: Step1/2 변경이 Step3~5(직원/초기데이터/solver/결과)에 영향을 주지 않도록 회귀 방지 체크리스트를 만든다.
- **구현 가이드(Guide)**: 1) Step1~5 핵심 기능 체크 항목 작성. 2) 엑셀 업로드/다운로드 체크 포함. 3) solver 요청/응답 연계 체크 포함.
- **검증 기준(Verification)**: 회귀 방지 체크리스트가 문서화되어 있다.
- **선행 조건(Dependencies)**: P7-1.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P7-2.1 Solver 계약(API) 문서화 + 버전 정책 확정

- **Task ID**: `10000000-0000-4000-8000-000000000116`
- **설명(Description)**: solver 요청/응답/상태 폴링의 계약을 문서화하고, 변경이 필요한 경우 버전 정책을 확정한다.
- **구현 가이드(Guide)**: 1) 현재 요청/응답 JSON 스키마 추출. 2) 호환 유지 원칙 정의. 3) 브레이킹 변경 시 버전 필드/엔드포인트 정책 정의.
- **검증 기준(Verification)**: solver 계약이 문서화되어 있고, 변경 정책이 확정되어 있다.
- **선행 조건(Dependencies)**: P7-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/API_SPEC.md`, `src/api/solver.ts`

### P7-2.2 Mapper/Validator 고정 전략 정의 + 테스트 케이스 목록화

- **Task ID**: `10000000-0000-4000-8000-000000000117`
- **설명(Description)**: solverMapper/planningPayloadValidator의 호환성을 유지하기 위한 고정 전략과 테스트 케이스를 정의한다.
- **구현 가이드(Guide)**: 1) 고정해야 할 필드/변환 규칙 정의. 2) 대표 케이스 입력/기대 출력 목록 작성. 3) 테스트 작성 위치(유닛) 결정.
- **검증 기준(Verification)**: solver 매핑/검증의 테스트 케이스 목록이 존재한다.
- **선행 조건(Dependencies)**: P7-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/utils/solverMapper.ts`, `src/utils/planningPayloadValidator.ts`

### P7-2.3 에러/타임아웃/재시도 UX 정책 정의

- **Task ID**: `10000000-0000-4000-8000-000000000118`
- **설명(Description)**: solver 호출 실패, 타임아웃, 상태 폴링 실패 시 사용자에게 보여줄 UX(메시지/재시도/중단)를 정의한다.
- **구현 가이드(Guide)**: 1) 실패 유형별 메시지 정의. 2) 재시도 버튼/자동 재시도 정책 결정. 3) 실패 시 데이터 보존/복구 정책 정의.
- **검증 기준(Verification)**: solver 실패 시 UX가 정의되어 있고, 재시도 정책이 명확하다.
- **선행 조건(Dependencies)**: P7-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/composables/useAISolver.ts`

### P7-3.1 스케줄 워크플로우 회귀 E2E 시나리오 정의(Step1→5)

- **Task ID**: `10000000-0000-4000-8000-000000000119`
- **설명(Description)**: 서비스 전환 작업 이후에도 Step1~5 핵심 플로우가 동작하는지 검증할 E2E 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) Step1 입력→Step2 저장→Step3 직원→Step4 초기→Step5 결과 확인 시나리오 기술. 2) 주요 검증 포인트 정의. 3) 최소 자동화 범위 결정.
- **검증 기준(Verification)**: 회귀 E2E 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P7-2.3
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P7-3.2 Playwright 회귀 테스트 구현 범위/전략 결정

- **Task ID**: `10000000-0000-4000-8000-000000000120`
- **설명(Description)**: Playwright를 사용해 어떤 시나리오를 자동화할지(스모크 1~2개) 범위를 결정한다.
- **구현 가이드(Guide)**: 1) 자동화할 최소 시나리오 선택. 2) 테스트 데이터 준비 전략 결정. 3) CI 포함 여부 결정.
- **검증 기준(Verification)**: 회귀 테스트 자동화 범위가 합의되어 있다.
- **선행 조건(Dependencies)**: P7-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `package.json`

### P7-3.3 유닛 테스트 보강 대상 선정(스토어/유틸/매퍼)

- **Task ID**: `10000000-0000-4000-8000-000000000121`
- **설명(Description)**: 회귀 위험이 큰 유닛(요구인원 계산, 엑셀 파서/검증, solver 매퍼)을 선정하고 테스트 보강 계획을 수립한다.
- **구현 가이드(Guide)**: 1) 테스트 우선순위 유틸 목록화. 2) 대표 입력/기대값 정의. 3) 테스트 파일 위치/실행 방식 결정.
- **검증 기준(Verification)**: 유닛 테스트 보강 계획과 대상 목록이 존재한다.
- **선행 조건(Dependencies)**: P7-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/utils/excelParser.ts`

### P7-3.4 회귀 테스트를 품질 게이트에 포함하는 기준 확정

- **Task ID**: `10000000-0000-4000-8000-000000000122`
- **설명(Description)**: 어떤 변경에서 E2E/회귀 테스트를 필수로 돌릴지 품질 게이트 기준을 확정한다.
- **구현 가이드(Guide)**: 1) 권한/RLS/가입/온보딩/스케줄 변경 시 회귀 필수 규칙 정의. 2) 실행 시간/빈도 균형 결정. 3) 문서에 기준 반영.
- **검증 기준(Verification)**: 회귀 테스트 실행 기준이 문서화되어 있다.
- **선행 조건(Dependencies)**: P7-3.2
- **예상 소요 시간**: 90분
- **관련 파일**: `scripts/quality-gate.sh`

---

---

## P8 (예상 시간: 32시간 0분)

### 요약 (Summary)

| Task ID                                | 태스크 명                                                            | 상태    | 선행 태스크(Dependencies) | 예상 시간 |
| -------------------------------------- | -------------------------------------------------------------------- | ------- | ------------------------- | --------- |
| `10000000-0000-4000-8000-000000000123` | **P8-1.1 알림 이벤트/채널/설정 요구사항 정리**                       | pending | P1-1.3<br>P1-1.4          | 120m      |
| `10000000-0000-4000-8000-000000000124` | **P8-1.2 알림 DB 스키마/마이그레이션 설계(notification\_\* 테이블)** | pending | P8-1.1                    | 180m      |
| `10000000-0000-4000-8000-000000000125` | **P8-1.3 알림 API 계약 정의(조회/읽음/설정)**                        | pending | P8-1.2                    | 180m      |
| `10000000-0000-4000-8000-000000000126` | **P8-1.4 알림 도메인 테스트 시나리오 정의(권한/격리/읽음)**          | pending | P8-1.3                    | 180m      |
| `10000000-0000-4000-8000-000000000127` | **P8-2.1 헤더 🔔 알림 UX 설계(뱃지/드롭다운/링크)**                  | pending | P8-1.4                    | 120m      |
| `10000000-0000-4000-8000-000000000128` | **P8-2.2 알림 센터 페이지 IA/필터/읽음 UX 설계**                     | pending | P8-2.1                    | 180m      |
| `10000000-0000-4000-8000-000000000129` | **P8-2.3 알림 설정 UI 설계(이벤트별 앱내/이메일)**                   | pending | P8-2.2                    | 120m      |
| `10000000-0000-4000-8000-000000000130` | **P8-2.4 알림센터 E2E 시나리오 정의(승인 알림)**                     | pending | P8-2.3                    | 180m      |
| `10000000-0000-4000-8000-000000000131` | **P8-3.1 Resend 이메일 발송 정책/템플릿 요구사항 확정**              | pending | P8-1.4                    | 120m      |
| `10000000-0000-4000-8000-000000000132` | **P8-3.2 notify-dispatch 설계(큐/재시도/멱등)**                      | pending | P8-3.1                    | 180m      |
| `10000000-0000-4000-8000-000000000133` | **P8-3.3 이메일 환경변수/시크릿/로컬 개발 전략 확정**                | pending | P8-3.2                    | 90m       |
| `10000000-0000-4000-8000-000000000134` | **P8-3.4 이메일 발송 테스트 시나리오 정의(실패/중복/설정)**          | pending | P8-3.3                    | 180m      |

### 상세 (Details)

### P8-1.1 알림 이벤트/채널/설정 요구사항 정리

- **Task ID**: `10000000-0000-4000-8000-000000000123`
- **설명(Description)**: 알림 채널(앱내/이메일), 이벤트 종류(승인/solver완료/공지), 사용자 설정 요구를 PRD 기준으로 정리한다.
- **구현 가이드(Guide)**: 1) 이벤트 타입 목록화. 2) 채널별 기본값(앱내 on, 이메일 off 등) 결정. 3) 설정 UI 위치(내 정보) 결정.
- **검증 기준(Verification)**: 알림 요구사항이 이벤트/채널/설정 관점으로 정리되어 있다.
- **선행 조건(Dependencies)**: P1-1.3, P1-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P8-1.2 알림 DB 스키마/마이그레이션 설계(notification\_\* 테이블)

- **Task ID**: `10000000-0000-4000-8000-000000000124`
- **설명(Description)**: notification_events, notification_preferences, notification_deliveries 등 알림 도메인 테이블의 스키마를 설계하고 마이그레이션 반영 계획을 수립한다.
- **구현 가이드(Guide)**: 1) events/preference/delivery 필드 정의. 2) 멱등키/재시도 고려 필드 포함. 3) 인덱스/조회 패턴 정의.
- **검증 기준(Verification)**: 알림 도메인 스키마가 확정되어 있고, 마이그레이션 반영 방안이 결정되어 있다.
- **선행 조건(Dependencies)**: P8-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `migrations/007_service_transition_rbac_multitenant.sql`

### P8-1.3 알림 API 계약 정의(조회/읽음/설정)

- **Task ID**: `10000000-0000-4000-8000-000000000125`
- **설명(Description)**: 알림 조회, 읽음 처리, 설정 변경을 위한 API 계약과 보안(RLS/테넌트)을 정의한다.
- **구현 가이드(Guide)**: 1) 목록 조회 필터/페이지네이션 정의. 2) 읽음 처리(단건/일괄) 계약 정의. 3) 설정 저장(이벤트별) 계약 정의.
- **검증 기준(Verification)**: 알림 API 계약이 문서화되어 있고, 테넌트/권한 기준이 포함된다.
- **선행 조건(Dependencies)**: P8-1.2
- **예상 소요 시간**: 180분
- **관련 파일**: `src/api/notification.ts`

### P8-1.4 알림 도메인 테스트 시나리오 정의(권한/격리/읽음)

- **Task ID**: `10000000-0000-4000-8000-000000000126`
- **설명(Description)**: 알림 도메인의 권한/테넌트 격리/읽음 처리 검증을 위한 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 본인 알림만 조회되는지 케이스 정의. 2) 타조직 알림 접근 차단 케이스 정의. 3) 읽음 처리 후 UI 반영 케이스 정의.
- **검증 기준(Verification)**: 알림 도메인 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P8-1.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P8-2.1 헤더 🔔 알림 UX 설계(뱃지/드롭다운/링크)

- **Task ID**: `10000000-0000-4000-8000-000000000127`
- **설명(Description)**: 상단 헤더에 알림 아이콘(뱃지)과 드롭다운/전체 페이지 링크 UX를 설계한다.
- **구현 가이드(Guide)**: 1) 미읽음 카운트 표시 규칙 정의. 2) 드롭다운에 표시할 항목 수/요약 정의. 3) 전체 알림 페이지 라우트 결정.
- **검증 기준(Verification)**: 알림 아이콘/뱃지 UX가 설계되어 있고, 구현 범위가 정리되어 있다.
- **선행 조건(Dependencies)**: P8-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `src/components/layout/Header.vue`

### P8-2.2 알림 센터 페이지 IA/필터/읽음 UX 설계

- **Task ID**: `10000000-0000-4000-8000-000000000128`
- **설명(Description)**: 알림 센터 페이지의 정보 구조, 필터(이벤트 타입), 읽음 처리 UX를 설계한다.
- **구현 가이드(Guide)**: 1) 리스트/상세 표시 방식 결정. 2) 필터/정렬/페이지네이션 UX 정의. 3) 읽음 처리(단건/일괄) UX 정의.
- **검증 기준(Verification)**: 알림 센터 화면 구성이 확정되어 있다.
- **선행 조건(Dependencies)**: P8-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/Notifications.vue`

### P8-2.3 알림 설정 UI 설계(이벤트별 앱내/이메일)

- **Task ID**: `10000000-0000-4000-8000-000000000129`
- **설명(Description)**: 사용자 알림 설정(이벤트별 앱내/이메일 수신)을 어디에, 어떤 UI로 제공할지 설계한다.
- **구현 가이드(Guide)**: 1) 설정 위치(내 정보 vs 알림센터) 결정. 2) 이벤트 타입별 토글 UI 정의. 3) 기본값/마이그레이션 정책 정의.
- **검증 기준(Verification)**: 알림 설정 UI가 정의되어 있고, 저장 모델과 연결된다.
- **선행 조건(Dependencies)**: P8-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/Profile.vue`

### P8-2.4 알림센터 E2E 시나리오 정의(승인 알림)

- **Task ID**: `10000000-0000-4000-8000-000000000130`
- **설명(Description)**: 가입 승인 알림이 생성되고 알림센터/헤더에서 확인되는 E2E 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 승인 이벤트 생성 조건 정의. 2) 헤더 뱃지/목록 노출 기대 결과 정의. 3) 읽음 처리 후 뱃지 감소 기대 결과 정의.
- **검증 기준(Verification)**: 알림센터 E2E 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P8-2.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P8-3.1 Resend 이메일 발송 정책/템플릿 요구사항 확정

- **Task ID**: `10000000-0000-4000-8000-000000000131`
- **설명(Description)**: 이메일 알림(승인/반려/공지/solver 완료)의 발송 정책과 템플릿 요구사항을 확정한다.
- **구현 가이드(Guide)**: 1) 이벤트별 이메일 제목/본문 요구 정의. 2) 발송 조건(즉시/예약) 정의. 3) 사용자가 이메일 수신을 껐을 때 처리 정의.
- **검증 기준(Verification)**: 이메일 발송 정책과 템플릿 요구사항이 확정되어 있다.
- **선행 조건(Dependencies)**: P8-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P8-3.2 notify-dispatch 설계(큐/재시도/멱등)

- **Task ID**: `10000000-0000-4000-8000-000000000132`
- **설명(Description)**: Resend 발송을 수행하는 notify-dispatch 서버 구성(Edge Function), 큐잉/재시도/멱등성 설계를 확정한다.
- **구현 가이드(Guide)**: 1) deliveries 테이블 기반 큐 처리 방식 정의. 2) 멱등키/중복 방지 규칙 정의. 3) 실패 재시도/백오프 규칙 정의.
- **검증 기준(Verification)**: notify-dispatch 아키텍처와 멱등/재시도 정책이 확정되어 있다.
- **선행 조건(Dependencies)**: P8-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `supabase/functions/notify-dispatch/index.ts`

### P8-3.3 이메일 환경변수/시크릿/로컬 개발 전략 확정

- **Task ID**: `10000000-0000-4000-8000-000000000133`
- **설명(Description)**: Resend API 키/발신자 주소 등 환경변수 관리와 로컬 개발(스텁/드라이런) 전략을 확정한다.
- **구현 가이드(Guide)**: 1) 필요한 env 목록 정의. 2) prod/staging/locaI 값 관리 정책 정의. 3) 로컬에서 실제 발송 방지 가드 정의.
- **검증 기준(Verification)**: 이메일 시크릿/환경 설정 정책이 정리되어 있다.
- **선행 조건(Dependencies)**: P8-3.2
- **예상 소요 시간**: 90분
- **관련 파일**: `.env.example`

### P8-3.4 이메일 발송 테스트 시나리오 정의(실패/중복/설정)

- **Task ID**: `10000000-0000-4000-8000-000000000134`
- **설명(Description)**: 이메일 발송의 실패 재시도, 중복 방지, 사용자 설정(off) 반영을 포함한 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 성공 발송 케이스 정의. 2) 실패/재시도/최종 실패 케이스 정의. 3) 중복 이벤트 시 1회만 발송 케이스 정의.
- **검증 기준(Verification)**: 이메일 발송 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P8-3.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

---

---

## P9 (예상 시간: 30시간 0분)

### 요약 (Summary)

| Task ID                                | 태스크 명                                                       | 상태    | 선행 태스크(Dependencies) | 예상 시간 |
| -------------------------------------- | --------------------------------------------------------------- | ------- | ------------------------- | --------- |
| `10000000-0000-4000-8000-000000000135` | **P9-1.1 대시보드 지표(공정성) 정의 + 필터 스펙 확정**          | pending | P1-1.3<br>P1-1.4          | 120m      |
| `10000000-0000-4000-8000-000000000136` | **P9-1.2 대시보드 데이터 모델/타입/스토어 설계**                | pending | P9-1.1                    | 180m      |
| `10000000-0000-4000-8000-000000000137` | **P9-1.3 대시보드 집계 쿼리/API 경계 결정(RPC/함수/직접)**      | pending | P9-1.2                    | 120m      |
| `10000000-0000-4000-8000-000000000138` | **P9-1.4 대시보드 지표 테스트 시나리오 정의(샘플 데이터 기반)** | pending | P9-1.3                    | 180m      |
| `10000000-0000-4000-8000-000000000139` | **P9-2.1 관리자 대시보드 페이지 IA/차트 구성 확정**             | pending | P9-1.4                    | 120m      |
| `10000000-0000-4000-8000-000000000140` | **P9-2.2 직원(개인) 대시보드 페이지 IA/캘린더 요구 확정**       | pending | P9-2.1                    | 180m      |
| `10000000-0000-4000-8000-000000000141` | **P9-2.3 대시보드 필터 UI/상태 저장 정책 정의**                 | pending | P9-2.2                    | 120m      |
| `10000000-0000-4000-8000-000000000142` | **P9-2.4 대시보드 필터 E2E 시나리오 정의**                      | pending | P9-2.3                    | 180m      |
| `10000000-0000-4000-8000-000000000143` | **P9-3.1 리포트/Export 요구사항 확정(Excel/CSV, 컬럼)**         | pending | P9-2.4                    | 120m      |
| `10000000-0000-4000-8000-000000000144` | **P9-3.2 Export API 설계(dashboard-export) + 권한/테넌트 검증** | pending | P9-3.1                    | 180m      |
| `10000000-0000-4000-8000-000000000145` | **P9-3.3 프론트 Export UI(다운로드/진행/에러) 설계**            | pending | P9-3.2                    | 120m      |
| `10000000-0000-4000-8000-000000000146` | **P9-3.4 Export 테스트 시나리오 정의(CSV/Excel, 대용량)**       | pending | P9-3.3                    | 180m      |

### 상세 (Details)

### P9-1.1 대시보드 지표(공정성) 정의 + 필터 스펙 확정

- **Task ID**: `10000000-0000-4000-8000-000000000135`
- **설명(Description)**: 관리자/직원 대시보드에서 제공할 지표(야간/주말 등)와 필터(기간/사이트/직급) 스펙을 확정한다. RBAC 요구사항: /dashboard/admin은 meta.roles: ['super', 'admin'], /dashboard/employee는 meta.roles: ['super', 'admin', 'user']로 설정한다. 로그인 후 역할에 따라 자동으로 적절한 대시보드로 분기해야 한다.
- **구현 가이드(Guide)**: 1. 타입 정의:
  - AdminDashboardData: 조직 전체 지표 (직원별/사이트별 공정성)
  - EmployeeDashboardData: 본인 일정/팀 통계

2. 스토어 구조: useAdminDashboard, useEmployeeDashboard 별도 정의
3. RBAC:
   - admin: 자신의 organization_id 필터링된 데이터만 스토어에 저장
   - user: 본인 employee_id 기반 데이터만 접근
   - super: 전체 조직 데이터 접근 가능
4. 상태 관리: 필터(기간/사이트/직급)별로 지표 재계산 로직
5. 캐싱: 대시보드 데이터는 5분 캐시, 필터 변경 시 재조회

- **검증 기준(Verification)**: 대시보드 지표/필터 요구사항이 확정되어 있다.
- **선행 조건(Dependencies)**: P1-1.3, P1-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P9-1.2 대시보드 데이터 모델/타입/스토어 설계

- **Task ID**: `10000000-0000-4000-8000-000000000136`
- **설명(Description)**: 대시보드 집계를 어디에서 계산할지(DB RPC/Edge Function/클라이언트) 경계를 결정하고 API 계약을 정의한다.
- **구현 가이드(Guide)**: 1. 집계 경계 결정: DB RPC 함수 사용 (Supabase rpc 호출)

2. API 설계:
   - get_admin_dashboard_stats(organization_id, filters) → RPC
   - get_employee_dashboard_stats(employee_id, filters) → RPC
3. RBAC:
   - RPC 함수 내에서 auth.uid() 기반 organization_id/employee_id 검증
   - admin: 자신의 조직 통계만 집계
   - user: 본인 통계만 집계
   - super: 파라미터로 organization_id 전달 시 전체 조직 집계
4. 성능 최적화: 필요한 집계만 DB에서 계산, 클라이언트는 시각화만 담당
5. API 계약: 요청/응답 스키마 TypeScript 인터페이스로 정의

- **검증 기준(Verification)**: 대시보드 타입/스토어 설계가 완료되어 있다.
- **선행 조건(Dependencies)**: P9-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/types/dashboard.ts`, `src/stores/dashboard.ts`

### P9-1.3 대시보드 집계 쿼리/API 경계 결정(RPC/함수/직접)

- **Task ID**: `10000000-0000-4000-8000-000000000137`
- **설명(Description)**: 샘플 스케줄 데이터를 기반으로 지표가 올바르게 계산되는지 검증하는 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 테스트 시나리오:

1. admin 대시보드:
   - 자신의 조직 지표만 표시 확인
   - 필터(기간/사이트/직급)별 지표 동적 변경 확인
   - 타 조직 데이터 혼입 방지 확인
2. user 대시보드:
   - 본인 일정/팀 통계만 표시 확인
   - 다른 직원 데이터 노출 방지 확인
3. 자동 라우팅:
   - admin 로그인 → /dashboard/admin 자동 이동 확인
   - user 로그인 → /dashboard/employee 자동 이동 확인
   - user가 /dashboard/admin 직접 접근 시 403 확인
4. 지표 정확성:
   - 샘플 스케줄 데이터로 지표 계산 검증
   - 공정성 지표(야간/주말 분산) 정확성 확인

- **검증 기준(Verification)**: 대시보드 집계 경계와 API 계약이 확정되어 있다.
- **선행 조건(Dependencies)**: P9-1.2
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/API_SPEC.md`

### P9-1.4 대시보드 지표 테스트 시나리오 정의(샘플 데이터 기반)

- **Task ID**: `10000000-0000-4000-8000-000000000138`
- **설명(Description)**: 샘플 스케줄 데이터를 기반으로 지표가 올바르게 계산되는지 검증하는 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 야간/주말 정의 기준 확정. 2) 샘플 입력/기대 결과 작성. 3) 테스트 자동화 범위(유닛/통합) 결정.
- **검증 기준(Verification)**: 대시보드 지표 검증 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P9-1.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P9-2.1 관리자 대시보드 페이지 IA/차트 구성 확정

- **Task ID**: `10000000-0000-4000-8000-000000000139`
- **설명(Description)**: 관리자 대시보드(공정성 지표)를 어떤 차트/표로 구성할지 IA를 확정한다.
- **구현 가이드(Guide)**: 1) 지표별 시각화 방식(막대그래프 등) 결정. 2) 필터 UI 배치 결정. 3) 빈 상태/로딩 상태 UX 정의.
- **검증 기준(Verification)**: 관리자 대시보드 화면 구성이 확정되어 있다.
- **선행 조건(Dependencies)**: P9-1.4
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/dashboard/AdminDashboard.vue`

### P9-2.2 직원(개인) 대시보드 페이지 IA/캘린더 요구 확정

- **Task ID**: `10000000-0000-4000-8000-000000000140`
- **설명(Description)**: 직원 대시보드(개인 일정 캘린더 + 통계) 화면 구성과 요구사항을 확정한다.
- **구현 가이드(Guide)**: 1) 캘린더 표시 단위(월/주) 결정. 2) 통계 항목(야간/주말 등) 확정. 3) 권한/데이터 범위(본인만) 확인.
- **검증 기준(Verification)**: 직원 대시보드 요구사항이 확정되어 있다.
- **선행 조건(Dependencies)**: P9-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/dashboard/MyDashboard.vue`

### P9-2.3 대시보드 필터 UI/상태 저장 정책 정의

- **Task ID**: `10000000-0000-4000-8000-000000000141`
- **설명(Description)**: 필터 변경 시 스토어 상태 저장, URL 쿼리 동기화 여부, 기본값/복원 정책을 정의한다.
- **구현 가이드(Guide)**: 1) 필터 기본값 결정. 2) URL sync 여부 결정. 3) 새로고침/재방문 시 복원 규칙 정의.
- **검증 기준(Verification)**: 필터 상태 저장/복원 정책이 확정되어 있다.
- **선행 조건(Dependencies)**: P9-2.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/stores/dashboard.ts`

### P9-2.4 대시보드 필터 E2E 시나리오 정의

- **Task ID**: `10000000-0000-4000-8000-000000000142`
- **설명(Description)**: 필터 변경에 따라 차트/표가 업데이트되는지 검증하는 E2E 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 기간/사이트 필터 케이스 정의. 2) 기대 결과(지표 변화) 정의. 3) 권한별 접근 차단 케이스 포함 여부 결정.
- **검증 기준(Verification)**: 대시보드 필터 E2E 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P9-2.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P9-3.1 리포트/Export 요구사항 확정(Excel/CSV, 컬럼)

- **Task ID**: `10000000-0000-4000-8000-000000000143`
- **설명(Description)**: 필터링된 대시보드 데이터를 기반으로 Excel/CSV로 내보낼 리포트 요구사항(포맷/컬럼)을 확정한다.
- **구현 가이드(Guide)**: 1) Export 대상 데이터/컬럼 확정. 2) 파일명/시트명 규칙 정의. 3) 개인정보/권한 필터링 규칙 정의.
- **검증 기준(Verification)**: 리포트 Export 요구사항이 확정되어 있다.
- **선행 조건(Dependencies)**: P9-2.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/REFINED_PRD.md`

### P9-3.2 Export API 설계(dashboard-export) + 권한/테넌트 검증

- **Task ID**: `10000000-0000-4000-8000-000000000144`
- **설명(Description)**: 리포트 내보내기 API(Edge Function 또는 서버 경계)를 설계하고 권한/테넌트 격리 검증 규칙을 포함한다.
- **구현 가이드(Guide)**: 1) 필터 파라미터 스키마 정의. 2) 권한/테넌트 검증 방안 포함. 3) 파일 생성 방식(서버 생성 vs 클라이언트) 결정.
- **검증 기준(Verification)**: Export API 계약과 보안 기준이 확정되어 있다.
- **선행 조건(Dependencies)**: P9-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `supabase/functions/dashboard-export/index.ts`, `docs/API_SPEC.md`

### P9-3.3 프론트 Export UI(다운로드/진행/에러) 설계

- **Task ID**: `10000000-0000-4000-8000-000000000145`
- **설명(Description)**: 사용자가 리포트를 다운로드할 수 있는 UI(진행 표시, 오류 처리)를 설계한다.
- **구현 가이드(Guide)**: 1) Export 버튼/필터 UI 정의. 2) 다운로드 진행/완료 메시지 정의. 3) 실패 시 재시도/오류 안내 정의.
- **검증 기준(Verification)**: Export UI 요구사항이 정의되어 있고, API와 연결된다.
- **선행 조건(Dependencies)**: P9-3.2
- **예상 소요 시간**: 120분
- **관련 파일**: `src/views/Reports.vue`

### P9-3.4 Export 테스트 시나리오 정의(CSV/Excel, 대용량)

- **Task ID**: `10000000-0000-4000-8000-000000000146`
- **설명(Description)**: Export 결과 파일의 내용/형식과 대용량(레코드 수) 처리에 대한 테스트 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) CSV/Excel 각각의 검증 포인트 정의. 2) 필터 적용 결과 검증. 3) 대용량 처리 시 타임아웃/분할 정책 케이스 정의.
- **검증 기준(Verification)**: Export 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P9-3.3
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

---

---

## P10 (예상 시간: 29시간 0분)

### 요약 (Summary)

| Task ID                                | 태스크 명                                                         | 상태    | 선행 태스크(Dependencies) | 예상 시간 |
| -------------------------------------- | ----------------------------------------------------------------- | ------- | ------------------------- | --------- |
| `10000000-0000-4000-8000-000000000147` | **P10-1.1 보안 감사 체크리스트 작성(RLS/권한/로그)**              | pending | P1-2.3<br>P9-3.4          | 120m      |
| `10000000-0000-4000-8000-000000000148` | **P10-1.2 Edge Function 보안 정책 정리(service role/검증/로그)**  | pending | P10-1.1                   | 180m      |
| `10000000-0000-4000-8000-000000000149` | **P10-1.3 침투/오용 시나리오 테스트 계획(테넌트 침범/권한 상승)** | pending | P10-1.2                   | 180m      |
| `10000000-0000-4000-8000-000000000150` | **P10-1.4 보안 이슈 트리아지/리메디에이션 태스크 생성 규칙 정의** | pending | P10-1.3                   | 120m      |
| `10000000-0000-4000-8000-000000000151` | **P10-2.1 성능 측정/기준선 수립 계획(목록/대시보드/리포트)**      | pending | P9-2.4                    | 90m       |
| `10000000-0000-4000-8000-000000000152` | **P10-2.2 DB/쿼리 최적화 후보 목록화(인덱스/집계)**               | pending | P10-2.1                   | 180m      |
| `10000000-0000-4000-8000-000000000153` | **P10-2.3 프론트 성능 최적화 후보 목록화(렌더/상태/차트)**        | pending | P10-2.1                   | 180m      |
| `10000000-0000-4000-8000-000000000154` | **P10-2.4 성능 회귀 체크(스모크) 시나리오 정의**                  | pending | P10-2.2<br>P10-2.3        | 120m      |
| `10000000-0000-4000-8000-000000000155` | **P10-3.1 릴리스 체크리스트 초안(배포 순서/게이트/스모크)**       | pending | P10-1.4<br>P10-2.4        | 120m      |
| `10000000-0000-4000-8000-000000000156` | **P10-3.2 운영 런북 작성(장애 대응/알림/데이터 복구)**            | pending | P10-3.1                   | 180m      |
| `10000000-0000-4000-8000-000000000157` | **P10-3.3 롤백 플랜 정의(DB/함수/프론트) + 리허설 시나리오**      | pending | P10-3.2                   | 180m      |
| `10000000-0000-4000-8000-000000000158` | **P10-3.4 Private Beta Go/No-Go 리뷰 아젠다/자료 정의**           | pending | P10-3.3                   | 90m       |

**총 예상 소요 시간:** 약 303.5시간

### 상세 (Details)

### P10-1.1 보안 감사 체크리스트 작성(RLS/권한/로그)

- **Task ID**: `10000000-0000-4000-8000-000000000147`
- **설명(Description)**: 서비스 전환 범위에 대한 보안 감사 체크리스트(RLS, RBAC, 입력 검증, 로그 마스킹)를 작성한다.
- **구현 가이드(Guide)**: 1) RLS/권한 상승/IDOR 체크 항목 작성. 2) Edge Function 입력 검증/시크릿 관리 항목 작성. 3) 감사로그/알림 이벤트 검증 항목 포함.
- **검증 기준(Verification)**: 보안 체크리스트가 문서화되어 있고, 릴리스 게이트에 포함될 수 있다.
- **선행 조건(Dependencies)**: P1-2.3, P9-3.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P10-1.2 Edge Function 보안 정책 정리(service role/검증/로그)

- **Task ID**: `10000000-0000-4000-8000-000000000148`
- **설명(Description)**: Edge Function(가입/승인/알림/Export)의 보안 정책(서비스키 사용, 입력 검증, 로그 마스킹)을 정리한다.
- **구현 가이드(Guide)**: 1) service role이 필요한 작업 목록화. 2) 입력 검증(Zod 등) 기준 정의. 3) 로그에 민감정보 기록 금지 규칙 정의.
- **검증 기준(Verification)**: Edge Function 보안 정책이 문서화되어 있고, 구현 시 준수할 기준이 명확하다.
- **선행 조건(Dependencies)**: P10-1.1
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/API_DOCUMENTATION.md`

### P10-1.3 침투/오용 시나리오 테스트 계획(테넌트 침범/권한 상승)

- **Task ID**: `10000000-0000-4000-8000-000000000149`
- **설명(Description)**: 타조직 데이터 접근, 권한 상승, 잘못된 ID 접근(IDOR) 등 침투/오용 시나리오 테스트 계획을 수립한다.
- **구현 가이드(Guide)**: 1) 시나리오별 공격 벡터 정의. 2) 기대 결과(403/empty) 정의. 3) 자동화 여부/도구 결정.
- **검증 기준(Verification)**: 보안 테스트 시나리오가 문서화되어 있다.
- **선행 조건(Dependencies)**: P10-1.2
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P10-1.4 보안 이슈 트리아지/리메디에이션 태스크 생성 규칙 정의

- **Task ID**: `10000000-0000-4000-8000-000000000150`
- **설명(Description)**: 발견된 보안 이슈를 어떻게 태스크로 분류/우선순위화/릴리스 차단으로 연결할지 규칙을 정의한다.
- **구현 가이드(Guide)**: 1) severity 기준 정의. 2) 릴리스 차단 조건 정의. 3) remediation 템플릿(재현/영향/해결/검증) 정의.
- **검증 기준(Verification)**: 보안 이슈가 일관된 방식으로 태스크화될 수 있는 규칙이 정의되어 있다.
- **선행 조건(Dependencies)**: P10-1.3
- **예상 소요 시간**: 120분
- **관련 파일**: `.shrimp-data/tasks.json`

### P10-2.1 성능 측정/기준선 수립 계획(목록/대시보드/리포트)

- **Task ID**: `10000000-0000-4000-8000-000000000151`
- **설명(Description)**: 핵심 화면(목록/그리드/대시보드/리포트)의 성능을 어떻게 측정하고 기준선을 잡을지 계획을 수립한다.
- **구현 가이드(Guide)**: 1) 측정 지표(TTFB, 렌더, 다운로드) 정의. 2) 목표 기준(예: p95) 초안 작성. 3) 측정 방법(수동/스크립트) 결정.
- **검증 기준(Verification)**: 성능 측정 계획과 기준선 정의가 존재한다.
- **선행 조건(Dependencies)**: P9-2.4
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P10-2.2 DB/쿼리 최적화 후보 목록화(인덱스/집계)

- **Task ID**: `10000000-0000-4000-8000-000000000152`
- **설명(Description)**: 대시보드/리포트/리스트 쿼리의 인덱스/집계 최적화 후보를 목록화하고 우선순위를 정한다.
- **구현 가이드(Guide)**: 1) 느린 쿼리 후보 식별 방법 정의. 2) 인덱스 후보/추가 비용 정리. 3) 집계 테이블/캐시 필요성 판단.
- **검증 기준(Verification)**: DB 최적화 후보와 우선순위가 정리되어 있다.
- **선행 조건(Dependencies)**: P10-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/prd/02-database-migration.md`

### P10-2.3 프론트 성능 최적화 후보 목록화(렌더/상태/차트)

- **Task ID**: `10000000-0000-4000-8000-000000000153`
- **설명(Description)**: 프론트에서 성능 저하가 예상되는 부분(대시보드 차트, 리스트 렌더, 상태 업데이트)을 목록화하고 개선 방향을 정한다.
- **구현 가이드(Guide)**: 1) 리렌더 원인 후보 목록화. 2) 메모이제이션/페이지네이션/가상스크롤 적용 기준 정의. 3) 차트 라이브러리 도입 여부 결정(필요 시).
- **검증 기준(Verification)**: 프론트 최적화 후보와 개선 전략이 정리되어 있다.
- **선행 조건(Dependencies)**: P10-2.1
- **예상 소요 시간**: 180분
- **관련 파일**: `src/views/Dashboard.vue`

### P10-2.4 성능 회귀 체크(스모크) 시나리오 정의

- **Task ID**: `10000000-0000-4000-8000-000000000154`
- **설명(Description)**: 성능 최적화 후 회귀가 발생하지 않도록 최소 스모크 측정 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) 측정 대상 화면 선택. 2) 반복 실행/기록 방식 정의. 3) 실패 기준/롤백 기준 정의.
- **검증 기준(Verification)**: 성능 회귀를 감지할 최소 스모크 시나리오가 정의되어 있다.
- **선행 조건(Dependencies)**: P10-2.2, P10-2.3
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/test-validation-guide.md`

### P10-3.1 릴리스 체크리스트 초안(배포 순서/게이트/스모크)

- **Task ID**: `10000000-0000-4000-8000-000000000155`
- **설명(Description)**: Private Beta 배포 순서(DB→함수→프론트), 품질 게이트, 스모크 테스트를 포함한 릴리스 체크리스트를 작성한다.
- **구현 가이드(Guide)**: 1) 배포 순서 체크리스트 작성. 2) 게이트 실행 항목 포함. 3) 스모크 테스트(가입→승인→온보딩→스케줄) 포함.
- **검증 기준(Verification)**: 릴리스 체크리스트가 문서화되어 있고, 실행 순서가 명확하다.
- **선행 조건(Dependencies)**: P10-1.4, P10-2.4
- **예상 소요 시간**: 120분
- **관련 파일**: `docs/verification/final-verification-report.md`

### P10-3.2 운영 런북 작성(장애 대응/알림/데이터 복구)

- **Task ID**: `10000000-0000-4000-8000-000000000156`
- **설명(Description)**: 운영 중 장애 대응, 알림 발송 문제, 데이터 복구/백업을 포함한 런북을 작성한다.
- **구현 가이드(Guide)**: 1) 장애 유형별 대응 플로우 작성. 2) 알림/이메일 장애시 확인 절차 작성. 3) 백업/복구 절차 및 권한 설정 포함.
- **검증 기준(Verification)**: 운영 런북이 작성되어 있고, 팀이 따라할 수 있다.
- **선행 조건(Dependencies)**: P10-3.1
- **예상 소요 시간**: 180분
- **관련 파일**: `README.md`

### P10-3.3 롤백 플랜 정의(DB/함수/프론트) + 리허설 시나리오

- **Task ID**: `10000000-0000-4000-8000-000000000157`
- **설명(Description)**: DB 마이그레이션, Edge Function, 프론트 배포 각각의 롤백 플랜과 리허설 시나리오를 정의한다.
- **구현 가이드(Guide)**: 1) DB 롤백 전략(역마이그레이션/스냅샷) 정의. 2) 함수/프론트 롤백(이전 버전) 정의. 3) 리허설 체크리스트 작성.
- **검증 기준(Verification)**: 롤백 절차가 문서화되어 있고, 리허설 시나리오가 존재한다.
- **선행 조건(Dependencies)**: P10-3.2
- **예상 소요 시간**: 180분
- **관련 파일**: `docs/migration/REFINED_PRD_SERVICE_TRANSITION.md`

### P10-3.4 Private Beta Go/No-Go 리뷰 아젠다/자료 정의

- **Task ID**: `10000000-0000-4000-8000-000000000158`
- **설명(Description)**: 릴리스 직전 Go/No-Go 리뷰를 위한 아젠다와 준비 자료(게이트 결과, 보안/성능 요약)를 정의한다.
- **구현 가이드(Guide)**: 1) 필수 보고 항목(기능/보안/성능/운영) 정의. 2) 참석자/결정권자 정의. 3) 결정 결과 기록 템플릿 정의.
- **검증 기준(Verification)**: Go/No-Go 리뷰 진행에 필요한 아젠다/자료 목록이 확정되어 있다.
- **선행 조건(Dependencies)**: P10-3.3
- **예상 소요 시간**: 90분
- **관련 파일**: `docs/verification/final-verification-report.md`

---

**총 예상 소요 시간:** 약 303.5시간

---

**총 예상 소요 시간:** 약 303.5시간
